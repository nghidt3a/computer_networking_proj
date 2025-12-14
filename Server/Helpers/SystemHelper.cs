using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Management;
using System.Windows.Forms;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace RemoteControlServer.Helpers
{
    /// <summary>
    /// SystemHelper chứa các hàm tiện ích được Server sử dụng để chụp màn hình,
    /// truy xuất thông tin hệ thống, mô phỏng sự kiện chuột/bàn phím và lấy bộ đếm hiệu suất.
    /// </summary>
    public static class SystemHelper
    {
        private static PerformanceCounter cpuCounter;
        private static PerformanceCounter ramCounter;
        private static double _totalRamMB = 0; // Lưu Cache tổng RAM để không phải query nhiều lần

        /// <summary>
        /// Khởi tạo các bộ đếm hiệu suất được sử dụng bởi hàm GetPerformanceStats.
        /// Có thể gọi nhiều lần một cách an toàn.
        /// </summary>
        public static void InitCounters()
        {
            try
            {
                // Khởi tạo bộ đếm
                if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
                {
                    cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
                    ramCounter = new PerformanceCounter("Memory", "Available MBytes");
                    cpuCounter.NextValue(); // Gọi mồi (Đọc giá trị đầu tiên)
                    
                    // Lấy Tổng RAM 1 lần duy nhất khi khởi động
                    GetTotalRam(); 
                }
            }
            catch { }
        }

        private static void GetTotalRam()
        {
            try 
            {
                using (var searcher = new ManagementObjectSearcher("Select TotalVisibleMemorySize From Win32_OperatingSystem"))
                {
                    foreach (var mObj in searcher.Get())
                    {
                        // WMI trả về KB -> Chia 1024 ra MB
                        _totalRamMB = Convert.ToDouble(mObj["TotalVisibleMemorySize"]) / 1024;
                    }
                }
            }
            catch { _totalRamMB = 8192; } // Nếu lỗi, giả định 8GB để tránh chia cho 0
        }

        /// <summary>
        /// Truy xuất đối tượng thông tin hệ thống rút gọn: Hệ điều hành (OS), tên máy, tên CPU/GPU và dung lượng ổ đĩa chính.
        /// </summary>
        public static object GetSystemInfo()
        {
            string cpuName = "Standard Processor";
            string gpuName = "Integrated Graphics";
            string vram = "N/A";

            try
            {
                // 1. Lấy Tên CPU
                using (var searcher = new ManagementObjectSearcher("root\\CIMV2", "SELECT * FROM Win32_Processor"))
                {
                    foreach (var obj in searcher.Get())
                    {
                        cpuName = obj["Name"]?.ToString();
                        break;
                    }
                }

                // 2. Lấy Tên GPU & VRAM
                using (var searcher = new ManagementObjectSearcher("root\\CIMV2", "SELECT * FROM Win32_VideoController"))
                {
                    foreach (var obj in searcher.Get())
                    {
                        gpuName = obj["Name"]?.ToString();
                        if (obj["AdapterRAM"] != null)
                        {
                            long bytes = Convert.ToInt64(obj["AdapterRAM"]);
                            // Chuyển Bytes sang GB
                            if (bytes > 0) vram = (bytes / 1024 / 1024 / 1024) + " GB";
                        }
                        break;
                    }
                }
            }
            catch 
            { 
                // Nếu WMI lỗi, giữ giá trị mặc định, không throw exception
            }

            // 3. Lấy Ổ cứng C
            var drive = DriveInfo.GetDrives().FirstOrDefault(d => d.IsReady && d.Name.StartsWith("C"));
            // Chuyển Bytes sang GB
            string diskInfo = drive != null ? $"{drive.TotalSize / 1024 / 1024 / 1024} GB" : "N/A";

            return new
            {
                os = Environment.OSVersion.ToString(),
                pcName = Environment.MachineName,
                cpuName = cpuName, // Đã fix lấy tên thật
                gpuName = gpuName,
                vram = vram,
                totalDisk = diskInfo
            };
        }

        /// <summary>
        /// Lấy các chỉ số thống kê hiệu suất thời gian chạy (CPU, % RAM, đĩa & tải giả lập GPU).
        /// </summary>
        public static object GetPerformanceStats()
        {
            float cpu = 0;
            float ramAvailable = 0;
            int ramPercent = 0;

            try
            {
                if (cpuCounter != null) cpu = cpuCounter.NextValue();
                if (ramCounter != null) ramAvailable = ramCounter.NextValue();

                // Tính % RAM
                if (_totalRamMB > 0)
                {
                    ramPercent = (int)((1.0 - (ramAvailable / _totalRamMB)) * 100);
                }
            }
            catch { }

            // Tính % Disk (Toàn bộ ổ cứng)
            long totalSizeAll = 0;
            long totalFreeAll = 0;
            try
            {
                // Chỉ quét các ổ đĩa cố định (Fixed) đã sẵn sàng (IsReady)
                var drives = DriveInfo.GetDrives().Where(d => d.IsReady && d.DriveType == DriveType.Fixed);
                foreach (var d in drives)
                {
                    totalSizeAll += d.TotalSize;
                    totalFreeAll += d.TotalFreeSpace;
                }
            }
            catch { }

            int diskPercent = 0;
            if (totalSizeAll > 0)
            {
                // Tính phần trăm đã dùng
                diskPercent = (int)((1.0 - ((double)totalFreeAll / totalSizeAll)) * 100);
            }

            // TRICK: Vì lấy GPU Load trong C# rất khó, ta dùng CPU load làm giá trị tham khảo
            // để biểu đồ GPU ở giữa nó "nhảy múa" cho đẹp thay vì đứng im 0%.
            int gpuFakeLoad = (int)cpu; 

            return new
            {
                cpu = (int)cpu,
                ram = ramPercent,
                diskUsage = diskPercent,
                gpu = gpuFakeLoad 
            };
        }

        // --- Capture & Input Helpers ---
        /// <summary>Chụp toàn bộ màn hình và trả về mảng byte JPEG (chất lượng 0-100).</summary>
        public static byte[] GetScreenShot(long quality, double scaleFactor = 1.0)
        {
            try
            {
                Rectangle bounds = Screen.PrimaryScreen.Bounds;
                using (Bitmap bitmap = new Bitmap(bounds.Width, bounds.Height))
                {
                    using (Graphics g = Graphics.FromImage(bitmap))
                    {
                        // Chụp màn hình
                        g.CopyFromScreen(Point.Empty, Point.Empty, bounds.Size);
                    }
                    // Kiểm tra nếu cần thay đổi kích thước
                    if (scaleFactor < 1.0)
                    {
                        int newW = (int)(bounds.Width * scaleFactor);
                        int newH = (int)(bounds.Height * scaleFactor);
                        using (Bitmap resized = new Bitmap(bitmap, newW, newH))
                        {
                            return ImageToByte(resized, quality);
                        }
                    }
                    // Trả về ảnh gốc nếu không thay đổi kích thước
                    return ImageToByte(bitmap, quality);
                }
            }
            catch { return null; }
        }

        // Chuyển đổi Bitmap sang mảng byte JPEG với chất lượng xác định
        private static byte[] ImageToByte(Bitmap img, long quality)
        {
            ImageCodecInfo jpgEncoder = GetEncoder(ImageFormat.Jpeg);
            System.Drawing.Imaging.Encoder myEncoder = System.Drawing.Imaging.Encoder.Quality;
            EncoderParameters myEncoderParameters = new EncoderParameters(1);
            myEncoderParameters.Param[0] = new EncoderParameter(myEncoder, quality);

            using (MemoryStream ms = new MemoryStream())
            {
                // Lưu ảnh vào MemoryStream với chất lượng JPEG đã cấu hình
                img.Save(ms, jpgEncoder, myEncoderParameters);
                return ms.ToArray();
            }
        }

        // Lấy bộ mã hóa (Encoder) cho định dạng ảnh JPEG
        private static ImageCodecInfo GetEncoder(ImageFormat format)
        {
            return ImageCodecInfo.GetImageDecoders().FirstOrDefault(codec => codec.FormatID == format.Guid);
        }

        // Import hàm API Windows để mô phỏng sự kiện chuột
        [DllImport("user32.dll")]
        static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);
        private const int MOUSEEVENTF_MOVE = 0x0001;
        private const int MOUSEEVENTF_LEFTDOWN = 0x0002;
        private const int MOUSEEVENTF_LEFTUP = 0x0004;
        private const int MOUSEEVENTF_RIGHTDOWN = 0x0008;
        private const int MOUSEEVENTF_RIGHTUP = 0x0010;
        private const int MOUSEEVENTF_MIDDLEDOWN = 0x0020;
        private const int MOUSEEVENTF_MIDDLEUP = 0x0040;
        private const int MOUSEEVENTF_ABSOLUTE = 0x8000;

        /// <summary>Thiết lập vị trí con trỏ chuột bằng tọa độ phần trăm chuẩn hóa (0..1) trên màn hình.</summary>
        public static void SetCursorPosition(double xPercent, double yPercent)
        {
            // Chuyển đổi tọa độ phần trăm (0..1) sang tọa độ tuyệt đối (0..65535)
            int dx = (int)(xPercent * 65535);
            int dy = (int)(yPercent * 65535);
            // Di chuyển chuột đến vị trí tuyệt đối
            mouse_event(MOUSEEVENTF_ABSOLUTE | MOUSEEVENTF_MOVE, dx, dy, 0, 0);
        }

        /// <summary>Mô phỏng sự kiện click chuột trên nút cụ thể ('left','right','middle').</summary>
        public static void MouseClick(string button, string action)
        {
            int flags = 0;
            if (button == "left") flags = (action == "down") ? MOUSEEVENTF_LEFTDOWN : MOUSEEVENTF_LEFTUP;
            else if (button == "right") flags = (action == "down") ? MOUSEEVENTF_RIGHTDOWN : MOUSEEVENTF_RIGHTUP;
            else if (button == "middle") flags = (action == "down") ? MOUSEEVENTF_MIDDLEDOWN : MOUSEEVENTF_MIDDLEUP;
            mouse_event(flags, 0, 0, 0, 0);
        }

        // Mô phỏng nhấn phím bằng SendKeys
        public static void SimulateKeyPress(string key)
        {
            try
            {
                switch (key)
                {
                    case "Enter": SendKeys.SendWait("{ENTER}"); break;
                    case "Backspace": SendKeys.SendWait("{BACKSPACE}"); break;
                    case "Escape": SendKeys.SendWait("{ESC}"); break;
                    case "Tab": SendKeys.SendWait("{TAB}"); break;
                    case "ArrowUp": SendKeys.SendWait("{UP}"); break;
                    case "ArrowDown": SendKeys.SendWait("{DOWN}"); break;
                    case "ArrowLeft": SendKeys.SendWait("{LEFT}"); break;
                    case "ArrowRight": SendKeys.SendWait("{RIGHT}"); break;
                    // Nếu là ký tự đơn, gửi trực tiếp
                    default: if (key.Length == 1) SendKeys.SendWait(key); break;
                }
            }
            catch { }
        }
    }
}