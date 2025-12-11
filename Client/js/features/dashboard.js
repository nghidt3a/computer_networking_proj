import { SocketService } from '../services/socket.js';
import { UIManager } from '../utils/ui.js';

export const DashboardFeature = {
    init() {
        // Power Controls
        document.getElementById('btn-shutdown')?.addEventListener('click', () => {
            if(confirm('Tắt máy Server?')) SocketService.send('SHUTDOWN');
        });
        
        document.getElementById('btn-restart')?.addEventListener('click', () => {
            if(confirm('Khởi động lại Server?')) SocketService.send('RESTART');
        });

        // Quick Launch
        document.getElementById('btn-run-app')?.addEventListener('click', this.runApp);
        document.getElementById('quickAppInput')?.addEventListener('keydown', (e) => {
            if(e.key === 'Enter') this.runApp();
        });

        // Web Shortcuts (Sử dụng Event Delegation cho gọn)
        document.querySelectorAll('.btn-web-launch').forEach(btn => {
            btn.addEventListener('click', () => {
                const url = btn.getAttribute('data-url');
                this.openWeb(url);
            });
        });
    },

    runApp() {
        const input = document.getElementById("quickAppInput");
        const appName = input.value.trim();
        if (appName) {
            SocketService.send("START_APP", appName);
            UIManager.showToast(`Đang mở: ${appName}...`, "info");
            input.value = "";
        } else {
            UIManager.showToast("Vui lòng nhập tên ứng dụng!", "error");
        }
    },

    openWeb(url) {
        SocketService.send("START_APP", url);
        UIManager.showToast(`Đang mở trình duyệt: ${url}...`, "info");
    }
};