# Hướng Dẫn Kiểm Thử File Manager Features

## 🧪 Các Bước Chuẩn Bị

1. **Khởi động Server**
   ```bash
   cd computer_networking_proj/Server
   dotnet run
   # hoặc chạy file .exe trong bin/Debug/net8.0-windows/
   ```

2. **Mở Client**
   - Mở `computer_networking_proj/Client/index.html` trong trình duyệt
   - Nhập IP, Port, Password của Server
   - Click "Connect"

3. **Chuyển sang Tab File Manager**
   - Click vào tab "File Manager" 
   - Click nút "Home" để load ổ đĩa

---

## ✅ Test Cases

### Test 1: Rename File

**Bước thực hiện**:
1. Trong File Manager, chọn 1 ổ đĩa (e.g., C:)
2. Vào folder bất kỳ có file
3. Tìm file text hoặc hình ảnh nào đó
4. Click nút Edit (bút vàng) trên file đó
5. Nhập tên mới: ví dụ `myfile_renamed.txt`
6. Click OK

**Kỳ vọng**:
- Toast: "Đang rename..."
- Danh sách file được cập nhật trong 0.5s
- File có tên mới xuất hiện trong danh sách
- Server log: "Đã đổi tên file thành công!"

**Cách debug nếu lỗi**:
```javascript
// Console (F12)
console.log("currentPath:", currentPath);
console.log("FileManagerFeature:", FileManagerFeature);
// Kiểm tra xem method renameFile có tồn tại không
```

---

### Test 2: Rename Folder

**Bước thực hiện**:
1. Trong File Manager, chọn 1 ổ đĩa
2. Tìm folder bất kỳ (không phải system folder)
3. Click nút Edit (bút vàng) trên folder
4. Nhập tên mới: ví dụ `MyFolder_New`
5. Click OK

**Kỳ vọng**:
- Toast: "Đang rename folder..."
- Danh sách folder được cập nhật
- Folder có tên mới xuất hiện
- Server log: "Đã đổi tên thư mục thành công!"

**Cách debug**:
```javascript
// Check payload sent
// Mở Network tab trong DevTools
// Filter: ws (WebSocket)
// Kiểm tra message gửi có format đúng không:
{
  "path": "C:\\FolderOld",
  "newName": "MyFolder_New"
}
```

---

### Test 3: Delete Folder

**Bước thực hiện**:
1. Trong File Manager, chọn 1 ổ đĩa
2. Tạo test folder: `TestDelete` (hoặc folder rỗng nào đó)
3. Click nút Delete (thùng rác) trên folder
4. Confirm: "Yes, delete it"

**Kỳ vọng**:
- Toast: "Folder delete confirmed"
- Folder biến mất khỏi danh sách
- Nếu là folder hiện tại được delete, quay về "My Computer"
- Server log: "Đã xóa thư mục thành công!"

**Cách debug**:
```javascript
// Kiểm tra deleteFolder logic
if (!currentPath || currentPath === "") {
    this.getDrives();  // ← Nếu folder hiện tại bị xóa
} else {
    this.openFolder(currentPath);  // ← Refresh folder
}
```

---

### Test 4: Upload File

