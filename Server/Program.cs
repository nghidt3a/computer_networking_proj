using System;
using RemoteControlServer.Core;
using RemoteControlServer.Services;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using System.Runtime.InteropServices;



namespace RemoteControlServer
{
    /// <summary>
    /// Program entry point for the Remote Control Server application.
    /// It configures Windows DPI settings and starts the ServerCore.
    /// </summary>
    class Program
    {
        [DllImport("shcore.dll")]
        private static extern int SetProcessDpiAwareness(int processDpiAwareness);
        private const int PROCESS_PER_MONITOR_DPI_AWARE = 2;

        [STAThread] // Required for Windows UI components used by helpers (SendKeys/Forms)
        static void Main(string[] args)
        {
            try {
                Application.SetHighDpiMode(HighDpiMode.PerMonitorV2);
            } catch { }

            try {
                SetProcessDpiAwareness(PROCESS_PER_MONITOR_DPI_AWARE);
            } catch { }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            
            Console.OutputEncoding = Encoding.UTF8;
            Console.Title = "RCS Agent Core - Port 8181";

            // 1. Khởi chạy Server (WebSocket chạy ngầm, không chặn luồng chính)
            try
            {
                // Start the WebSocket server loop in ServerCore (runs in background threads).
                ServerCore.Start("ws://0.0.0.0:8181");
            }
            catch (Exception ex)
            {
                Console.WriteLine("❌ Lỗi khởi tạo Server: " + ex.Message);
                Console.WriteLine("Kiểm tra xem file ServerCore.cs đã đúng namespace chưa.");
                Console.ReadLine();
                return;
            }

            Console.WriteLine(">> Server đang chạy... Nhấn Ctrl+C để thoát.");

            // 3. Giữ ứng dụng luôn chạy (Message Loop)
            // Lệnh này giúp Keylogger hoạt động và Server không bị tắt
            Application.Run();
        }
    }
}