# Testing Checklist - Screen Control Feature

## Pre-Testing Requirements

- [ ] Server is running (Server.exe or via Visual Studio)
- [ ] Client is accessible via browser (e.g., http://localhost:8080 or via file://)
- [ ] WebSocket connection is established
- [ ] User is authenticated

---

## Test Suite

### 1. UI Components ✓

#### Test 1.1: Control Toggle Visibility
- [ ] Open Screen Monitor tab
- [ ] Verify "Control" toggle switch is visible in header
- [ ] Switch should be positioned to the left of Start/Stop buttons

#### Test 1.2: Control Toggle Functionality
- [ ] Click the toggle switch
- [ ] Toast notification "Đã BẬT chế độ điều khiển!" appears
- [ ] Click again to disable
- [ ] Toast notification "Đã TẮT chế độ điều khiển!" appears

#### Test 1.3: Cursor Changes
- [ ] Toggle control ON
- [ ] Hover over live screen image
- [ ] Cursor should change to **crosshair**
- [ ] Toggle control OFF
- [ ] Cursor should return to **default**

---

### 2. Mouse Control ✓

#### Test 2.1: Mouse Movement
- [ ] Start stream
- [ ] Toggle control ON
- [ ] Move mouse over live screen slowly
- [ ] Verify remote cursor moves smoothly
- [ ] Check browser console for "MOUSE_MOVE" commands (throttled to 50ms)

#### Test 2.2: Left Click
- [ ] Toggle control ON
- [ ] Click left mouse button on live screen
- [ ] Remote computer should register left click
- [ ] Try: Open a folder, click a button, etc.

#### Test 2.3: Right Click
- [ ] Right-click on live screen
- [ ] Browser context menu should NOT appear
- [ ] Remote computer should show context menu
- [ ] Verify right-click actions work (e.g., open context menu on desktop)

#### Test 2.4: Middle Click (Optional)
- [ ] Middle-click on live screen
- [ ] Remote computer should register middle click
- [ ] Try: Middle-click on a link in browser

#### Test 2.5: Click Coordinates Accuracy
- [ ] Click on a specific icon on remote desktop
- [ ] Verify click lands exactly where intended
- [ ] Try corners, edges, and center of screen

---

### 3. Keyboard Control ✓

#### Test 3.1: Text Input
- [ ] Toggle control ON
- [ ] Open Notepad on remote computer
- [ ] Type: "Hello World 123 !@#"
- [ ] Verify all characters appear correctly

#### Test 3.2: Special Keys
- [ ] Press **Enter** → Should create new line
- [ ] Press **Backspace** → Should delete character
- [ ] Press **Tab** → Should indent or move focus
- [ ] Press **Escape** → Should close dialogs or cancel

#### Test 3.3: Arrow Keys
- [ ] Open a text editor with multiple lines
- [ ] Press **Arrow Up** → Cursor moves up
- [ ] Press **Arrow Down** → Cursor moves down
- [ ] Press **Arrow Left** → Cursor moves left
- [ ] Press **Arrow Right** → Cursor moves right

#### Test 3.4: Function Keys
- [ ] Press **F5** in browser (should NOT refresh client page)
- [ ] Remote browser/app should receive F5
- [ ] Verify client page did NOT refresh (preventDefault working)

#### Test 3.5: Keyboard Focus
- [ ] Ensure keyboard input only works when control is ON
- [ ] Toggle control OFF
- [ ] Type something → Should NOT control remote
- [ ] Client should not send KEY_PRESS commands

---

### 4. Performance & Throttling ✓

#### Test 4.1: Mouse Movement Throttling
- [ ] Open browser DevTools Console
- [ ] Toggle control ON
- [ ] Move mouse rapidly over live screen
- [ ] Check console logs
- [ ] MOUSE_MOVE commands should be throttled (~50ms apart)
- [ ] No excessive command spam

#### Test 4.2: No Lag
- [ ] Move mouse on live screen
- [ ] Remote cursor should follow with minimal delay
- [ ] Test on local network first
- [ ] Test on remote network (if applicable)

---

### 5. Edge Cases ✓

#### Test 5.1: Control Without Stream
- [ ] Stop the stream
- [ ] Try to toggle control ON
- [ ] Control should still toggle, but no effect (no stream image)
- [ ] No errors in console

#### Test 5.2: Stream Start/Stop with Control ON
- [ ] Toggle control ON
- [ ] Stop stream
- [ ] Start stream again
- [ ] Control should still work
- [ ] Mouse and keyboard events should re-attach

#### Test 5.3: Multiple Rapid Toggles
- [ ] Toggle control ON/OFF rapidly 10 times
- [ ] No errors in console
- [ ] Event listeners should attach/detach correctly
- [ ] No duplicate event handlers

#### Test 5.4: Disconnect and Reconnect
- [ ] Toggle control ON
- [ ] Disconnect from server
- [ ] Reconnect
- [ ] Control should be OFF by default
- [ ] Toggle ON again and verify it works

---

### 6. Browser Compatibility ✓

#### Test 6.1: Chrome/Edge
- [ ] All features work as expected

#### Test 6.2: Firefox
- [ ] All features work as expected
- [ ] Context menu preventDefault works

#### Test 6.3: Safari (Mac)
- [ ] Test if available

---

### 7. Security ✓

#### Test 7.1: Authentication Required
- [ ] Try to access control before authentication
- [ ] Should not be possible (UI disabled)

#### Test 7.2: Control Opt-In
- [ ] Control is OFF by default
- [ ] User must explicitly toggle it ON
- [ ] Clear visual indication when control is active

---

## Console Checks

### Expected Console Output (when control is ON):

```
Sending command: MOUSE_MOVE with param: {"x":0.523,"y":0.387}
Sending command: MOUSE_CLICK with param: {"btn":"left","action":"down"}
Sending command: MOUSE_CLICK with param: {"btn":"left","action":"up"}
Sending command: KEY_PRESS with param: H
Sending command: KEY_PRESS with param: Enter
```

### No Errors Expected:
- ❌ "Cannot read property 'addEventListener' of null"
- ❌ "SocketService is undefined"
- ❌ "isControlEnabled is not defined"

---

## Known Limitations

1. **Platform**: Server must run on Windows (uses Win32 API)
2. **Throttling**: Mouse movement is throttled to 50ms (20 FPS max)
3. **Special Keys**: Some OS-level shortcuts may not work (e.g., Win+D)
4. **Keyboard Layout**: Uses server's keyboard layout

---

## Troubleshooting

### Problem: Mouse doesn't move on remote
- ✅ Check: Control toggle is ON
- ✅ Check: Stream is running
- ✅ Check: Console shows "MOUSE_MOVE" commands
- ✅ Check: Server received commands (check server console)

### Problem: Keyboard doesn't work
- ✅ Check: Control toggle is ON
- ✅ Check: Console shows "KEY_PRESS" commands
- ✅ Check: Page focus is on browser (not DevTools)
- ✅ Check: Server has SendKeys working

### Problem: Cursor is not crosshair
- ✅ Check: CSS loaded correctly
- ✅ Check: Control toggle is ON
- ✅ Check: #live-screen element has class "control-active"

---

## Sign-Off

- [ ] All critical tests passed
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Ready for production

**Tested By**: _____________  
**Date**: _____________  
**Environment**: _____________  
**Status**: ✅ PASS / ❌ FAIL
