using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using RemoteControlServer.Helpers;

namespace RemoteControlServer.Core
{
    // StreamManager: điều khiển luồng stream màn hình (screen) và webcam
    public static class StreamManager
    {
        private static bool _isStreaming = false;
        private static byte[] _lastFrame = null;

        public static bool IsStreaming => _isStreaming;

        public static void StartStreaming()
        {
            _isStreaming = true;
        }

        public static void StopStreaming()
        {
            _isStreaming = false;
        }

        // Bắt đầu vòng lặp Stream nếu chưa chạy
        public static void StartScreenLoop()
        {
            Task.Run(() =>
            {
                while (true)
                {
                    if (_isStreaming && SocketManager.All.Count > 0)
                    {
                        try
                        {
                            var currentFrame = SystemHelper.GetScreenShot(85L);
                            if (currentFrame != null)
                            {
                                if (_lastFrame != null && currentFrame.Length == _lastFrame.Length && currentFrame.SequenceEqual(_lastFrame))
                                {
                                    Thread.Sleep(50);
                                    continue;
                                }
                                _lastFrame = currentFrame;
                                SocketManager.BroadcastBinary(0x01, currentFrame);
                            }
                        }
                        catch (Exception ex) { Console.WriteLine("Lỗi Stream: " + ex.Message); }

                        Thread.Sleep(30);
                    }
                    else
                    {
                        Thread.Sleep(500);
                        _lastFrame = null;
                    }
                }
            });
        }
    }
}
