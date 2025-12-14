# Screen Control Feature - Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT SIDE (Browser)                          │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────┐
    │                    index.html (UI Layer)                     │
    │                                                              │
    │  ┌────────────────────────────────────────────────────┐    │
    │  │  Screen Monitor Tab                                │    │
    │  │  ┌──────────────────────────────────────────────┐ │    │
    │  │  │  Header: [Control Toggle] [Start] [Stop]    │ │    │
    │  │  │          ☑️ Control  ▶ Start  ⏹ Stop        │ │    │
    │  │  └──────────────────────────────────────────────┘ │    │
    │  │  ┌──────────────────────────────────────────────┐ │    │
    │  │  │  <img id="live-screen">                      │ │    │
    │  │  │  [Stream Image with crosshair cursor]        │ │    │
    │  │  │  • mousemove   → track position              │ │    │
    │  │  │  • mousedown   → capture clicks              │ │    │
    │  │  │  • mouseup     → capture releases            │ │    │
    │  │  │  • contextmenu → prevent default             │ │    │
    │  │  └──────────────────────────────────────────────┘ │    │
    │  └────────────────────────────────────────────────────┘    │
    └──────────────────────────────────────────────────────────────┘
                              │
                              ↓
    ┌──────────────────────────────────────────────────────────────┐
    │              monitor.js (Feature Module)                     │
    │                                                              │
    │  Variables:                                                  │
    │    • isControlEnabled = false                                │
    │    • lastMoveTime = 0                                        │
    │                                                              │
    │  Methods:                                                    │
    │    • init()                    → Initialize all features     │
    │    • setupControlToggle()      → Attach switch listener     │
    │    • toggleControl(enabled)    → Enable/disable control     │
    │    • setupMouseControl()       → Attach mouse listeners     │
    │    • handleRemoteKey(e)        → Handle keyboard input      │
    │                                                              │
    │  Event Flow:                                                 │
    │    1. User toggles switch                                    │
    │    2. toggleControl(true) called                            │
    │    3. Attach event listeners                                │
    │    4. Change cursor to crosshair                            │
    │    5. Capture mouse/keyboard events                         │
    │    6. Calculate normalized coordinates                       │
    │    7. Send commands via SocketService                       │
    └──────────────────────────────────────────────────────────────┘
                              │
                              ↓
    ┌──────────────────────────────────────────────────────────────┐
    │              socket.js (Communication Layer)                 │
    │                                                              │
    │  send(command, param):                                       │
    │    → Creates JSON packet                                     │
    │    → Sends via WebSocket                                     │
    │                                                              │
    │  Example packets:                                            │
    │    • MOUSE_MOVE: {"x": 0.5, "y": 0.3}                       │
    │    • MOUSE_CLICK: {"btn": "left", "action": "down"}         │
    │    • KEY_PRESS: "Enter"                                      │
    └──────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket
                              │ ws://ip:port
                              ↓

