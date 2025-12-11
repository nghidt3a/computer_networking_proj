import { SocketService } from '../services/socket.js';
import { UIManager } from '../utils/ui.js';

let currentPath = "";

export const FileManagerFeature = {
    init() {
        SocketService.on('FILE_LIST', this.renderFiles);
        SocketService.on('FILE_DOWNLOAD_DATA', this.saveDownloadedFile);

        // UI Events
        document.getElementById('btn-file-home')?.addEventListener('click', () => this.getDrives());
        
        // Lazy load: Khi bấm vào tab Files lần đầu thì load ổ đĩa luôn
        const navFiles = document.getElementById('nav-files');
        if(navFiles) {
            navFiles.addEventListener('click', () => {
                if(currentPath === "") this.getDrives();
            });
        }
    },

    getDrives() {
        currentPath = "";
        this.updatePathLabel("My Computer");
        SocketService.send("GET_DRIVES");
    },

    openFolder(path) {
        currentPath = path;
        this.updatePathLabel(path);
        SocketService.send("GET_DIR", path);
    },

    updatePathLabel(path) {
        const label = document.getElementById("current-path");
        if(label) label.innerText = path;
    },

    renderFiles(items) {
        if(items.error) return UIManager.showToast(items.error, "error");

        const tbody = document.getElementById("file-list-body");
        if(!tbody) return;
        tbody.innerHTML = "";

        items.forEach(item => {
            const tr = document.createElement("tr");

            // 1. Icon Cell
            const tdIcon = document.createElement("td");
            tdIcon.style.cursor = "pointer";
            const icon = document.createElement("i");
            
            // Logic chọn icon
            if (item.Type === "DRIVE") {
                icon.className = "fas fa-hdd text-primary";
                tdIcon.onclick = () => FileManagerFeature.openFolder(item.Path);
            } else if (item.Type === "FOLDER") {
                icon.className = "fas fa-folder text-warning";
                tdIcon.onclick = () => FileManagerFeature.openFolder(item.Path);
            } else if (item.Type === "BACK") {
                icon.className = "fas fa-level-up-alt";
                tdIcon.onclick = () => FileManagerFeature.openFolder(item.Path);
            } else {
                icon.className = "fas fa-file-alt text-light";
            }
            tdIcon.appendChild(icon);

            // 2. Name Cell (XSS PROOF)
            const tdName = document.createElement("td");
            tdName.textContent = item.Name;
            tdName.style.fontWeight = "500";
            tdName.style.cursor = "pointer";
            if (item.Type !== "FILE") {
                tdName.onclick = () => FileManagerFeature.openFolder(item.Path);
            }

            // 3. Size Cell
            const tdSize = document.createElement("td");
            tdSize.textContent = item.Size || "";

            // 4. Action Cell
            const tdAction = document.createElement("td");
            if (item.Type === "FILE") {
                const btnDown = document.createElement("button");
                btnDown.className = "btn btn-sm btn-success me-1";
                btnDown.innerHTML = '<i class="fas fa-download"></i>';
                btnDown.onclick = () => {
                    if(confirm("Tải file này?")) SocketService.send("DOWNLOAD_FILE", item.Path);
                };

                const btnDel = document.createElement("button");
                btnDel.className = "btn btn-sm btn-danger";
                btnDel.innerHTML = '<i class="fas fa-trash"></i>';
                btnDel.onclick = () => {
                    if(confirm("XÓA VĨNH VIỄN file này?")) {
                        SocketService.send("DELETE_FILE", item.Path);
                        setTimeout(() => FileManagerFeature.openFolder(currentPath), 1000);
                    }
                };

                tdAction.append(btnDown, btnDel);
            }

            tr.append(tdIcon, tdName, tdSize, tdAction);
            tbody.appendChild(tr);
        });
    },

    saveDownloadedFile(payload) {
        const { fileName, data } = payload; // data là base64
        const link = document.createElement('a');
        link.href = 'data:application/octet-stream;base64,' + data;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        UIManager.showToast(`Đã tải xuống: ${fileName}`, "success");
    }
};