**Bước thực hiện**:
1. Trong File Manager, navigate đến folder bất kỳ (e.g., `C:\Users\`)
2. Click nút "Upload" trên toolbar
3. Chọn file từ máy tính (suggest: nhỏ, < 10MB)
   - Ví dụ: `document.pdf`, `image.jpg`, `script.txt`
4. Chờ upload hoàn thành

**Kỳ vọng**:
- Dialog "Save As" mở
- Chọn file → Click Open
- Toast: "Uploading document.pdf..."
- File progress (có thể mất vài giây)
- Toast: "Upload thành công: document.pdf"
- File mới xuất hiện trong danh sách folder

**Cách debug**:
```javascript
// Console check
FileManagerFeature.uploadFile([{
    name: "test.txt",
    size: 1024
}]);

// Network tab: xem payload size có quá lớn không
// Server Console: xem ">> Đang nhận file upload: test.txt..."
```

---

### Test 5: Search Files

**Bước thực hiện**:
1. Vào folder có nhiều file
2. Gõ vào Search box: ví dụ `*.txt` hoặc `document`
3. Danh sách file được lọc tự động

**Kỳ vọng**:
- Chỉ file chứa keyword được hiển thị
- Các file khác bị ẩn
- Xóa search text → tất cả file hiển thị lại

**Cách debug**:
```javascript
// Test search function
window.searchFiles();
// hoặc
const searchInput = document.getElementById('file-search-input');
searchInput.value = "test";
window.searchFiles();
```

---

## 🔴 Error Cases (Kiểm Thử Lỗi)

### Error 1: Upload File Quá Lớn

**Test**:
- Thử upload file > 50MB
- Server sẽ reject

**Kỳ vọng**:
- Toast: "Lỗi: File quá lớn (>50MB)..."
- File không được upload

---

### Error 2: Rename Thành Tên Hiện Tại

**Test**:
- File có tên: `original.txt`
- Rename thành: `original.txt` (giữ nguyên)
- Click OK

**Kỳ vọng**:
- Không gửi request (client check: `if(newName && newName !== item.Name)`)
- Toast không hiển thị

---

### Error 3: Delete Folder Đang Có Process Lock

**Test** (Windows):
- Mở PowerShell trong folder nào đó
- Cố gắng delete folder từ File Manager

**Kỳ vọng**:
- Toast: "Lỗi xóa folder: Access to the path '...' is denied"
- Folder vẫn tồn tại

---

### Error 4: Rename File Không Có Quyền

**Test** (Windows):
- File là System file (e.g., `pagefile.sys`)
- Cố gắng rename

**Kỳ vọng**:
- Toast: "Lỗi đổi tên file: ..."
- File giữ nguyên tên cũ

---

## 📊 Performance Test

### Test: Upload File Lớn

**Setup**:
- Chuẩn bị file 10-20MB
- Upload lên server

**Kiểm tra**:
1. **Memory usage**: Mở Task Manager, kiểm tra RAM trước/sau upload
2. **Time**: Đo thời gian upload
   ```javascript
   const start = Date.now();
   FileManagerFeature.uploadFile(files);
   // Check console log
   // const duration = Date.now() - start;
   ```
3. **Network**: DevTools → Network tab, xem bandwidth

**Kỳ vọng**:
- File được upload thành công
- Memory không tăng đột ngột
- Hoàn thành trong vài giây

---

## 🛠️ Troubleshooting Guide

### Problem 1: Upload không hoạt động

**Nguyên nhân có thể**:
- FileManagerFeature chưa load
- Quyền truy cập folder bị deny

**Giải pháp**:
```javascript
// Console kiểm tra
1. console.log(FileManagerFeature);  // phải là object
2. console.log(currentPath);  // phải có giá trị
3. // Thử upload
FileManagerFeature.uploadFile([
    { name: "test.txt", size: 100 }
]);
```

---

### Problem 2: Rename không làm theo

**Nguyên nhân**:
- Server error (quyền truy cập)
- Folder không tồn tại
- File đang bị lock

**Giải pháp**:
```javascript
// Server Console sẽ hiển thị lỗi cụ thể
// Ví dụ: "Lỗi đổi tên file: File being used by another process"
```

---

### Problem 3: UI không cập nhật sau delete

**Nguyên nhân**:
- setTimeout quá ngắn
- Server không gửi FILE_LIST response

**Giải pháp**:
- Tăng timeout: `setTimeout(() => ..., 1000)` thay vì 500
- Kiểm tra Server log xem có FILE_LIST được gửi không

---

## 📝 Test Report Template

```markdown
## Test Report - File Manager Features

**Date**: 15/12/2025
**Tester**: [Your Name]

### Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| Rename File | ✅ PASS / ❌ FAIL | - |
| Rename Folder | ✅ PASS / ❌ FAIL | - |
| Delete Folder | ✅ PASS / ❌ FAIL | - |
| Upload File | ✅ PASS / ❌ FAIL | - |
| Search Files | ✅ PASS / ❌ FAIL | - |

### Issues Found

- Issue #1: ...
- Issue #2: ...

### Performance

- Upload 5MB file: ~3s
- Delete folder with 100 items: ~2s
- Rename: ~0.5s

### Browser Tested

- Chrome v120
- Firefox v121
- Edge v120
```

---

## ✅ Final Checklist

Trước khi deploy:

- [ ] Tất cả 4 tính năng hoạt động
- [ ] Không có console errors
- [ ] Server logs hiển thị đúng message
- [ ] UI cập nhật chính xác
- [ ] Error handling hoạt động
- [ ] Performance chấp nhận được

---

**Status**: Ready for Testing ✅
