import { SocketService } from '../services/socket.js';
import { UIManager } from '../utils/ui.js';

let allInstalledApps = [];
let perfInterval = null;

export const DashboardFeature = {
    init() {
        // Listen to socket events
        SocketService.on('INSTALLED_LIST', (data) => {
            allInstalledApps = data.payload || data;
            this.renderAppGrid(allInstalledApps);
        });

        SocketService.on('LOG', (data) => {
            const text = data.payload || data;
            this.logToTerminal(text);
            if (text.includes('Lỗi') || text.includes('Error')) {
                UIManager.showToast(text, 'error');
            } else if (text.includes('Đã')) {
                UIManager.showToast(text, 'success');
            }
        });
        
        // Listen for System Info
        SocketService.on('SYS_INFO', (data) => {
            this.updateSystemInfo(data.payload || data);
        });
        
        // Listen for Performance Stats
        SocketService.on('PERF_STATS', (data) => {
            this.updatePerformanceStats(data.payload || data);
        });
        
        // Start monitoring when authenticated
        SocketService.on('AUTH_SUCCESS', () => {
            this.startPerformanceMonitoring();
        });
        
        // Stop monitoring when disconnected
        SocketService.on('DISCONNECT', () => {
            this.stopPerformanceMonitoring();
        });

        // Listen for filter event from global bridge
        window.addEventListener('filterApps', (e) => {
            const keyword = e.detail.keyword;
            const filtered = allInstalledApps.filter(app => 
                app.name.toLowerCase().includes(keyword)
            );
            this.renderAppGrid(filtered);
        });

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
    },

    renderAppGrid(appList) {
        const container = document.getElementById("app-grid");
        if(!container) return;
        
        container.innerHTML = "";
        if (!appList || appList.length === 0) {
            container.innerHTML = '<p class="text-center w-100">No apps found.</p>';
            return;
        }
        
        appList.forEach(app => {
            const div = document.createElement("div");
            div.className = "app-item-btn";
            div.onclick = () => {
                SocketService.send("START_APP", app.path);
                window.closeAppLibrary();
                UIManager.showToast(`Launching ${app.name}...`, "success");
            };
            
            const icon = document.createElement("i");
            icon.className = "fas fa-cube app-item-icon";
            const span = document.createElement("span");
            span.className = "app-item-name";
            span.textContent = app.name;
            
            div.appendChild(icon);
            div.appendChild(span);
            container.appendChild(div);
        });
    },

    logToTerminal(text) {
        const term = document.getElementById("terminal-output");
        if(!term) return;
        
        const div = document.createElement("div");
        div.style.color = "#10b981";
        div.textContent = `[${new Date().toLocaleTimeString()}] > ${text}`;
        term.appendChild(div);
        term.scrollTop = term.scrollHeight;
    },
    
    updateSystemInfo(info) {
        // Update static system information
        if (document.getElementById('os-info')) {
            document.getElementById('os-info').innerText = info.os || 'Windows';
            document.getElementById('pc-name').innerText = info.pcName || 'Unknown';
            document.getElementById('cpu-name').innerText = info.cpuName || 'Standard CPU';
            document.getElementById('gpu-name').innerText = info.gpuName || 'Integrated Graphics';
            document.getElementById('vram-val').innerText = info.vram || 'N/A';
            document.getElementById('disk-name').innerText = info.totalDisk || 'N/A';
        }
    },
    
    updatePerformanceStats(perf) {
        // Update CPU
        const elCpuFreq = document.getElementById('disp-cpu-freq');
        if (elCpuFreq) {
            elCpuFreq.innerText = (perf.cpu || 0) + '% Load';
        }
        
        const elCpuTemp = document.getElementById('disp-cpu-temp');
        if (elCpuTemp) {
            if (perf.cpuTemp) {
                elCpuTemp.innerText = 'Temp: ' + perf.cpuTemp + '°C';
                elCpuTemp.style.color = perf.cpuTemp > 80 ? '#ef4444' : '#94a3b8';
            } else {
                elCpuTemp.innerText = 'Temp: --';
            }
        }
        
        // Update RAM
        const elRam = document.getElementById('disp-ram-usage');
        if (elRam) {
            elRam.innerText = (perf.ram || 0) + '% Used';
        }
        
        // Update GPU
        const elGpu = document.getElementById('disp-gpu-vram');
        if (elGpu) {
            elGpu.innerText = (perf.gpu || 0) + '% Load';
        }
        
        // Update Disk
        const elDisk = document.getElementById('disp-disk-free');
        if (elDisk) {
            elDisk.innerText = (perf.diskUsage || 0) + '% Used';
        }
    },
    
    startPerformanceMonitoring() {
        // Request initial system info
        SocketService.send('GET_SYS_INFO');
        
        // Start periodic performance updates
        if (perfInterval) clearInterval(perfInterval);
        perfInterval = setInterval(() => {
            SocketService.send('GET_PERFORMANCE');
        }, 2000); // Update every 2 seconds
    },
    
    stopPerformanceMonitoring() {
        if (perfInterval) {
            clearInterval(perfInterval);
            perfInterval = null;
        }
    }
};