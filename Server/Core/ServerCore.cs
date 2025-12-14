using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Fleck;
using Newtonsoft.Json;

using RemoteControlServer.Models;
using RemoteControlServer.Helpers;
using RemoteControlServer.Services;

namespace RemoteControlServer.Core
{
    public class ServerCore
    {
        // ServerCore: Trung tâm xử lý phía Server
        // - Khởi tạo WebSocket Server
        // - Xử lý các lệnh từ Client (AUTH, FILE/PROCESS, STREAM...)
        // - Phát broadcast Stream và Log
        // All comments below in Vietnamese for clarity.
        // Gộp trách nhiệm mạng vào SocketManager
        // Lưu mật khẩu OTP tạm thời cho phiên (mỗi lần start sẽ random một mật khẩu)
        private static string _sessionPassword = "";

        // Lấy danh sách các ứng dụng đang chạy (có cửa sổ hiển thị)
        internal static object GetCurrentApps()
        {
            // Lấy danh sách các ứng dụng có cửa sổ (Window)
            return Process.GetProcesses()
                .Where(p => !string.IsNullOrEmpty(p.MainWindowTitle))
                .Select(p => new { id = p.Id, name = p.ProcessName, title = p.MainWindowTitle })
                .ToList();
        }

        // Lấy danh sách tất cả tiến trình hiện tại
        internal static object GetCurrentProcesses()
        {
            // Lấy danh sách toàn bộ tiến trình
            return Process.GetProcesses()
                .Select(p => new {
                    id = p.Id,
                    name = p.ProcessName,
                    memory = (p.WorkingSet64 / 1024 / 1024) + " MB"
                })
                .OrderByDescending(p => p.id)
                .ToList();
        }

        // 1. Thêm hàm lấy danh sách Shortcut trong Start Menu
        // Lấy danh sách shortcut (ứng dụng) trong Start Menu của Windows
        internal static object GetInstalledApps()
        {
            var apps = new List<object>();
            try
            {
                // Đường dẫn đến Start Menu chung của máy tính
                string commonStartMenu = Environment.GetFolderPath(Environment.SpecialFolder.CommonStartMenu) + "\\Programs";
                
                // Lấy tất cả file .lnk (shortcut)
                // SearchOption.AllDirectories: Quét cả thư mục con
                var files = Directory.GetFiles(commonStartMenu, "*.lnk", SearchOption.AllDirectories);

                foreach (var file in files)
                {
                    string fileName = Path.GetFileNameWithoutExtension(file);
                    
                    if (!fileName.ToLower().Contains("uninstall") && 
                        !fileName.ToLower().Contains("help") && 
                        !fileName.ToLower().Contains("readme"))
                    {
                        apps.Add(new { name = fileName, path = file });
                    }
                }
            }
            catch { } // Bỏ qua lỗi nếu không truy cập được thư mục
            return apps.OrderBy(x => ((dynamic)x).name).ToList();
        }

        // Bắt đầu khởi tạo WebSocket Server, đăng ký sự kiện và thread stream
        public static void Start(string url)
        {
            SystemHelper.InitCounters();
            _sessionPassword = new Random().Next(100000, 999999).ToString();

            // In ra Console thật nổi bật
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("=================================================");
            Console.WriteLine($"   REMOTE CONTROL SERVER IS RUNNING");
            Console.WriteLine($"   URL: {url}");
            Console.WriteLine($"   >> YOUR OTP PASSWORD: {_sessionPassword} <<");
            Console.WriteLine("=================================================");
            Console.ResetColor();

            var server = new WebSocketServer(url);
            server.Start(socket =>
            {
                socket.OnOpen = () =>
                {
                    Console.WriteLine(">> Client kết nối!");
                    SocketManager.Add(socket);
                };
                socket.OnClose = () =>
                {
                    Console.WriteLine(">> Client ngắt kết nối!");
                    SocketManager.Remove(socket);
                    if (SocketManager.All.Count == 0) StreamManager.StopStreaming();
                };
                socket.OnMessage = message => HandleClientCommand(socket, message);
            });

            Console.WriteLine($">> Server đang chạy tại {url}");

            // 1. Xử lý Stream ảnh\
            WebcamManager.OnFrameCaptured += (imgBytes) => {
                SocketManager.BroadcastBinary(0x02, imgBytes);
            };

            // 2. Xử lý Gửi File Video
            WebcamManager.OnVideoSaved += (filePath) => {
                Task.Run(() => {
                    try 
                    {
                        if (File.Exists(filePath))
                        {
                            Console.WriteLine(">> Đang gửi file video về Client...");
                            
                            // Đọc toàn bộ file vào RAM (như MemoryStream)
                            byte[] fileBytes = File.ReadAllBytes(filePath);
                            string base64File = Convert.ToBase64String(fileBytes);
                            
                            // Gửi gói tin đặc biệt chứa dữ liệu file
                            SocketManager.BroadcastJson("VIDEO_FILE", base64File);
                            SocketManager.BroadcastJson("LOG", $"Đã gửi file video ({fileBytes.Length / 1024} KB) về máy bạn!");

                            // Xóa file tạm sau khi gửi xong (Dọn dẹp chiến trường)
                            File.Delete(filePath);
                        }
                    }
                    catch (Exception ex)
                    {
                        SocketManager.BroadcastJson("LOG", "Lỗi gửi file: " + ex.Message);
                    }
                });
            };

            // Khởi chạy vòng lặp gửi Stream ở lớp StreamManager
            StreamManager.StartScreenLoop();
        }

        #region Command Handlers (Hàm xử lý các lệnh từ client)

        // Xử lý xác thực (AUTH)
        private static void HandleAuth(IWebSocketConnection socket, WebPacket packet)
        {
            if (packet.payload == _sessionPassword)
            {
                SocketManager.SendJson(socket, "AUTH_RESULT", "OK");
                Console.WriteLine("-> Client đăng nhập thành công!");
            }
            else
            {
                SocketManager.SendJson(socket, "AUTH_RESULT", "FAIL");
                Console.WriteLine("-> Client sai mật khẩu!");
            }
        }

        // Các hàm xử lý khác (đổi tên, xóa, upload) đã được tách sang CommandHandler.cs

        #endregion

        // Xử lý mọi gói lệnh từ client (AUTH, COMMANDS...)
        private static void HandleClientCommand(IWebSocketConnection socket, string jsonMessage)
        {
            try
            {
                var packet = JsonConvert.DeserializeObject<WebPacket>(jsonMessage);

                // 1. Auth
                if (packet?.type == "AUTH")
                {
                    HandleAuth(socket, packet);
                    return;
                }

                // 2. Delegate bất kỳ command nào cho CommandRouter
                if (!string.IsNullOrEmpty(packet?.command))
                {
                    CommandRouter.ProcessCommand(socket, packet);
                }
            }
            catch (Exception ex) { Console.WriteLine("Lỗi Handle: " + ex.Message); }
        }
    }
}