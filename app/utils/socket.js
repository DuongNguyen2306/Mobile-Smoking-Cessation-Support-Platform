import io from 'socket.io-client';

const SOCKET_URL = 'http://192.168.0.198:5000'; // Replace with your actual server URL

class SocketService {
  socket = null;

  connect(userId) {
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected:', this.socket.id);
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      query: { userId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to socket server', this.socket.id);
    });

    this.socket.on('connect_error', (error) => {
      console.log('Socket connection error:', error);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('Socket disconnected');
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      console.log(`Emitting event: ${event}`, data);
      this.socket.emit(event, data);
    } else {
      console.log(`Cannot emit ${event}: Socket is not connected`);
    }
  }

  on(event, callback) {
    if (this.socket) {
      console.log(`Listening for event: ${event}`);
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      console.log(`Removing listener for event: ${event}`);
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();