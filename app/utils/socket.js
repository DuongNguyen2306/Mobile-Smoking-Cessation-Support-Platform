import io from "socket.io-client"

const SOCKET_URL = "http://10.87.64.155:5000"

class SocketService {
  socket = null
  userStatusMap = new Map()
  reconnectAttempts = 0
  maxReconnectAttempts = 10
  isConnecting = false
  currentUserId = null
  listeners = new Map() // Track listeners for safe cleanup

  connect(userId) {
    if (this.isConnecting) {
      console.log("🔄 Already connecting, please wait...")
      return this.socket
    }

    if (this.socket && this.socket.connected && this.currentUserId === userId) {
      console.log("✅ Socket already connected for user:", userId)
      return this.socket
    }

    // Disconnect existing connection if different user
    if (this.socket && this.currentUserId !== userId) {
      console.log("🔄 Switching user, disconnecting old connection")
      this.disconnect()
    }

    this.isConnecting = true
    this.currentUserId = userId
    console.log("🔌 Connecting to socket server:", SOCKET_URL, "for user:", userId)

    this.socket = io(SOCKET_URL, {
      query: {
        userId,
        debug: "true",
        platform: "mobile-web",
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      forceNew: true,
      upgrade: true,
    })

    this.socket.on("connect", () => {
      console.log("🎉 Socket connected successfully!")
      console.log("📊 Connection details:", {
        userId,
        socketId: this.socket.id,
        transport: this.socket.io.engine.transport.name,
        upgraded: this.socket.io.engine.upgraded,
      })

      this.isConnecting = false
      this.reconnectAttempts = 0

      // Emit user status immediately
      this.emit("userStatus", {
        userId,
        online: true,
        timestamp: new Date().toISOString(),
        platform: "mobile-web",
      })

      console.log("✅ User status emitted for:", userId)
    })

    this.socket.on("connect_error", (error) => {
      console.log("❌ Socket connection error:", {
        userId,
        error: error.message,
        type: error.type,
        description: error.description,
        attempt: this.reconnectAttempts + 1,
      })
      this.isConnecting = false
      this.reconnectAttempts++
    })

    this.socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Socket reconnected!", { userId, attemptNumber })
      this.emit("userStatus", {
        userId,
        online: true,
        timestamp: new Date().toISOString(),
        platform: "mobile-web",
      })
    })

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", { userId, reason })
      this.isConnecting = false

