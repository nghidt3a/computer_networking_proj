/**
 * MAIN ENTRY POINT
 * Chịu trách nhiệm khởi tạo ứng dụng và liên kết các module.
 */

import { SocketService } from './services/socket.js';
import { UIManager } from './utils/ui.js';

// Import Features (Các tính năng cụ thể)
import { AuthFeature } from './features/auth.js'; // (Nếu bạn tách logic login)
import { DashboardFeature } from './features/dashboard.js';
import { MonitorFeature } from './features/monitor.js';
import { WebcamFeature } from './features/webcam.js';
import { KeyloggerFeature } from './features/keylogger.js';
import { FileManagerFeature } from './features/fileManager.js';
import { TaskManagerFeature } from './features/taskManager.js';
// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("RCS Client Initializing...");

    // 1. Setup UI Events (Tabs, Sidebar clicks)
    setupNavigation();

    // 2. Setup Login Event
   
    DashboardFeature.init();
    MonitorFeature.init();
    WebcamFeature.init();
    KeyloggerFeature.init();
    FileManagerFeature.init();
    TaskManagerFeature.init();
});

// --- EVENT HANDLERS ---


function setupNavigation() {
    const navButtons = document.querySelectorAll('#sidebar .list-group-item');
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Logic chuyển Tab
            // 1. Remove active class cũ
            document.querySelector('.list-group-item.active')?.classList.remove('active');
            document.querySelector('.tab-content.active')?.classList.remove('active');
            
            // 2. Add active class mới
            const targetId = btn.getAttribute('data-tab');
            btn.classList.add('active');
            document.getElementById(`tab-${targetId}`)?.classList.add('active');
            
            // 3. Update Title
            const titleMap = {
                'dashboard': 'Overview',
                'monitor': 'Screen Monitor',
                'files': 'File Explorer',
                // ...
            };
            document.getElementById('page-title').innerText = titleMap[targetId] || 'RCS';
            
            // 4. Trigger Feature Load (Lazy Load)
            if(targetId === 'files') {
                // FileManager.init(); // Gọi hàm load ổ đĩa
            }
        });
    });
    
    document.getElementById('btn-disconnect').addEventListener('click', () => {
        SocketService.disconnect();
        UIManager.showLoginScreen();
    });
}