using System;
using System.Collections.Generic;
using Fleck;
using Newtonsoft.Json;

namespace RemoteControlServer.Core
{
    // SocketManager: quản lý danh sách kết nối WebSocket và các hàm gửi dữ liệu chung
    public static class SocketManager
    {
        private static readonly List<IWebSocketConnection> _allSockets = new List<IWebSocketConnection>();
        private static readonly object _sendLock = new object();

        public static void Add(IWebSocketConnection socket)
        {
            lock (_allSockets)
            {
                if (!_allSockets.Contains(socket)) _allSockets.Add(socket);
            }
        }

        public static void Remove(IWebSocketConnection socket)
        {
            lock (_allSockets)
            {
                if (_allSockets.Contains(socket)) _allSockets.Remove(socket);
            }
        }

        public static IReadOnlyList<IWebSocketConnection> All => _allSockets.AsReadOnly();

        public static void SafeSend(IWebSocketConnection socket, string message)
        {
            lock (_sendLock)
            {
                if (socket != null && socket.IsAvailable) socket.Send(message);
            }
        }

        public static void SafeSend(IWebSocketConnection socket, byte[] data)
        {
            lock (_sendLock)
            {
                if (socket != null && socket.IsAvailable) socket.Send(data);
            }
        }

        public static void BroadcastJson(string type, object payload)
        {
            var json = JsonConvert.SerializeObject(new { type = type, payload = payload });
            lock (_allSockets)
            {
                foreach (var s in _allSockets.ToArray()) SafeSend(s, json);
            }
        }

        public static void SendJson(IWebSocketConnection socket, string type, object payload)
        {
            var json = JsonConvert.SerializeObject(new { type = type, payload = payload });
            SafeSend(socket, json);
        }

        public static void BroadcastBinary(byte header, byte[] data)
        {
            if (data == null) return;
            byte[] packet = new byte[data.Length + 1];
            packet[0] = header;
            Buffer.BlockCopy(data, 0, packet, 1, data.Length);
            lock (_allSockets)
            {
                foreach (var s in _allSockets.ToArray()) SafeSend(s, packet);
            }
        }
    }
}
