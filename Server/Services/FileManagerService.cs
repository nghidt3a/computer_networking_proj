using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace RemoteControlServer.Services
{
    public static class FileManagerService
    {
        /// <summary>
        /// File item DTO returned to clients. Keep property names stable for JSON compatibility.
        /// </summary>
        public class FileItem
        {
            public string Name { get; set; }
            public string Path { get; set; }
            public string Type { get; set; } // "DRIVE", "FOLDER", "FILE"
            public string Size { get; set; }
        }

        /// <summary>Returns the list of system drives.</summary>
        public static List<FileItem> GetDrives()
        {
            var list = new List<FileItem>();
            foreach (var drive in DriveInfo.GetDrives())
            {
                if (drive.IsReady)
                {
                    list.Add(new FileItem {
                        Name = $"{drive.Name} ({drive.VolumeLabel})",
                        Path = drive.Name,
                        Type = "DRIVE",
                        Size = FormatSize(drive.TotalSize)
                    });
                }
            }
            return list;
        }

        // 2. Lấy nội dung trong thư mục
        /// <summary>Gets the directory listing (folders & files) for a specified path; returns an error object on exception.</summary>
        public static object GetDirectoryContent(string path)
        {
            var list = new List<FileItem>();
            try
            {
                // Thêm nút ".." để quay lại (nếu không phải gốc ổ đĩa)
                DirectoryInfo di = new DirectoryInfo(path);
                if (di.Parent != null)
                {
                    list.Add(new FileItem { Name = "... (Back)", Path = di.Parent.FullName, Type = "BACK" });
                }

                // Lấy thư mục con
                foreach (var dir in Directory.GetDirectories(path))
                {
                    list.Add(new FileItem {
                        Name = Path.GetFileName(dir),
                        Path = dir,
                        Type = "FOLDER"
                    });
                }

                // Lấy file
                foreach (var file in Directory.GetFiles(path))
                {
                    FileInfo fi = new FileInfo(file);
                    list.Add(new FileItem {
                        Name = Path.GetFileName(file),
                        Path = file,
                        Type = "FILE",
                        Size = FormatSize(fi.Length)
                    });
                }
            }
            catch (Exception ex)
            {
                return new { error = "Lỗi truy cập: " + ex.Message };
            }
            return list;
        }

        // 3. Đọc file để tải về (Chuyển sang Base64)
        /// <summary>Get file content as Base64. Returns "ERROR_SIZE_LIMIT" if file too large.</summary>
        public static string GetFileContentBase64(string path)
        {
            try
            {
                if (!File.Exists(path)) return null;
                // Giới hạn dung lượng tải để tránh treo Server (Ví dụ: < 50MB)
                FileInfo fi = new FileInfo(path);
                if (fi.Length > 50 * 1024 * 1024) return "ERROR_SIZE_LIMIT";

                byte[] bytes = File.ReadAllBytes(path);
                return Convert.ToBase64String(bytes);
            }
            catch { return null; }
        }

        // 4. Xóa file
        /// <summary>Delete a file from filesystem and return 'OK' on success or an error message.</summary>
        public static string DeleteFile(string path)
        {
            try
            {
                if (File.Exists(path))
                {
                    File.Delete(path);
                    return "OK";
                }
                return "File không tồn tại!";
            }
            catch (Exception ex) { return "Lỗi: " + ex.Message; }
        }

        // Helper: Format dung lượng cho đẹp
        /// <summary>Format byte length into human readable string, e.g., "1.23 MB".</summary>
        private static string FormatSize(long bytes)
        {
            string[] sizes = { "B", "KB", "MB", "GB", "TB" };
            double len = bytes;
            int order = 0;
            while (len >= 1024 && order < sizes.Length - 1)
            {
                order++;
                len = len / 1024;
            }
            return $"{len:0.##} {sizes[order]}";
        }

        // 5. Lưu file từ Base64 (Upload)
        /// <summary>Save a file from provided Base64 data into a target folder.</summary>
        public static string SaveFileFromBase64(string folderPath, string fileName, string base64Data)
        {
            try
            {
                // Kiểm tra đường dẫn
                if (!Directory.Exists(folderPath)) return "Thư mục không tồn tại!";

                string fullPath = Path.Combine(folderPath, fileName);

                // Chuyển Base64 -> Byte array
                byte[] bytes = Convert.FromBase64String(base64Data);

                // Ghi xuống ổ cứng
                File.WriteAllBytes(fullPath, bytes);

                return "OK";
            }
            catch (Exception ex)
            {
                return "Lỗi Upload: " + ex.Message;
            }
        }

        // [THÊM MỚI] 6. Tạo thư mục mới
        /// <summary>Create a new directory under a parent path, returning 'OK' or an error message.</summary>
        public static string CreateDirectory(string parentPath, string folderName)
        {
            try
            {
                if (!Directory.Exists(parentPath)) return "Thư mục cha không tồn tại!";
                
                string fullPath = Path.Combine(parentPath, folderName);
                
                if (Directory.Exists(fullPath)) return "Thư mục này đã tồn tại!";
                
                Directory.CreateDirectory(fullPath);
                return "OK";
            }
            catch (Exception ex)
            {
                return "Lỗi tạo folder: " + ex.Message;
            }
        }

        // 7. Xóa thư mục (bao gồm cả nội dung)
        /// <summary>Delete a directory and its contents; returns 'OK' on success.</summary>
        public static string DeleteDirectory(string path)
        {
            try
            {
                if (Directory.Exists(path))
                {
                    Directory.Delete(path, true); // xóa đệ quy
                    return "OK";
                }
                return "Thư mục không tồn tại!";
            }
            catch (Exception ex)
            {
                return "Lỗi xóa thư mục: " + ex.Message;
            }
        }

        // 8. Đổi tên file
        /// <summary>Rename a file. Returns 'OK' or an error message.</summary>
        public static string RenameFile(string filePath, string newName)
        {
            try
            {
                if (!File.Exists(filePath)) return "File không tồn tại!";

                string dir = Path.GetDirectoryName(filePath);
                if (string.IsNullOrEmpty(dir)) dir = ".";

                string targetPath = Path.Combine(dir, newName);
                if (File.Exists(targetPath)) return "Tên file mới đã tồn tại!";

                File.Move(filePath, targetPath);
                return "OK";
            }
            catch (Exception ex)
            {
                return "Lỗi đổi tên file: " + ex.Message;
            }
        }

        // 9. Đổi tên thư mục
        /// <summary>Rename a directory. Returns 'OK' or an error message.</summary>
        public static string RenameDirectory(string dirPath, string newName)
        {
            try
            {
                if (!Directory.Exists(dirPath)) return "Thư mục không tồn tại!";

                string parent = Path.GetDirectoryName(dirPath.TrimEnd(Path.DirectorySeparatorChar));
                if (string.IsNullOrEmpty(parent)) parent = Path.GetPathRoot(dirPath);

                string targetPath = Path.Combine(parent, newName);
                if (Directory.Exists(targetPath)) return "Thư mục mới đã tồn tại!";

                Directory.Move(dirPath, targetPath);
                return "OK";
            }
            catch (Exception ex)
            {
                return "Lỗi đổi tên thư mục: " + ex.Message;
            }
        }
    }
}

