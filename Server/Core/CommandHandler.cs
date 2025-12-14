using System;
using Fleck;
using Newtonsoft.Json;
using RemoteControlServer.Models;
using RemoteControlServer.Helpers;
using RemoteControlServer.Services;

namespace RemoteControlServer.Core
{
    // Lớp tách biệt để xử lý các lệnh (command) từ Client
    public static class CommandHandler
    {
        public static void RenameFile(IWebSocketConnection socket, string param)
        {
            try
            {
                dynamic info = JsonConvert.DeserializeObject(param);
                string filePath = info.path;
                string newName = info.newName;

                string renameRes = FileManagerService.RenameFile(filePath, newName);
                if (renameRes == "OK") SocketManager.SendJson(socket, "LOG", "Đã đổi tên file thành công!");
                else SocketManager.SendJson(socket, "LOG", renameRes);

                string parent = System.IO.Path.GetDirectoryName(filePath);
                if (string.IsNullOrEmpty(parent)) SocketManager.SendJson(socket, "FILE_LIST", FileManagerService.GetDrives());
                else SocketManager.SendJson(socket, "FILE_LIST", FileManagerService.GetDirectoryContent(parent));
            }
            catch (Exception ex)
            {
                SocketManager.SendJson(socket, "LOG", "Lỗi đổi tên file: " + ex.Message);
            }
        }

        public static void RenameFolder(IWebSocketConnection socket, string param)
        {
            try
            {
                dynamic info = JsonConvert.DeserializeObject(param);
                string dirPath = info.path;
                string newName = info.newName;

                string renameRes = FileManagerService.RenameDirectory(dirPath, newName);
                if (renameRes == "OK") SocketManager.SendJson(socket, "LOG", "Đã đổi tên thư mục thành công!");
                else SocketManager.SendJson(socket, "LOG", renameRes);

                string parent = System.IO.Path.GetDirectoryName(dirPath.TrimEnd(System.IO.Path.DirectorySeparatorChar));
                if (string.IsNullOrEmpty(parent)) SocketManager.SendJson(socket, "FILE_LIST", FileManagerService.GetDrives());
                else SocketManager.SendJson(socket, "FILE_LIST", FileManagerService.GetDirectoryContent(parent));
            }
            catch (Exception ex)
            {
                SocketManager.SendJson(socket, "LOG", "Lỗi đổi tên thư mục: " + ex.Message);
            }
        }

        public static void DeleteFolder(IWebSocketConnection socket, string folderPath)
        {
            try
            {
                string delRes = FileManagerService.DeleteDirectory(folderPath);
                if (delRes == "OK") SocketManager.SendJson(socket, "LOG", "Đã xóa thư mục thành công!");
                else SocketManager.SendJson(socket, "LOG", delRes);

                string parent = System.IO.Path.GetDirectoryName(folderPath);
                if (string.IsNullOrEmpty(parent)) SocketManager.SendJson(socket, "FILE_LIST", FileManagerService.GetDrives());
                else SocketManager.SendJson(socket, "FILE_LIST", FileManagerService.GetDirectoryContent(parent));
            }
            catch (Exception ex)
            {
                SocketManager.SendJson(socket, "LOG", "Lỗi xóa folder: " + ex.Message);
            }
        }

        public static void DeleteFile(IWebSocketConnection socket, string filePath)
        {
            try
            {
                string deleteResult = FileManagerService.DeleteFile(filePath);
                if (deleteResult == "OK") SocketManager.SendJson(socket, "LOG", "Đã xóa file thành công!");
                else SocketManager.SendJson(socket, "LOG", deleteResult);
            }
            catch (Exception ex)
            {
                SocketManager.SendJson(socket, "LOG", "Lỗi xóa file: " + ex.Message);
            }
        }

        public static void UploadFile(IWebSocketConnection socket, string param)
        {
            try
            {
                dynamic uploadInfo = JsonConvert.DeserializeObject(param);
                string targetFolder = uploadInfo.path;
                string fileName = uploadInfo.fileName;
                string base64Data = uploadInfo.data;

                Console.WriteLine($">> Đang nhận file upload: {fileName}...");
                string resultUpLoad = FileManagerService.SaveFileFromBase64(targetFolder, fileName, base64Data);

                if (resultUpLoad == "OK")
                {
                    SocketManager.SendJson(socket, "LOG", $"Upload thành công: {fileName}");
                    SocketManager.SendJson(socket, "FILE_LIST", FileManagerService.GetDirectoryContent(targetFolder));
                }
                else
                {
                    SocketManager.SendJson(socket, "LOG", resultUpLoad);
                }
            }
            catch (Exception ex)
            {
                SocketManager.SendJson(socket, "LOG", "Lỗi xử lý Upload: " + ex.Message);
            }
        }
    }
}
