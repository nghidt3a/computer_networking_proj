import { SocketService } from '../services/socket.js';
import { UIManager } from '../utils/ui.js';

let objectUrl = null;
let isStreaming = false;  // Biến theo dõi trạng thái streaming
let currentZoom = 100; // Current zoom level
let fitMode = 'contain'; // contain, cover, fill
let isPanning = false;
let startX, startY, scrollLeft, scrollTop;

// Control variables
let isControlEnabled = false;
let lastMoveTime = 0;

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

        if(btnStart) btnStart.onclick = () => {
            isStreaming = true; // cho phép nhận frame
            SocketService.send('START_STREAM');
        };
        if(btnStop) btnStop.onclick = () => {
            isStreaming = false;
            SocketService.send('STOP_STREAM');
            this.resetScreen();
        };
        if(btnCapture) btnCapture.onclick = () => SocketService.send('CAPTURE_SCREEN');
        
        // Setup Pan & Drag for zoomed images
        this.setupPanControls();
        
        // Setup Control Toggle
        this.setupControlToggle();
        
        // Setup Mouse and Keyboard Control
        this.setupMouseControl();
    },

    // Toggle Monitor (Start/Stop)
    toggleMonitor() {
        const btn = document.getElementById("btn-monitor-toggle");
        const btnText = document.getElementById("btn-monitor-text");
        const btnIcon = btn?.querySelector("i");

        if (!isStreaming) {
            // Bật Stream
            SocketService.send('START_STREAM');
            isStreaming = true;
            
            // Đổi giao diện nút sang Stop
            if (btn) {
                btn.className = "btn btn-danger btn-sm";
            }
            if (btnText) btnText.innerText = "Stop";
            if (btnIcon) btnIcon.className = "fas fa-stop";
            
            UIManager.showToast("Starting stream...", "info");
        } else {
            // Tắt Stream
            SocketService.send('STOP_STREAM');
            isStreaming = false;
            
            // Reset giao diện
            this.resetScreen();
            
            // Đổi giao diện nút về Start
            if (btn) {
                btn.className = "btn btn-success btn-sm";
            }
            if (btnText) btnText.innerText = "Start";
            if (btnIcon) btnIcon.className = "fas fa-play";
            
            UIManager.showToast("Stream stopped", "info");
        }
    },

    // Reset màn hình về trạng thái ban đầu
    resetScreen() {
        console.log('🔄 Resetting screen...');
        
        const img = document.getElementById("live-screen");
        const placeholder = document.getElementById("screen-placeholder");

        if(img) {
            // Fade out first, then clear src after transition
            img.classList.remove('visible');
            setTimeout(() => {
                img.src = "";
                // Giải phóng bộ nhớ sau khi fade out
                if(objectUrl) {
                    URL.revokeObjectURL(objectUrl);
                    objectUrl = null;
                }
            }, 350); // Match CSS transition duration
                console.log('Image reset');
        }
        
        if(placeholder) {
            // Restore visibility by removing data-hidden attribute
            placeholder.removeAttribute('data-hidden');
                console.log('Placeholder shown');
        }
        
        // Reset zoom level
        currentZoom = 100;
        fitMode = 'contain';
        this.updateZoomIndicator();
    },

    handleStreamFrame(arrayBuffer) {
        // Đọc header để phân loại frame (0x01 = monitor, 0x02 = webcam)
        const view = new DataView(arrayBuffer);
        const header = view.getUint8(0);
        const blobData = arrayBuffer.slice(1); // bỏ byte header
        
        // Chỉ hiển thị màn hình khi đang stream và đúng header
        if (!isStreaming || header !== 0x01) {
            console.warn('❌ handleStreamFrame ignored (isStreaming=', isStreaming, ' header=', header, ')');
            return;
        }
        
        console.log('✅ Received stream frame, size:', blobData.byteLength);
        
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        const blob = new Blob([blobData], { type: "image/jpeg" });
        objectUrl = URL.createObjectURL(blob);
        
        const img = document.getElementById("live-screen");
        const placeholder = document.getElementById("screen-placeholder");

        console.log('📸 Elements found:', { img: !!img, placeholder: !!placeholder });

        if(img) {
            img.src = objectUrl;
            // Trigger reflow to allow transition
            img.offsetHeight;
            img.classList.add('visible');
            
            console.log('✓ Image displayed');
            
            // Apply current zoom and fit mode
            this.applyZoom(currentZoom);
            this.applyFitMode(fitMode);
        } else {
            console.error('❌ #live-screen element not found!');
        }
        
        if(placeholder) {
            // Use class-based approach for smooth fade
            placeholder.classList.add('hidden');
            placeholder.setAttribute('data-hidden', 'true');
            
            console.log('✓ Placeholder hidden');
        } else {
            console.error('❌ #screen-placeholder element not found!');
        }
    },

    // Xử lý ảnh xem trước (Base64)
    handleSnapshotPreview(data) {
        const payload = data.payload || data;
        const imgSrc = "data:image/jpeg;base64," + payload;
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
    handleSnapshotDownload(data) {
        const payload = data.payload || data;
        const link = document.createElement('a');
        link.href = 'data:image/jpeg;base64,' + payload;
        const time = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
        link.download = `Screenshot_${time}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        UIManager.showToast("Ảnh đã được lưu về máy!", "success");
    },

    // NEW: Zoom Controls
    zoom(action) {
        const img = document.getElementById("live-screen");
        if (!img || img.style.display === "none") return;

        if (action === 'in') {
            if (currentZoom < 200) currentZoom += 25;
        } else if (action === 'out') {
            if (currentZoom > 50) currentZoom -= 25;
        } else if (action === 'reset') {
            currentZoom = 100;
        }

        this.applyZoom(currentZoom);
        this.updateZoomIndicator();
        UIManager.showToast(`Zoom: ${currentZoom}%`, "info");
    },

    applyZoom(level) {
        const img = document.getElementById("live-screen");
        if (!img) return;

        // Remove all zoom classes
        img.className = img.className.replace(/zoom-\d+/g, '').trim();
        
        // Add new zoom class
        img.classList.add(`zoom-${level}`);
    },

    updateZoomIndicator() {
        const indicator = document.getElementById("monitor-zoom-level");
        if (indicator) {
            indicator.textContent = `${currentZoom}%`;
            indicator.classList.add('show');
            setTimeout(() => indicator.classList.remove('show'), 1500);
        }
    },

    // NEW: Toggle Fit Mode
    toggleFitMode() {
        const modes = ['contain', 'cover', 'fill'];
        const currentIndex = modes.indexOf(fitMode);
        fitMode = modes[(currentIndex + 1) % modes.length];
        
        this.applyFitMode(fitMode);
        
        const btn = document.getElementById("btn-monitor-fit");
        const icons = {
            'contain': 'fa-compress-arrows-alt',
            'cover': 'fa-expand-arrows-alt',
            'fill': 'fa-arrows-alt'
        };
        
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = `fas ${icons[fitMode]}`;
            }
        }
        
        UIManager.showToast(`Fit Mode: ${fitMode}`, "info");
    },

    applyFitMode(mode) {
        const img = document.getElementById("live-screen");
        if (!img) return;

        img.className = img.className.replace(/fit-(contain|cover|fill)/g, '').trim();
        img.classList.add(`fit-${mode}`);
    },

    // NEW: Fullscreen Toggle
    toggleFullscreen() {
        const container = document.getElementById("monitor-container");
        if (!container) return;

        if (!document.fullscreenElement) {
            container.requestFullscreen().then(() => {
                container.classList.add('fullscreen');
                
                // Add exit button
                if (!container.querySelector('.fullscreen-exit')) {
                    const exitBtn = document.createElement('button');
                    exitBtn.className = 'fullscreen-exit';
                    exitBtn.innerHTML = '<i class="fas fa-times"></i> Exit Fullscreen (ESC)';
                    exitBtn.onclick = () => this.toggleFullscreen();
                    container.appendChild(exitBtn);
                }
                
                UIManager.showToast("Fullscreen Mode", "info");
            }).catch(err => {
                UIManager.showToast("Fullscreen failed: " + err.message, "error");
            });
        } else {
            document.exitFullscreen().then(() => {
                container.classList.remove('fullscreen');
                const exitBtn = container.querySelector('.fullscreen-exit');
                if (exitBtn) exitBtn.remove();
                UIManager.showToast("Exited Fullscreen", "info");
            });
        }
    },

    // NEW: Pan & Drag for Zoomed Images
    setupPanControls() {
        const container = document.getElementById("monitor-container");
        if (!container) return;

        container.addEventListener('mousedown', (e) => {
            if (currentZoom > 100) {
                isPanning = true;
                startX = e.pageX - container.offsetLeft;
                startY = e.pageY - container.offsetTop;
                scrollLeft = container.scrollLeft;
                scrollTop = container.scrollTop;
            }
        });

        container.addEventListener('mouseleave', () => {
            isPanning = false;
        });

        container.addEventListener('mouseup', () => {
            isPanning = false;
        });

        container.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const y = e.pageY - container.offsetTop;
            const walkX = (x - startX) * 1.5;
            const walkY = (y - startY) * 1.5;
            container.scrollLeft = scrollLeft - walkX;
            container.scrollTop = scrollTop - walkY;
        });
    },

    // NEW: Setup Control Toggle
    setupControlToggle() {
        const checkbox = document.getElementById('control-toggle');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                this.toggleControl(e.target.checked);
            });
        }
    },

    // NEW: Toggle Remote Control
    toggleControl(enabled) {
        isControlEnabled = enabled;
        const screenImg = document.getElementById('live-screen');
        
        if (isControlEnabled) {
            UIManager.showToast('Đã BẬT chế độ điều khiển!', 'success');
            if (screenImg) {
                screenImg.style.cursor = 'crosshair';
                screenImg.classList.add('control-active');
            }
            // Add keyboard event listener (use arrow function to preserve context)
            this.keyHandler = (e) => this.handleRemoteKey(e);
            document.addEventListener('keydown', this.keyHandler);
        } else {
            UIManager.showToast('Đã TẮT chế độ điều khiển!', 'info');
            if (screenImg) {
                screenImg.style.cursor = 'default';
                screenImg.classList.remove('control-active');
            }
            // Remove keyboard event listener
            if (this.keyHandler) {
                document.removeEventListener('keydown', this.keyHandler);
                this.keyHandler = null;
            }
        }
    },

    // NEW: Setup Mouse Control on Live Screen
    setupMouseControl() {
        const screenImg = document.getElementById('live-screen');
        if (!screenImg) return;

        // Mouse Move
        screenImg.addEventListener('mousemove', (e) => {
            if (!isControlEnabled) return;
            
            const now = Date.now();
            if (now - lastMoveTime < 50) return; // Throttle to 20fps
            lastMoveTime = now;
            
            const rect = screenImg.getBoundingClientRect();
            let rawX = (e.clientX - rect.left) / rect.width;
            let rawY = (e.clientY - rect.top) / rect.height;
            
            // Clamp values between 0 and 1
            const xPercent = Math.max(0, Math.min(1, rawX));
            const yPercent = Math.max(0, Math.min(1, rawY));
            
            SocketService.send('MOUSE_MOVE', JSON.stringify({ x: xPercent, y: yPercent }));
        });

        // Mouse Down
        screenImg.addEventListener('mousedown', (e) => {
            if (!isControlEnabled) return;
            e.preventDefault();
            
            const btn = e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle';
            SocketService.send('MOUSE_CLICK', JSON.stringify({ btn: btn, action: 'down' }));
        });

        // Mouse Up
        screenImg.addEventListener('mouseup', (e) => {
            if (!isControlEnabled) return;
            e.preventDefault();
            
            const btn = e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle';
            SocketService.send('MOUSE_CLICK', JSON.stringify({ btn: btn, action: 'up' }));
        });

        // Prevent Context Menu when controlling
        screenImg.addEventListener('contextmenu', (e) => {
            if (isControlEnabled) e.preventDefault();
        });
    },

    // NEW: Handle Keyboard Input for Remote Control
    handleRemoteKey(e) {
        if (!isControlEnabled) return;
        
        SocketService.send('KEY_PRESS', e.key);
        
        // Prevent default browser behavior for certain keys
        if (['F5', 'Tab', 'Alt', 'ContextMenu', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }
    }
};