# System Info Dashboard Feature

## Tổng quan
Tính năng hiển thị thông tin phần cứng chi tiết và thống kê hiệu suất thời gian thực của Server.

## Chức năng đã thêm

### 1. Thông tin phần cứng tĩnh (Static System Info)
- **Hệ điều hành (OS)**: Hiển thị phiên bản Windows
- **Tên máy (Hostname)**: Tên máy tính Server
- **CPU Model**: Model CPU chi tiết
- **GPU Name**: Tên card đồ họa
- **VRAM**: Dung lượng bộ nhớ GPU
- **Disk**: Dung lượng ổ cứng chính

### 2. Thống kê hiệu suất thời gian thực (Real-time Performance Stats)
- **CPU Status**: % Load và nhiệt độ CPU (nếu có)
- **RAM Usage**: % sử dụng bộ nhớ RAM
- **GPU Load**: % tải GPU
- **Disk Usage**: % sử dụng ổ đĩa

## Cách hoạt động

### Client Side
1. **HTML** (`Client/index.html`):
   - Thêm section System Info Dashboard vào tab Dashboard
   - Hiển thị 2 cột: System Details (trái) và Performance Stats (phải)

2. **JavaScript** (`Client/js/features/dashboard.js`):
   - `updateSystemInfo(info)`: Cập nhật thông tin phần cứng tĩnh
   - `updatePerformanceStats(perf)`: Cập nhật thống kê hiệu suất
   - `startPerformanceMonitoring()`: Bắt đầu polling mỗi 2 giây
   - `stopPerformanceMonitoring()`: Dừng khi ngắt kết nối

3. **CSS** (`Client/css/components.css`):
   - Styling cho info boxes và stat cards
   - Responsive design cho mobile

4. **Socket Service** (`Client/js/services/socket.js`):
   - Lắng nghe sự kiện `SYS_INFO` và `PERF_STATS`
   - Dispatch `AUTH_SUCCESS` để trigger monitoring

### Server Side
Server đã có sẵn các handler:

1. **CommandRouter.cs**:
   - `GET_SYS_INFO`: Lấy thông tin hệ thống tĩnh
   - `GET_PERFORMANCE`: Lấy thống kê hiệu suất

2. **SystemHelper.cs**:
   - `GetSystemInfo()`: Query WMI để lấy thông tin phần cứng
   - `GetPerformanceStats()`: Đọc Performance Counters

## Flow hoạt động

```
1. User đăng nhập thành công
   ↓
2. Socket gửi event AUTH_SUCCESS
   ↓
3. DashboardFeature.startPerformanceMonitoring()
   ↓
4. Gửi GET_SYS_INFO (lần đầu)
   ↓
5. Server trả về SYS_INFO
   ↓
6. Client cập nhật UI (thông tin tĩnh)
   ↓
7. Bắt đầu setInterval mỗi 2s
   ↓
8. Gửi GET_PERFORMANCE định kỳ
   ↓
9. Server trả về PERF_STATS
   ↓
10. Client cập nhật UI (thống kê động)
```

## Cách sử dụng

1. Mở file `Client/index.html` trong trình duyệt
2. Đăng nhập vào Server
3. Dashboard sẽ tự động hiển thị thông tin hệ thống
4. Thống kê hiệu suất được cập nhật mỗi 2 giây

## Lưu ý
- Performance monitoring tự động dừng khi ngắt kết nối
- CPU temperature hiện chưa được implement (hiện "--")
- GPU Load hiện đang dùng CPU Load làm giá trị tạm (do khó lấy GPU load trong C#)

## Tương thích
- Hoạt động trên Windows Server (yêu cầu .NET 8.0+)
- Responsive trên mobile và tablet
- Hỗ trợ dark mode (nếu được kích hoạt)
