# Screen Control Feature Documentation

## Tổng quan
Đã thêm chức năng **Remote Control** vào tab Screen Monitor, cho phép điều khiển máy tính từ xa thông qua chuột và bàn phím.

## Các thay đổi đã thực hiện

### 1. Client-Side Updates

#### A. HTML (index.html)
- **Vị trí**: Section `tab-monitor` trong card header
- **Thêm mới**: Control Toggle Switch
  ```html
  <div class="form-check form-switch me-3 d-flex align-items-center">
    <input class="form-check-input" type="checkbox" id="control-toggle" style="cursor: pointer;">
    <label class="form-check-label fw-bold small ms-2" for="control-toggle" style="cursor: pointer;">Control</label>
  </div>
  ```

#### B. JavaScript (monitor.js)
Đã thêm các chức năng mới:

1. **Biến điều khiển**:
   - `isControlEnabled`: Trạng thái bật/tắt control
   - `lastMoveTime`: Throttle cho mouse movement (50ms)

2. **Phương thức mới**:
   - `setupControlToggle()`: Khởi tạo switch control
   - `toggleControl(enabled)`: Bật/tắt chế độ điều khiển
   - `setupMouseControl()`: Xử lý các sự kiện chuột
   - `handleRemoteKey(e)`: Xử lý nhấn phím

3. **Mouse Control**:
   - `mousemove`: Di chuyển chuột (throttle 50ms ~ 20fps)
   - `mousedown`: Nhấn chuột (left/right/middle)
   - `mouseup`: Thả chuột
   - `contextmenu`: Vô hiệu hóa menu chuột phải khi control

4. **Keyboard Control**:
   - Gửi phím được nhấn đến server
   - Ngăn chặn hành vi mặc định của browser cho các phím đặc biệt (F5, Tab, Arrow keys, etc.)

#### C. CSS (monitor.css)
- Thay đổi `pointer-events` từ `none` thành `auto` cho `#live-screen`
- Thêm styling cho control toggle switch
- Thêm class `.control-active` với cursor crosshair

### 2. Server-Side (Đã có sẵn)

#### A. CommandRouter.cs
Các lệnh đã được implement:
- `MOUSE_MOVE`: Di chuyển con trỏ chuột
- `MOUSE_CLICK`: Mô phỏng click chuột
- `KEY_PRESS`: Mô phỏng nhấn phím

#### B. SystemHelper.cs
Các phương thức hỗ trợ:
- `SetCursorPosition(double xPercent, double yPercent)`: Di chuyển chuột theo tọa độ phần trăm
- `MouseClick(string button, string action)`: Xử lý click chuột (down/up)
- `SimulateKeyPress(string key)`: Mô phỏng nhấn phím qua SendKeys

## Cách sử dụng

### 1. Khởi động Stream
- Click nút **Start** trong tab Screen Monitor
- Đợi stream video hiển thị

### 2. Bật chế độ Control
- Bật switch **Control** ở phía trên bên trái
- Thông báo "Đã BẬT chế độ điều khiển!" sẽ hiện ra
- Con trỏ chuột sẽ đổi thành dạng crosshair

### 3. Điều khiển từ xa
- **Chuột**: Di chuyển, click trái/phải/giữa hoạt động bình thường
- **Bàn phím**: Nhập text, phím đặc biệt (Enter, Arrow keys, Tab, etc.)

### 4. Tắt chế độ Control
- Tắt switch **Control**
- Thông báo "Đã TẮT chế độ điều khiển!" sẽ hiện ra

## Kỹ thuật Implementation

### Tọa độ chuột
- Client gửi tọa độ **normalized** (0-1) dựa trên vị trí trong ảnh
- Server chuyển đổi sang tọa độ tuyệt đối (0-65535) của Windows
- Sử dụng `mouse_event` Win32 API với flag `MOUSEEVENTF_ABSOLUTE`

### Throttling
- Mouse movement được throttle tối đa 20 FPS (50ms)
- Giảm tải băng thông và xử lý server

### Event Handling
- Keyboard listener được attach/detach động khi bật/tắt control
- Sử dụng arrow function để preserve context trong event handler
- Prevent default behavior cho các phím đặc biệt

## Các phím được hỗ trợ

### Phím đặc biệt
- **Enter**, **Backspace**, **Escape**, **Tab**
- **Arrow Keys**: Up, Down, Left, Right

### Phím thường
- Tất cả các ký tự đơn (a-z, 0-9, symbols)

### Phím bị block default behavior
- F5 (Refresh)
- Tab (Navigation)
- Alt (Menu)
- Arrow keys (Scroll)

## Lưu ý quan trọng

### Security
- Chỉ hoạt động sau khi authenticate thành công
- Chế độ control phải được bật thủ công bởi user

### Performance
- Mouse movement throttle 50ms để tránh spam commands
- MOUSE_MOVE commands không được log trong console

### Compatibility
- Yêu cầu Windows API (SendKeys, mouse_event)
- Server phải chạy trên Windows
- Client có thể là bất kỳ browser nào hỗ trợ WebSocket

## Testing

### Test Cases
1. ✅ Bật/tắt control toggle
2. ✅ Di chuyển chuột trên remote screen
3. ✅ Click trái/phải/giữa
4. ✅ Nhập text từ bàn phím
5. ✅ Phím đặc biệt (Enter, Arrow, Tab)
6. ✅ Disable context menu khi control active
7. ✅ Throttling mouse movement

## References
- Tham khảo implementation từ **RemoteCoputerProject**
- Sử dụng Win32 API: `mouse_event`, `SendKeys`
- WebSocket protocol với JSON commands

---

**Phiên bản**: 1.0  
**Ngày tạo**: December 15, 2025  
**Người thực hiện**: GitHub Copilot
