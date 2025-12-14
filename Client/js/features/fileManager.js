import { SocketService } from '../services/socket.js';
import { UIManager } from '../utils/ui.js';

let currentPath = "";

export const FileManagerFeature = {
    init() {
        // Bind methods to this context
        SocketService.on('FILE_LIST', (data) => this.renderFiles(data));
        SocketService.on('FILE_DOWNLOAD_DATA', (data) => this.saveDownloadedFile(data));

        // UI Events
        document.getElementById('btn-file-home')?.addEventListener('click', () => this.getDrives());
        
        // Initialize breadcrumb home button
        this.initBreadcrumbHome();
        
        // Lazy load: Khi bấm vào tab Files lần đầu thì load ổ đĩa luôn
        const navFiles = document.getElementById('nav-files');
        if(navFiles) {
            let hasLoaded = false;
            navFiles.addEventListener('click', () => {
                if(!hasLoaded) {
                    hasLoaded = true;
                    setTimeout(() => {
                        this.getDrives();
                        // Re-initialize breadcrumb in case it wasn't loaded yet
                        this.initBreadcrumbHome();
                    }, 100);
                }
            });
        }
    },

    initBreadcrumbHome() {
        // Initialize the static breadcrumb home button that's in HTML
        const breadcrumbContainer = document.getElementById("file-breadcrumb");
        if(breadcrumbContainer) {
            const homeLink = breadcrumbContainer.querySelector('a');
            if(homeLink && !homeLink.dataset.initialized) {
                homeLink.dataset.initialized = 'true';
                homeLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.getDrives();
                });
            }
        }
    },

    getDrives() {
        currentPath = "";
        this.updatePathLabel("My Computer");
        SocketService.send("GET_DRIVES");
    },

    openFolder(path) {
        // Normalize path - ensure drive letters have trailing backslash if just root
        let normalizedPath = path;
        if (normalizedPath && normalizedPath.match(/^[A-Za-z]:$/)) {
            // If path is just "D:" add backslash to make it "D:\"
            normalizedPath = normalizedPath + "\\";
        }
        
        currentPath = normalizedPath;
        this.updatePathLabel(normalizedPath);
        console.log('Opening folder:', normalizedPath);
        SocketService.send("GET_DIR", normalizedPath);
    },

    updatePathLabel(path) {
        // Not used anymore - breadcrumb handles this in updateBreadcrumb()
        // Keep for backward compatibility if needed
    },

    renderFiles(data) {
        const items = data.payload || data;
        if(items.error) return UIManager.showToast(items.error, "error");

        const tbody = document.getElementById("file-list-body");
        if(!tbody) return;
        tbody.innerHTML = "";

        // Update breadcrumb
        this.updateBreadcrumb(currentPath);

        items.forEach(item => {
            const tr = document.createElement("tr");
            tr.style.cursor = (item.Type !== "FILE") ? "pointer" : "default";

            // 1. Type Icon Cell (centered, with padding)
            const tdIcon = document.createElement("td");
            tdIcon.className = "text-center ps-4";
            const icon = document.createElement("i");
            icon.style.fontSize = "1.25rem";
            
            // Colorful icons based on type
            if (item.Type === "DRIVE") {
                icon.className = "fas fa-hdd text-primary";
            } else if (item.Type === "FOLDER") {
                icon.className = "fas fa-folder text-warning";
            } else if (item.Type === "BACK") {
                icon.className = "fas fa-arrow-left text-secondary";
            } else {
                // File icons - different colors based on extension
                const ext = item.Name.split('.').pop().toLowerCase();
                if(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(ext)) {
                    icon.className = "fas fa-file-image text-info";
                } else if(['mp4', 'avi', 'mkv', 'mov'].includes(ext)) {
                    icon.className = "fas fa-file-video text-danger";
                } else if(['mp3', 'wav', 'flac', 'aac'].includes(ext)) {
                    icon.className = "fas fa-file-audio text-success";
                } else if(['pdf'].includes(ext)) {
                    icon.className = "fas fa-file-pdf text-danger";
                } else if(['doc', 'docx'].includes(ext)) {
                    icon.className = "fas fa-file-word text-primary";
                } else if(['xls', 'xlsx'].includes(ext)) {
                    icon.className = "fas fa-file-excel text-success";
                } else if(['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
                    icon.className = "fas fa-file-archive text-warning";
                } else if(['txt', 'log'].includes(ext)) {
                    icon.className = "fas fa-file-alt text-secondary";
                } else if(['exe', 'msi'].includes(ext)) {
                    icon.className = "fas fa-cog text-dark";
                } else {
                    icon.className = "fas fa-file text-muted";
                }
            }
            tdIcon.appendChild(icon);

            // Click to open folder/drive
            if (item.Type !== "FILE") {
                tdIcon.onclick = () => FileManagerFeature.openFolder(item.Path);
            }

            // 2. Name Cell (with padding)
            const tdName = document.createElement("td");
            tdName.className = "ps-3";
            tdName.textContent = item.Name;
            tdName.style.fontWeight = "500";
            tdName.style.color = "#202124";
            if (item.Type !== "FILE") {
                tdName.onclick = () => FileManagerFeature.openFolder(item.Path);
            }

            // 3. Last Modified Cell
            const tdModified = document.createElement("td");
            tdModified.className = "text-muted small";
            tdModified.textContent = item.LastModified || "—";

            // 4. Size Cell
            const tdSize = document.createElement("td");
            tdSize.className = "text-muted small";
            tdSize.textContent = item.Size || "—";

            // 5. Actions Cell (aligned right with subtle buttons)
            const tdAction = document.createElement("td");
            tdAction.className = "text-end pe-4";
            
            if (item.Type === "FILE") {
                // Download button
                const btnDown = document.createElement("button");
                btnDown.className = "btn btn-sm btn-light me-1";
                btnDown.title = "Download";
                btnDown.innerHTML = '<i class="fas fa-download text-primary"></i>';
                btnDown.onclick = (e) => {
                    e.stopPropagation();
                    if(confirm("Download this file?")) SocketService.send("DOWNLOAD_FILE", item.Path);
                };

                // Rename button
                const btnRename = document.createElement("button");
                btnRename.className = "btn btn-sm btn-light me-1";
                btnRename.title = "Rename";
                btnRename.innerHTML = '<i class="fas fa-edit text-secondary"></i>';
                btnRename.onclick = (e) => {
                    e.stopPropagation();
                    const newName = prompt("Enter new name:", item.Name);
                    if(newName && newName !== item.Name) {
                        FileManagerFeature.renameFile(item.Path, newName);
                    }
                };

                // Delete button
                const btnDel = document.createElement("button");
                btnDel.className = "btn btn-sm btn-light";
                btnDel.title = "Delete";
                btnDel.innerHTML = '<i class="fas fa-trash text-danger"></i>';
                btnDel.onclick = (e) => {
                    e.stopPropagation();
                    if(confirm("Delete this file permanently?")) {
                        SocketService.send("DELETE_FILE", item.Path);
                        setTimeout(() => FileManagerFeature.openFolder(currentPath), 1000);
                    }
                };

                tdAction.append(btnDown, btnRename, btnDel);
            } else if (item.Type === "FOLDER") {
                // Folder actions - rename and delete
                const btnRename = document.createElement("button");
                btnRename.className = "btn btn-sm btn-light me-1";
                btnRename.title = "Rename Folder";
                btnRename.innerHTML = '<i class="fas fa-edit text-secondary"></i>';
                btnRename.onclick = (e) => {
                    e.stopPropagation();
                    const newName = prompt("Enter new folder name:", item.Name);
                    if(newName && newName !== item.Name) {
                        FileManagerFeature.renameFolder(item.Path, newName);
                    }
                };

                const btnDel = document.createElement("button");
                btnDel.className = "btn btn-sm btn-light";
                btnDel.title = "Delete Folder";
                btnDel.innerHTML = '<i class="fas fa-trash text-danger"></i>';
                btnDel.onclick = (e) => {
                    e.stopPropagation();
                    if(confirm("Delete this folder and all its contents?")) {
                        FileManagerFeature.deleteFolder(item.Path);
                    }
                };
                tdAction.append(btnRename, btnDel);
            }

            tr.append(tdIcon, tdName, tdModified, tdSize, tdAction);
            tbody.appendChild(tr);
        });

        // Add hover effect styling
        if(items.length === 0) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td colspan="5" class="text-center text-muted py-5">
                    <i class="fas fa-folder-open fa-3x mb-3 opacity-25"></i>
                    <p class="mb-0">This folder is empty</p>
                </td>
            `;
            tbody.appendChild(tr);
        }
    },

    updateBreadcrumb(path) {
        const breadcrumbContainer = document.getElementById("file-breadcrumb");
        if(!breadcrumbContainer) return;
        
        // Clear breadcrumb (keep only home)
        breadcrumbContainer.innerHTML = `
            <li class="breadcrumb-item">
                <a href="#" class="text-primary text-decoration-none" style="cursor: pointer;">
                    <i class="fas fa-home"></i> My Computer
                </a>
            </li>
        `;
        
        // Add event listener for home button
        const homeLink = breadcrumbContainer.querySelector('a');
        if(homeLink) {
            homeLink.addEventListener('click', (e) => {
                e.preventDefault();
                FileManagerFeature.getDrives();
            });
        }
        
        // If no path or empty, we're at root (showing drives)
        if(!path || path === "") {
            return;
        }
        
        // Split path into parts
        // Windows path format: C:\folder1\folder2\folder3
        // Handle both "C:" and "C:\" formats - normalize for display
        let normalizedPath = path;
        
        // Remove trailing backslash for non-root paths (e.g., "D:\folder\" -> "D:\folder")
        // But keep it for root drives (e.g., "D:\" stays as "D:\")
        if(normalizedPath.endsWith('\\') && normalizedPath.length > 3) {
            normalizedPath = normalizedPath.slice(0, -1);
        }
        
        const parts = normalizedPath.split('\\').filter(p => p);
        
        // If we only have drive letter, make sure it's displayed correctly
        if(parts.length === 0) return;
        
        // Build clickable breadcrumb
        let accumulatedPath = "";
        parts.forEach((part, index) => {
            const li = document.createElement("li");
            
            // Build path up to this part
            if(index === 0) {
                // Drive letter (e.g., "C:")
                accumulatedPath = part;
                // Ensure drive letter has proper format
                if(!accumulatedPath.endsWith(':')) {
                    accumulatedPath += ':';
                }
            } else {
                accumulatedPath += "\\" + part;
            }
            
            const pathToNavigate = accumulatedPath; // Capture for closure
            
            // Determine if this is the last item
            const isLast = (index === parts.length - 1);
            
            // Special case: if we're at drive root and have only 1 part, make it clickable
            // This allows refreshing the drive view
            const isDriveRoot = (parts.length === 1 && index === 0);
            const isDrive = (index === 0); // First element is always a drive
            
            if(isLast && !isDriveRoot) {
                // Last item (not drive root) is active and not clickable
                li.className = "breadcrumb-item active";
                li.setAttribute("aria-current", "page");
                
                // Add icon for drives even when active
                if(isDrive) {
                    const icon = document.createElement("i");
                    icon.className = "fas fa-hdd me-1";
                    li.appendChild(icon);
                }
                
                const textNode = document.createTextNode(part);
                li.appendChild(textNode);
            } else {
                // Clickable items (including drive root)
                li.className = "breadcrumb-item";
                const link = document.createElement("a");
                link.href = "#";
                link.className = "text-primary text-decoration-none";
                link.style.cursor = "pointer";
                
                // Add icon for drives
                if(isDrive) {
                    const icon = document.createElement("i");
                    icon.className = "fas fa-hdd me-1";
                    link.appendChild(icon);
                }
                
                const textNode = document.createTextNode(part);
                link.appendChild(textNode);
                
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Breadcrumb clicked:', pathToNavigate);
                    try {
                        FileManagerFeature.openFolder(pathToNavigate);
                    } catch (error) {
                        console.error('Error opening folder:', error);
                        UIManager.showToast('Error navigating to folder', 'error');
                    }
                });
                li.appendChild(link);
            }
            
            breadcrumbContainer.appendChild(li);
        });
    },

    saveDownloadedFile(packet) {
        const payload = packet.payload || packet;
        const { fileName, data } = payload; // data là base64
        const link = document.createElement('a');
        link.href = 'data:application/octet-stream;base64,' + data;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        UIManager.showToast(`Đã tải xuống: ${fileName}`, "success");
    },

    renameFile(filePath, newName) {
        const payload = { path: filePath, newName: newName };
        SocketService.send("RENAME_FILE", JSON.stringify(payload));
        setTimeout(() => this.openFolder(currentPath), 500);
    },

    renameFolder(folderPath, newName) {
        const payload = { path: folderPath, newName: newName };
        SocketService.send("RENAME_FOLDER", JSON.stringify(payload));
        setTimeout(() => this.openFolder(currentPath), 500);
    },

    deleteFolder(folderPath) {
        SocketService.send("DELETE_FOLDER", folderPath);
        setTimeout(() => {
            if (!currentPath || currentPath === "") {
                this.getDrives();
            } else {
                this.openFolder(currentPath);
            }
        }, 500);
    },

    createFolder() {
        if (!currentPath || currentPath === "") {
            UIManager.showToast("Please navigate to a folder first!", "warning");
            return;
        }
        
        const folderName = prompt("Enter new folder name:");
        if (folderName && folderName.trim() !== "") {
            const payload = {
                path: currentPath,
                name: folderName.trim()
            };
            
            SocketService.send("CREATE_FOLDER", JSON.stringify(payload));
            UIManager.showToast(`Creating folder: ${folderName}...`, "info");
            
            // Refresh the current directory after a short delay
            setTimeout(() => this.openFolder(currentPath), 800);
        }
    },

    uploadFile(files) {
        if (!files || files.length === 0) return;
        
        const file = files[0];
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const base64String = e.target.result.split(',')[1];
            const payload = {
                path: currentPath || "C:\\", // fallback to C: if no path selected
                fileName: file.name,
                data: base64String
            };
            
            UIManager.showToast(`Uploading ${file.name}...`, "info");
            SocketService.send("UPLOAD_FILE", JSON.stringify(payload));
            
            setTimeout(() => this.openFolder(currentPath || "C:\\"), 1000);
        };
        
        reader.onerror = () => {
            UIManager.showToast("Error reading file", "error");
        };
        
        reader.readAsDataURL(file);
    }
};