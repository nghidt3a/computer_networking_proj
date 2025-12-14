# File Manager - Advanced Features

## Tính Năng Được Thêm Vào

Các tính năng nâng cao của File Manager từ `RemoteComputerProject` đã được tích hợp vào `computer_networking_proj`:

### 1. **Rename File** ✅
- **Vị trí**: Client: `Client/js/features/fileManager.js` - Method `renameFile()`
- **Giao diện**: Nút "Rename" (biểu tượng bút) ở mỗi file
- **Cách sử dụng**: Click vào nút rename, nhập tên mới, hệ thống sẽ gửi lệnh `RENAME_FILE` tới server
- **Server**: CommandHandler.RenameFile() xử lý yêu cầu

### 2. **Rename Folder** ✅
- **Vị trí**: Client: `Client/js/features/fileManager.js` - Method `renameFolder()`
- **Giao diện**: Nút "Rename" (biểu tượng bút) ở mỗi folder
- **Cách sử dụng**: Click vào nút rename của folder, nhập tên mới, gửi lệnh `RENAME_FOLDER`
- **Server**: CommandHandler.RenameFolder() xử lý yêu cầu

### 3. **Delete Folder** ✅
- **Vị trí**: Client: `Client/js/features/fileManager.js` - Method `deleteFolder()`
- **Giao diện**: Nút "Delete" (biểu tượng thùng rác) ở mỗi folder
- **Cách sử dụng**: Click vào nút delete của folder, xác nhận, gửi lệnh `DELETE_FOLDER`
- **Server**: CommandHandler.DeleteFolder() xử lý yêu cầu - xóa folder và tất cả nội dung

### 4. **Upload File** ✅
- **Vị trí**: Client: `Client/js/features/fileManager.js` - Method `uploadFile()`
- **Giao diện**: Nút "Upload" trên toolbar File Manager
- **Cách sử dụng**: 
  - Click nút "Upload"
  - Chọn file từ máy tính
  - File sẽ được chuyển đổi thành base64 và gửi lên server
  - Gửi lệnh `UPLOAD_FILE` với payload: `{ path, fileName, data(base64) }`
- **Server**: CommandHandler.UploadFile() nhận file và lưu vào thư mục đích

## Cấu Trúc Giao Tiếp

### Client → Server
```javascript
// Rename File
SocketService.send("RENAME_FILE", JSON.stringify({
    path: filePath,
    newName: newName
}));

// Rename Folder
SocketService.send("RENAME_FOLDER", JSON.stringify({
    path: folderPath,
    newName: newName
}));

// Delete Folder
SocketService.send("DELETE_FOLDER", folderPath);

// Upload File
SocketService.send("UPLOAD_FILE", JSON.stringify({
    path: targetFolder,
    fileName: fileName,
    data: base64String
}));
```

### Server → Client
```csharp
// Trả về FILE_LIST sau khi thực hiện thành công
SocketManager.SendJson(socket, "FILE_LIST", FileManagerService.GetDirectoryContent(path));

// Gửi thông báo log
SocketManager.SendJson(socket, "LOG", "Message here");
```

## Các File Được Chỉnh Sửa

1. **Client/js/features/fileManager.js**
   - Thêm method: `renameFile()`, `renameFolder()`, `deleteFolder()`, `uploadFile()`
   - Cập nhật `renderFiles()` để hiển thị nút action cho folder
   - Cập nhật logic delete file để gọi method thay vì toast message

2. **Client/js/utils/globalBridge.js**
   - Thêm hàm: `window.uploadFile()`, `window.createNewFolder()`, `window.searchFiles()`
   - Cập nhật `window.getDrives()` và `window.openFolder()` để tạo phiên bản fallback

## Tính Năng Chưa Triển Khai (TODO)

- **Create Folder**: Chưa triển khai trên client (server đã support)
  - Cần thêm hàm `createFolder()` trong FileManagerFeature
  - Cần update `window.createNewFolder()` trong globalBridge.js

## Kiểm Thử

Để kiểm thử các tính năng mới:

1. **Rename File**: 
   - Navigate đến một folder
   - Click nút edit (bút) trên file bất kỳ
   - Nhập tên mới

2. **Rename Folder**:
   - Click nút edit (bút) trên folder bất kỳ
   - Nhập tên mới

3. **Delete Folder**:
   - Click nút trash (thùng rác) trên folder
   - Xác nhận xóa

4. **Upload File**:
   - Click nút "Upload" trên toolbar
   - Chọn file từ máy tính
   - File sẽ được upload lên thư mục hiện tại

## Ưu Điểm So Với Phiên Bản Cũ

✅ Có thể đổi tên file  
✅ Có thể đổi tên folder  
✅ Có thể xóa folder (xóa toàn bộ nội dung)  
✅ Có thể upload file từ client lên server  
✅ Giao diện trực quan với các nút action rõ ràng  
✅ Feedback tức thời qua toast notifications  
