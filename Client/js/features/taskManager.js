import { SocketService } from '../services/socket.js';
import { UIManager } from '../utils/ui.js';

let currentMode = "apps"; // apps | processes

export const TaskManagerFeature = {
    init() {
        // Handle APP_LIST event
        SocketService.on('APP_LIST', (data) => {
            console.log("APP_LIST received:", data);
            if(currentMode === "apps") {
                const dataList = data.payload || data;
                this.render(dataList);
            }
        });

        // Handle PROCESS_LIST event
        SocketService.on('PROCESS_LIST', (data) => {
            console.log("PROCESS_LIST received:", data);
            if(currentMode === "processes") {
                const dataList = data.payload || data;
                this.render(dataList);
            }
        });

        // Setup button click handlers
        document.getElementById('btn-get-apps')?.addEventListener('click', () => {
            currentMode = "apps";
            console.log("Requesting GET_APPS");
            SocketService.send("GET_APPS");
        });

        document.getElementById('btn-get-processes')?.addEventListener('click', () => {
            currentMode = "processes";
            console.log("Requesting GET_PROCESS");
            SocketService.send("GET_PROCESS");
        });
    },

    render(dataList) {
        if (!Array.isArray(dataList)) {
            console.warn("Invalid data list:", dataList);
            return;
        }

        const tbody = document.querySelector("#procTable tbody");
        if(!tbody) {
            console.error("procTable tbody not found");
            return;
        }
        
        tbody.innerHTML = "";
        
        if (dataList.length === 0) {
            const tr = document.createElement("tr");
            tr.innerHTML = '<td colspan="4" class="text-center">No data found</td>';
            tbody.appendChild(tr);
            return;
        }
        
        dataList.forEach((item) => {
            const tr = document.createElement("tr");

            // ID
            const tdId = document.createElement("td");
            tdId.innerHTML = `<span class="badge bg-secondary">${item.id}</span>`;
            
            // Name (Safe)
            const tdName = document.createElement("td");
            tdName.className = "fw-bold";
            tdName.textContent = item.title || item.name || "Unknown";

            // Memory
            const tdMem = document.createElement("td");
            tdMem.textContent = item.memory || "N/A";

            // Action
            const tdAction = document.createElement("td");
            const btnKill = document.createElement("button");
            btnKill.className = "btn btn-danger btn-sm";
            btnKill.innerHTML = '<i class="fas fa-trash"></i> Kill';
            btnKill.onclick = () => {
                if(confirm(`Kill process ID ${item.id}?`)) {
                    SocketService.send('KILL', item.id.toString());
                }
            };
            tdAction.appendChild(btnKill);

            tr.append(tdId, tdName, tdMem, tdAction);
            tbody.appendChild(tr);
        });
    }
};