┌─────────────────────────────────────────────────────────────────────────┐
│                          SERVER SIDE (C# .NET)                          │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────┐
    │                 ServerCore.cs (Entry Point)                  │
    │                                                              │
    │  • WebSocket Server listening on port 8181                   │
    │  • Receives JSON packets from client                         │
    │  • Routes to CommandRouter                                   │
    └──────────────────────────────────────────────────────────────┘
                              │
                              ↓
    ┌──────────────────────────────────────────────────────────────┐
    │            CommandRouter.cs (Command Dispatcher)             │
    │                                                              │
    │  switch (packet.command) {                                   │
    │    case "MOUSE_MOVE":                                        │
    │      → Parse {x, y}                                          │
    │      → Call SystemHelper.SetCursorPosition(x, y)            │
    │      → No logging (high frequency)                           │
    │                                                              │
    │    case "MOUSE_CLICK":                                       │
    │      → Parse {btn, action}                                   │
    │      → Call SystemHelper.MouseClick(btn, action)            │
    │                                                              │
    │    case "KEY_PRESS":                                         │
    │      → Parse key string                                      │
    │      → Call SystemHelper.SimulateKeyPress(key)              │
    │  }                                                           │
    └──────────────────────────────────────────────────────────────┘
                              │
                              ↓
    ┌──────────────────────────────────────────────────────────────┐
    │           SystemHelper.cs (Win32 API Wrapper)                │
    │                                                              │
    │  ┌────────────────────────────────────────────────────────┐ │
    │  │  SetCursorPosition(double xPercent, double yPercent)   │ │
    │  │  • Convert 0-1 coordinates to 0-65535                  │ │
    │  │  • Call mouse_event() with ABSOLUTE flag               │ │
    │  │  • int dx = (int)(xPercent * 65535);                   │ │
    │  │  • int dy = (int)(yPercent * 65535);                   │ │
    │  │  • mouse_event(MOVE|ABSOLUTE, dx, dy, 0, 0);          │ │
    │  └────────────────────────────────────────────────────────┘ │
    │                                                              │
    │  ┌────────────────────────────────────────────────────────┐ │
    │  │  MouseClick(string button, string action)              │ │
    │  │  • Determine flag based on button + action             │ │
    │  │  • left+down   → MOUSEEVENTF_LEFTDOWN                  │ │
    │  │  • left+up     → MOUSEEVENTF_LEFTUP                    │ │
    │  │  • right+down  → MOUSEEVENTF_RIGHTDOWN                 │ │
    │  │  • mouse_event(flag, 0, 0, 0, 0);                      │ │
    │  └────────────────────────────────────────────────────────┘ │
    │                                                              │
    │  ┌────────────────────────────────────────────────────────┐ │
    │  │  SimulateKeyPress(string key)                          │ │
    │  │  • Map key string to SendKeys format                   │ │
    │  │  • "Enter"    → SendKeys.SendWait("{ENTER}");          │ │
    │  │  • "ArrowUp"  → SendKeys.SendWait("{UP}");             │ │
    │  │  • Single char → SendKeys.SendWait(key);               │ │
    │  └────────────────────────────────────────────────────────┘ │
    │                                                              │
    │  Win32 API Imports:                                          │
    │    [DllImport("user32.dll")]                                │
    │    static extern void mouse_event(...)                      │
    │                                                              │
    │    System.Windows.Forms.SendKeys                            │
    └──────────────────────────────────────────────────────────────┘
                              │
                              ↓
    ┌──────────────────────────────────────────────────────────────┐
    │               Windows Operating System                       │
    │                                                              │
    │  • Mouse cursor moves                                        │
    │  • Mouse buttons click                                       │
    │  • Keyboard keys pressed                                     │
    │  • Applications receive input events                         │
    └──────────────────────────────────────────────────────────────┘


════════════════════════════════════════════════════════════════════════════

                           DATA FLOW EXAMPLE

════════════════════════════════════════════════════════════════════════════

User Action: Click on remote desktop icon at position (50%, 30%)

[1] Browser (UI)
    • User clicks live-screen image
    • Event: mousedown at (clientX=400, clientY=240)
    • Image rect: width=800, height=800
    • Calculate: xPercent = 400/800 = 0.5
    • Calculate: yPercent = 240/800 = 0.3

[2] monitor.js
    • Detect: isControlEnabled = true
    • Create: { btn: "left", action: "down" }
    • Call: SocketService.send("MOUSE_CLICK", JSON.stringify(...))

[3] socket.js
    • Build: { command: "MOUSE_CLICK", param: "{\"btn\":\"left\",\"action\":\"down\"}" }
    • Send via: WebSocket.send(JSON.stringify(packet))

[4] Network (WebSocket)
    • Transport JSON packet over TCP connection
    • From: client IP → Server IP:8181

[5] ServerCore.cs
    • Receive: JSON string
    • Parse: WebPacket object
    • Route: CommandRouter.ProcessCommand(socket, packet)

[6] CommandRouter.cs
    • Switch: case "MOUSE_CLICK"
    • Parse: dynamic clickInfo = JsonConvert.DeserializeObject(param)
    • Extract: button = "left", action = "down"
    • Call: SystemHelper.MouseClick("left", "down")

[7] SystemHelper.cs
    • Evaluate: button == "left" && action == "down"
    • Set: flags = MOUSEEVENTF_LEFTDOWN (0x0002)
    • Invoke: mouse_event(flags, 0, 0, 0, 0)

[8] Windows OS
    • Execute: Win32 mouse_event function
    • Result: Left mouse button pressed at current cursor position
    • App: Desktop icon receives click event

════════════════════════════════════════════════════════════════════════════

Total Latency (Typical):
  • Mouse move:   ~10-50ms  (local network)
  • Mouse click:  ~10-50ms  (local network)
  • Keyboard:     ~10-50ms  (local network)
  
Over Internet:
  • Add RTT (Round Trip Time): typically 50-300ms

════════════════════════════════════════════════════════════════════════════
```
