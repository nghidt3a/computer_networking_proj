import { SocketService } from '../services/socket.js';
import { UIManager } from '../utils/ui.js';

export const WebcamFeature = {
    init() {
        SocketService.on('WEBCAM_FRAME', this.handleWebcamFrame);
        SocketService.on('VIDEO_FILE', this.handleVideoDownload);

        // UI Events
        document.getElementById('btn-webcam-start')?.addEventListener('click', () => SocketService.send('START_WEBCAM'));
        document.getElementById('btn-webcam-stop')?.addEventListener('click', () => {
            SocketService.send('STOP_WEBCAM');
            this.resetWebcam();
        });
        document.getElementById('btn-webcam-record')?.addEventListener('click', this.startRecording);
    },

    // Reset webcam về trạng thái ban đầu
    resetWebcam() {
        const camImg = document.getElementById("webcam-feed");
        const placeholder = document.getElementById("webcam-placeholder");
        const statusBadge = document.getElementById("cam-status");

        if(camImg) {
            camImg.style.display = "none";
            camImg.src = "";
        }
        if(placeholder) placeholder.style.display = "flex";
        if(statusBadge) {
            statusBadge.className = "badge bg-secondary";
            statusBadge.innerText = "OFFLINE";
        }
    },

    handleWebcamFrame(data) {
        const payload = data.payload || data;
        const camImg = document.getElementById("webcam-feed");
        const placeholder = document.getElementById("webcam-placeholder");
        const statusBadge = document.getElementById("cam-status");

        if(camImg) {
            camImg.src = "data:image/jpeg;base64," + payload;
            camImg.style.display = "block";
        }
        if(placeholder) placeholder.style.display = "none";
        if(statusBadge) {
            statusBadge.className = "badge bg-success";
            statusBadge.innerText = "LIVE";
        }
    },

    startRecording() {
        const durationInput = document.getElementById("record-duration");
        const duration = durationInput ? durationInput.value : 10;
        
        SocketService.send('RECORD_WEBCAM', duration);
        UIManager.showToast(`Đang ghi hình ${duration}s...`, "info");
    },

    handleVideoDownload(data) {
        const payload = data.payload || data;
        // Chuyển đổi Base64 sang Binary Blob để tải video
        const binaryString = window.atob(payload);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: "video/avi" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        
        const time = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
        a.download = `Server_Rec_${time}.avi`;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);

        UIManager.showToast("Đã tải video về máy!", "success");
    }
};