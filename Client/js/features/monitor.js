import { SocketService } from '../services/socket.js';
import { UIManager } from '../utils/ui.js';

let objectUrl = null;

export const MonitorFeature = {
    init() {
        // 1. Đăng ký lắng nghe sự kiện từ Server
        SocketService.on('BINARY_STREAM', this.handleStreamFrame);
        SocketService.on('SCREEN_CAPTURE', this.handleSnapshotPreview);
        SocketService.on('SCREENSHOT_FILE', this.handleSnapshotDownload);

        // 2. Gán sự kiện cho các nút bấm trong UI
        const btnStart = document.querySelector('#tab-monitor button[data-action="start"]');
        const btnStop = document.querySelector('#tab-monitor button[data-action="stop"]');
        const btnCapture = document.querySelector('#tab-monitor button[data-action="capture"]');

        if(btnStart) btnStart.onclick = () => SocketService.send('START_STREAM');
        if(btnStop) btnStop.onclick = () => SocketService.send('STOP_STREAM');
        if(btnCapture) btnCapture.onclick = () => SocketService.send('CAPTURE_SCREEN');
    },

    // Xử lý luồng Stream (Binary ArrayBuffer)
    handleStreamFrame(arrayBuffer) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        const blob = new Blob([arrayBuffer], { type: "image/jpeg" });
        objectUrl = URL.createObjectURL(blob);
        
        const img = document.getElementById("live-screen");
        const placeholder = document.getElementById("screen-placeholder");
        const status = document.getElementById("monitor-status");

        if(img) {
            img.src = objectUrl;
            img.style.display = "block";
        }
        if(placeholder) placeholder.style.display = "none";
        if(status) status.innerText = "Live Streaming";
    },

    // Xử lý ảnh xem trước (Base64)
    handleSnapshotPreview(packet) {
        const imgSrc = "data:image/jpeg;base64," + packet.payload;
        const previewImg = document.getElementById("captured-preview");
        const saveBadge = document.getElementById("save-badge");
        const previewText = document.getElementById("preview-text");

        if (previewImg) {
            previewImg.src = imgSrc;
            previewImg.classList.remove("hidden");
            if(previewText) previewText.style.display = "none";
            if(saveBadge) saveBadge.classList.remove("hidden");
        }
    },

    // Xử lý tải ảnh gốc về máy
    handleSnapshotDownload(packet) {
        const link = document.createElement('a');
        link.href = 'data:image/jpeg;base64,' + packet.payload;
        const time = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
        link.download = `Screenshot_${time}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        UIManager.showToast("Ảnh đã được lưu về máy!", "success");
    }
};