      if (reason !== "io client disconnect") {
        this.emit("userStatus", {
          userId,
          online: false,
          timestamp: new Date().toISOString(),
          platform: "mobile-web",
        })
      }
    })

    // Default message events
    this.socket.on("newMessage", (data) => {
      console.log("📨 Received newMessage event:", data)
    })

    this.socket.on("typing", (data) => {
      console.log("⌨️ Received typing event:", data)
    })

    this.socket.on("userStatus", (data) => {
      console.log("👤 Received userStatus event:", data)
    })

    // User status events
    this.socket.on("userStatusUpdate", (data) => {
      console.log("📡 Received userStatusUpdate:", data)
      this.userStatusMap.set(data.userId, {
        online: data.online,
        timestamp: data.timestamp,
        lastSeen: data.lastSeen,
      })
    })

    this.socket.on("onlineUsers", (users) => {
      console.log("👥 Received onlineUsers:", users.length, "users online")
      users.forEach((user) => {
        this.userStatusMap.set(user.userId, {
          online: true,
          timestamp: user.timestamp || new Date().toISOString(),
          lastSeen: user.lastSeen,
        })
      })
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      const userId = this.currentUserId
      console.log("🔌 Manually disconnecting socket for user:", userId)

      try {
        if (userId) {
          this.emit("userStatus", {
            userId,
            online: false,
            timestamp: new Date().toISOString(),
            platform: "mobile-web",
          })
        }

        // Clear all tracked listeners
        this.listeners.clear()

        // Remove all listeners before disconnect
        this.socket.removeAllListeners()
        this.socket.disconnect()
      } catch (error) {
        console.log("⚠️ Error during disconnect:", error)
      } finally {
        this.socket = null
        this.currentUserId = null
        this.isConnecting = false
        console.log("✅ Socket disconnected for user:", userId)
      }
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      const payload = {
        ...data,
        timestamp: data.timestamp || new Date().toISOString(),
        platform: "mobile-web",
      }
      console.log(`📤 Emitting event: ${event}`, payload)
      this.socket.emit(event, payload)
      return true
    } else {
      console.log(`❌ Cannot emit ${event}: Socket not connected`, {
        hasSocket: !!this.socket,
        isConnected: this.socket?.connected,
        isConnecting: this.isConnecting,
        currentUserId: this.currentUserId,
        data,
      })
      return false
    }
  }

  on(event, callback) {
    if (this.socket) {
      console.log(`👂 Registering listener for event: ${event}`)

      // Track the listener for cleanup
      if (!this.listeners.has(event)) {
        this.listeners.set(event, new Set())
      }
      this.listeners.get(event).add(callback)

      this.socket.on(event, (data) => {
        console.log(`📥 Received event: ${event}`, data)
        try {
          callback(data)
        } catch (error) {
          console.log(`❌ Error in ${event} callback:`, error)
        }
      })
    } else {
      console.log(`❌ Cannot register listener for ${event}: Socket not initialized`)
    }
  }

  off(event, callback) {
    if (this.socket) {
      try {
        console.log(`🔇 Removing listener for event: ${event}`)

        // Remove from tracked listeners
        if (this.listeners.has(event)) {
          this.listeners.get(event).delete(callback)
          if (this.listeners.get(event).size === 0) {
            this.listeners.delete(event)
          }
        }

        if (callback) {
          this.socket.off(event, callback)
        } else {
          this.socket.removeAllListeners(event)
          this.listeners.delete(event)
        }
      } catch (error) {
        console.log(`⚠️ Error removing listener for ${event}:`, error)
      }
    }
  }

  // Specific methods for messaging
  sendMessage(messageData) {
    console.log("📤 Sending message via socket:", messageData)
    return this.emit("newMessage", messageData)
  }

  joinRoom(roomId) {
    console.log("🏠 Joining room:", roomId)
    return this.emit("joinRoom", { roomId })
  }

  leaveRoom(roomId) {
    console.log("🚪 Leaving room:", roomId)
    return this.emit("leaveRoom", { roomId })
  }

  sendTyping(receiverId, isTyping) {
    return this.emit("typing", {
      receiverId,
      isTyping,
      userId: this.currentUserId,
    })
  }

  // Status methods
  getUserStatus(userId) {
    const status = this.userStatusMap.get(userId)
    return (
      status || {
        online: false,
        timestamp: null,
        lastSeen: null,
      }
    )
  }

  updateUserStatus(userId, status) {
    this.userStatusMap.set(userId, status)
  }

  getAllOnlineUsers() {
    const onlineUsers = []
    this.userStatusMap.forEach((status, userId) => {
      if (status.online) {
        onlineUsers.push({ userId, ...status })
      }
    })
    return onlineUsers
  }

  isConnected() {
    return this.socket && this.socket.connected
  }

  forceReconnect(userId) {
    console.log("🔄 Force reconnecting for user:", userId)
    if (this.socket) {
      this.socket.disconnect()
    }
    setTimeout(() => {
      this.connect(userId)
    }, 1000)
  }

  getConnectionInfo() {
    if (!this.socket) return { status: "no-socket" }

    return {
      status: this.socket.connected ? "connected" : "disconnected",
      transport: this.socket.io?.engine?.transport?.name,
      upgraded: this.socket.io?.engine?.upgraded,
      socketId: this.socket.id,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      currentUserId: this.currentUserId,
    }
  }
}

// Create and export singleton instance
export const socketService = new SocketService()

// Also export as default for compatibility
export default socketService
