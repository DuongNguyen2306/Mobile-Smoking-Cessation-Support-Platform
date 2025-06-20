"use client"

import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { fetchConversations, fetchMessages, fetchUsers, getUnreadCount, testConnection } from "../services/api"
import { socketService } from "../utils/socket"
import { formatMessageTime, isUserOnline } from "../utils/timeUtils"

const __DEV__ = process.env.NODE_ENV === "development"

export default function ChatScreen() {
  const router = useRouter()
  const [conversations, setConversations] = useState([])
  const [filteredConversations, setFilteredConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [myId, setMyId] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState(new Map())
  const [connectionInfo, setConnectionInfo] = useState({ status: "disconnected" })
  const [unreadCount, setUnreadCount] = useState(0)
  const [searchVisible, setSearchVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchAnimation] = useState(new Animated.Value(0))
  const [debugInfo, setDebugInfo] = useState({
    apiConnected: false,
    socketConnected: false,
    conversationsFetched: false,
    usersFetched: false,
    authToken: false,
    rawConversationsData: null,
    rawUsersData: null,
  })

  const checkAuthAndLoadData = useCallback(async () => {
    console.log("🔄 Starting data load process...")
    setDebugInfo((prev) => ({
      ...prev,
      apiConnected: false,
      conversationsFetched: false,
      usersFetched: false,
      rawConversationsData: null,
      rawUsersData: null,
    }))

    try {
      const token = await AsyncStorage.getItem("token")
      const user = await AsyncStorage.getItem("user")
      console.log("🔑 Token check:", token ? "✅ Found" : "❌ Missing")
      console.log("👤 User data:", user ? "✅ Found" : "❌ Missing")

      setDebugInfo((prev) => ({ ...prev, authToken: !!token }))

      if (!token || !user) {
        console.log("❌ No token or user data found, redirecting to login")
        Alert.alert("Lỗi", "Vui lòng đăng nhập lại", [
          { text: "OK", onPress: () => router.replace("/(auth)/login") },
        ])
        return
      }

      const parsedUser = JSON.parse(user)
      setMyId(parsedUser.id)
      console.log("👤 Current user ID:", parsedUser.id)

      console.log("🔍 Testing API connection...")
      const connectionTest = await testConnection()
      setDebugInfo((prev) => ({ ...prev, apiConnected: connectionTest}))

      if (!connectionTest) {
        console.log("⚠️ API connection test failed")
        Alert.alert("Lỗi kết nối", "Không thể kết nối đến server. Vui lòng kiểm tra mạng.")
        return
      }

      let conversationsData = []
      let usersData = []

      console.log("📡 Fetching conversations from /chat/conversations...")
      try {
        const convRes = await fetchConversations()
        console.log("✅ Raw conversations response:", JSON.stringify(convRes.data, null, 2))
        setDebugInfo((prev) => ({ ...prev, rawConversationsData: convRes.data }))

        if (convRes.data) {
          if (convRes.data.data && Array.isArray(convRes.data.data)) {
            conversationsData = convRes.data.data
          } else if (Array.isArray(convRes.data)) {
            conversationsData = convRes.data
          } else if (convRes.data.conversations && Array.isArray(convRes.data.conversations)) {
            conversationsData = convRes.data.conversations
          } else {
            console.log("⚠️ Unexpected conversations response structure:", convRes.data)
            conversationsData = []
          }
        }
        console.log("💬 Conversations data:", conversationsData.length, "conversations found")
        setDebugInfo((prev) => ({ ...prev, conversationsFetched: true }))
      } catch (convError) {
        console.log("❌ Error fetching conversations:", convError.message)
        setDebugInfo((prev) => ({ ...prev, conversationsFetched: false }))
      }

      console.log("📡 Fetching users from /chat/users...")
      try {
        const usersRes = await fetchUsers()
        console.log("✅ Raw users response:", JSON.stringify(usersRes.data, null, 2))
        setDebugInfo((prev) => ({ ...prev, rawUsersData: usersRes.data }))

        if (usersRes.data) {
          if (usersRes.data.data && Array.isArray(usersRes.data.data)) {
            usersData = usersRes.data.data
          } else if (Array.isArray(usersRes.data)) {
            usersData = usersRes.data
          } else if (usersRes.data.users && Array.isArray(usersRes.data.users)) {
            usersData = usersRes.data.users
          } else {
            console.log("⚠️ Unexpected users response structure:", usersRes.data)
            usersData = []
          }
        }
        console.log("👥 Users data:", usersData.length, "users found")
        setDebugInfo((prev) => ({ ...prev, usersFetched: true }))
      } catch (usersError) {
        console.log("❌ Error fetching users:", usersError.message)
        setDebugInfo((prev) => ({ ...prev, usersFetched: false }))
        if (usersError.response?.status === 401) {
          Alert.alert("Phiên đăng nhập hết hạn", "Vui lòng đăng nhập lại", [
            { text: "OK", onPress: () => router.replace("/(auth)/login") },
          ])
          return
        }
      }

      try {
        const unreadRes = await getUnreadCount()
        console.log("✅ Unread count response:", unreadRes.data)
        setUnreadCount(unreadRes.data?.count || unreadRes.data?.data?.count || 0)
      } catch (unreadError) {
        console.log("❌ Error fetching unread count:", unreadError.message)
      }

      let finalConversations = []
      if (conversationsData.length > 0) {
        console.log("🔄 Processing conversations data...")
        const conversationPromises = conversationsData.map(async (conv) => {
          let otherParticipant = null
          if (conv.participants && Array.isArray(conv.participants)) {
            otherParticipant = conv.participants.find((p) => p._id !== parsedUser.id)
          } else if (conv.user) {
            otherParticipant = conv.user
          } else if (conv.senderId && conv.receiverId) {
            otherParticipant = conv.senderId._id === parsedUser.id ? conv.receiverId : conv.senderId
          }

          if (!otherParticipant || !otherParticipant._id) {
            console.log("⚠️ No valid participant found for conversation:", conv)
            return null
          }

          let lastMessage = conv.lastMessage || conv.messages?.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
          if (!lastMessage && otherParticipant._id) {
            console.log("⚠️ No lastMessage from API, attempting to fetch latest message...")
            try {
              const msgRes = await fetchMessages(otherParticipant._id)
              lastMessage = msgRes.data.data?.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
              console.log("🔍 Fetched last message for", otherParticipant.userName, ":", lastMessage?.text)
            } catch (msgError) {
              console.log("❌ Error fetching last message:", msgError.message)
              lastMessage = { text: "Tin nhắn mới", createdAt: new Date().toISOString() }
            }
          }
          console.log("🔍 Last message for", otherParticipant.userName, ":", lastMessage?.text)

          return {
            user: {
              _id: otherParticipant._id,
              userName: otherParticipant.userName || otherParticipant.name || "Unknown User",
              profilePicture: otherParticipant.profilePicture || otherParticipant.avatar,
              lastSeen: otherParticipant.lastSeen,
              online: false,
            },
            lastMessage: lastMessage,
            unreadCount: conv.unreadCount || 0,
            updatedAt: lastMessage?.createdAt || conv.updatedAt || conv.createdAt || new Date().toISOString(),
          }
        })

        finalConversations = (await Promise.all(conversationPromises))
          .filter((conv) => conv !== null)
          .sort((a, b) => {
            if (a.lastMessage && !b.lastMessage) return -1
            if (!a.lastMessage && b.lastMessage) return 1
            return new Date(b.updatedAt) - new Date(a.updatedAt)
          })
        console.log("💬 Processed conversations:", finalConversations.length)
      } else if (usersData.length > 0) {
        console.log("🔄 Fallback: Converting users to conversations...")
        finalConversations = usersData
          .filter((user) => user.role !== "admin" && user._id !== parsedUser.id)
          .map((user) => ({
            user: {
              _id: user._id,
              userName: user.userName || user.name || "Unknown User",
              profilePicture: user.profilePicture || user.avatar,
              lastSeen: user.lastSeen,
              online: false,
            },
            lastMessage: null,
            unreadCount: 0,
            updatedAt: user.lastSeen || user.createdAt || new Date().toISOString(),
          }))
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        console.log("👥 Converted users to conversations:", finalConversations.length)
      }

      setConversations(finalConversations)
      setFilteredConversations(finalConversations)
      console.log(`🎉 Data loading completed: ${finalConversations.length} conversations total`)
    } catch (err) {
      console.log("❌ Error in checkAuthAndLoadData:", err.message)
      if (err.response?.status === 401) {
        Alert.alert("Phiên đăng nhập hết hạn", "Vui lòng đăng nhập lại", [
          { text: "OK", onPress: () => router.replace("/(auth)/login") },
        ])
      } else {
        Alert.alert("Lỗi", `Không thể tải dữ liệu: ${err.message}`)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router])

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredConversations(conversations)
    } else {
      const filtered = conversations.filter((conv) =>
        conv.user.userName.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredConversations(filtered)
    }
  }, [searchQuery, conversations])

  const toggleSearch = () => {
    setSearchVisible(!searchVisible)
    if (!searchVisible) {
      Animated.timing(searchAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start()
    } else {
      Animated.timing(searchAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setSearchQuery("")
      })
    }
  }

  useEffect(() => {
    const monitorConnection = setInterval(() => {
      const info = socketService.getConnectionInfo()
      console.log("🔌 Socket connection status:", info.status)
      setConnectionInfo(info)
      setDebugInfo((prev) => ({ ...prev, socketConnected: info.status === "connected" }))
    }, 2000)
    return () => clearInterval(monitorConnection)
  }, [])

  useEffect(() => {
    checkAuthAndLoadData()
  }, [checkAuthAndLoadData])

  useEffect(() => {
    if (myId) {
      console.log("🔌 Setting up socket connection for user:", myId)
      if (!socketService || typeof socketService.connect !== "function") {
        console.log("❌ SocketService not properly imported")
        return
      }

      socketService.connect(myId)

      const connectionChecker = setInterval(() => {
        if (!socketService.isConnected()) {
          console.log("🔄 Connection lost, attempting to reconnect...")
          socketService.connect(myId)
        }
      }, 10000)

      const handleUserStatusUpdate = ({ userId, online, timestamp, lastSeen }) => {
        console.log("📡 User status update:", { userId, online, timestamp })
        setOnlineUsers((prev) => {
          const newMap = new Map(prev)
          newMap.set(userId, {
            online,
            timestamp: timestamp || new Date().toISOString(),
            lastSeen: lastSeen || timestamp,
          })
          return newMap
        })

        setConversations((prevConversations) => {
          const updated = prevConversations
            .map((conv) =>
              conv.user._id === userId
                ? {
                    ...conv,
                    user: {
                      ...conv.user,
                      online,
                      lastSeen: lastSeen || timestamp,
                    },
                  }
                : conv,
            )
            .sort((a, b) => {
              if (a.lastMessage && !b.lastMessage) return -1
              if (!a.lastMessage && b.lastMessage) return 1
              return new Date(b.updatedAt) - new Date(a.updatedAt)
            })
          return updated
        })
      }

      const handleOnlineUsers = (users) => {
        console.log("👥 Received online users list:", users.length, "users")
        const newOnlineMap = new Map()
        users.forEach((user) => {
          newOnlineMap.set(user.userId, {
            online: true,
            timestamp: user.timestamp || new Date().toISOString(),
            lastSeen: user.lastSeen,
          })
        })
        setOnlineUsers(newOnlineMap)

        setConversations((prevConversations) => {
          const updated = prevConversations
            .map((conv) => {
              const userStatus = newOnlineMap.get(conv.user._id)
              return {
                ...conv,
                user: {
                  ...conv.user,
                  online: userStatus?.online || false,
                  lastSeen: userStatus?.lastSeen || conv.user.lastSeen,
                },
              }
            })
            .sort((a, b) => {
              if (a.lastMessage && !b.lastMessage) return -1
              if (!a.lastMessage && b.lastMessage) return 1
              return new Date(b.updatedAt) - new Date(a.updatedAt)
            })
          return updated
        })
      }

      const handleNewMessage = (message) => {
        console.log("📨 Received new message (Realtime):", JSON.stringify(message))
        setUnreadCount((prev) => prev + 1)

        const senderId = message.senderId?._id || message.senderId
        const receiverId = message.receiverId?._id || message.receiverId
        const otherUserId = senderId === myId ? receiverId : senderId

        setConversations((prevConversations) => {
          const existingConvIndex = prevConversations.findIndex((conv) => conv.user._id === otherUserId)
          if (existingConvIndex >= 0) {
            const updatedConversations = [...prevConversations]
            updatedConversations[existingConvIndex] = {
              ...updatedConversations[existingConvIndex],
              lastMessage: message,
              unreadCount:
                senderId !== myId
                  ? (updatedConversations[existingConvIndex].unreadCount || 0) + 1
                  : updatedConversations[existingConvIndex].unreadCount,
              updatedAt: message.createdAt || new Date().toISOString(),
            }
            return updatedConversations.sort((a, b) => {
              if (a.lastMessage && !b.lastMessage) return -1
              if (!a.lastMessage && b.lastMessage) return 1
              return new Date(b.updatedAt) - new Date(a.updatedAt)
            })
          } else {
            const newConversation = {
              user: {
                _id: otherUserId,
                userName: message.senderId?.userName || message.receiverId?.userName || "Unknown User",
                profilePicture: message.senderId?.profilePicture || message.receiverId?.profilePicture,
                lastSeen: new Date().toISOString(),
                online: false,
              },
              lastMessage: message,
              unreadCount: senderId !== myId ? 1 : 0,
              updatedAt: message.createdAt || new Date().toISOString(),
            }
            return [newConversation, ...prevConversations].sort((a, b) => {
              if (a.lastMessage && !b.lastMessage) return -1
              if (!a.lastMessage && b.lastMessage) return 1
              return new Date(b.updatedAt) - new Date(a.updatedAt)
            })
          }
        })

        setTimeout(() => {
          if (!socketService.isConnected()) {
            console.log("⚠️ Socket disconnected, triggering light refresh...")
            checkAuthAndLoadData()
          }
        }, 2000)
      }

      if (socketService && typeof socketService.on === "function") {
        socketService.on("userStatusUpdate", handleUserStatusUpdate)
        socketService.on("onlineUsers", handleOnlineUsers)
        socketService.on("newMessage", handleNewMessage)
      }

      const heartbeat = setInterval(() => {
        if (socketService.isConnected()) {
          socketService.emit("heartbeat", {
            userId: myId,
            timestamp: new Date().toISOString(),
            platform: "mobile-web",
          })
        }
      }, 30000)

      return () => {
        console.log("🧹 Cleaning up socket listeners and intervals")
        clearInterval(heartbeat)
        clearInterval(connectionChecker)
        if (socketService && typeof socketService.off === "function") {
          socketService.off("newMessage", handleNewMessage)
          socketService.off("userStatusUpdate", handleUserStatusUpdate)
          socketService.off("onlineUsers", handleOnlineUsers)
        }
      }
    }
  }, [myId, checkAuthAndLoadData])

  const onRefresh = () => {
    console.log("🔄 Manual refresh triggered")
    setRefreshing(true)
    checkAuthAndLoadData()
  }

  const handleChatWithUser = (receiverId) => {
    if (receiverId) {
      console.log("💬 Opening chat with user:", receiverId)
      router.push(`/chat/${receiverId}`)
    } else {
      console.log("❌ Invalid receiverId")
    }
  }

  const handleForceReconnect = () => {
    console.log("🔄 Force reconnecting...")
    if (myId && socketService && typeof socketService.forceReconnect === "function") {
      socketService.forceReconnect(myId)
    }
  }

  const handleDebugInfo = () => {
    const info = `
🔍 DEBUG INFORMATION:

📡 API Connection: ${debugInfo.apiConnected ? "✅ Connected" : "❌ Failed"}
🔌 Socket Connection: ${debugInfo.socketConnected ? "✅ Connected" : "❌ Disconnected"}
🔑 Auth Token: ${debugInfo.authToken ? "✅ Present" : "❌ Missing"}
💬 Conversations Fetch: ${debugInfo.conversationsFetched ? "✅ Success" : "❌ Failed"}
👥 Users Fetch: ${debugInfo.usersFetched ? "✅ Success" : "❌ Failed"}

📊 DATA COUNTS:
- Conversations: ${conversations.length}
- Online Users: ${onlineUsers.size}
- Unread Messages: ${unreadCount}
    `
    Alert.alert("Debug Information", info)
  }

  const refreshConversations = useCallback(async () => {
    console.log("🔄 Refreshing conversations after message sent...")
    try {
      const convRes = await fetchConversations()
      if (convRes.data?.data) {
        checkAuthAndLoadData()
      }
    } catch (error) {
      console.log("❌ Error refreshing conversations:", error)
    }
  }, [checkAuthAndLoadData])

  if (typeof window !== "undefined") {
    window.refreshConversations = refreshConversations
  }

  const formatLastMessage = (message, userId, otherUserName) => {
    if (!message) return "Chưa có tin nhắn"
    if (message.image && !message.text) return "📷 Đã gửi ảnh"

    const senderId = message.senderId?._id || message.senderId
    const senderName = senderId === userId ? "Bạn" : otherUserName || "Unknown User"
    const text = message.text || message.content || "Tin nhắn mới"

    return `${senderName}: ${text.length > 35 ? `${text.substring(0, 35)}...` : text}`
  }

  const renderItem = ({ item }) => {
    const user = item.user
    const unreadCount = item.unreadCount || 0
    const lastMessage = item.lastMessage
    const userStatus = onlineUsers.get(user._id) || {
      online: user.online || false,
      timestamp: user.lastSeen || new Date().toISOString(),
      lastSeen: user.lastSeen,
    }
    const isOnline = isUserOnline(userStatus)

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatWithUser(user._id)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={["#FFFFFF", "#F8FFF8"]}
          style={[styles.chatGradient, isOnline && styles.onlineChatGradient]}
        >
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: user.profilePicture || "https://via.placeholder.com/60" }}
              style={styles.avatar}
            />
            {isOnline && (
              <View style={styles.onlineIndicator} />
            )}
          </View>

          <View style={styles.chatInfo}>
            <View style={styles.chatHeader}>
              <Text style={styles.username} numberOfLines={1}>
                {user.userName || "Unknown User"}
              </Text>
              <View style={styles.rightSection}>
                {lastMessage && (
                  <Text style={styles.timeText}>{formatMessageTime(lastMessage.createdAt)}</Text>
                )}
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={styles.lastMessage} numberOfLines={2}>
              {formatLastMessage(lastMessage, myId, user.userName)}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={["#E8F5E8", "#F1F8E9"]} style={styles.loadingGradient}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Đang tải cuộc trò chuyện...</Text>
          </View>
        </LinearGradient>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#2E7D32", "#4CAF50", "#66BB6A"]} style={styles.headerGradient}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <Ionicons name="chatbubbles" size={28} color="#FFFFFF" />
              {unreadCount > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.headerTitle}>Tin Nhắn</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.debugButton} onPress={handleDebugInfo}>
              <Ionicons name="information-circle-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.searchButton} onPress={toggleSearch}>
              <Ionicons name={searchVisible ? "close" : "search"} size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {searchVisible && (
          <Animated.View
            style={[
              styles.searchContainer,
              {
                height: searchAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 60],
                }),
                opacity: searchAnimation,
              },
            ]}
          >
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#81C784" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm theo tên..."
                placeholderTextColor="#A5D6A7"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={searchVisible}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#81C784" />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}
      </LinearGradient>

      <View style={styles.content}>
        {filteredConversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons 
                name={searchQuery ? "search-outline" : "chatbubbles-outline"} 
                size={64} 
                color="#A5D6A7" 
              />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? "Không tìm thấy kết quả" : "Chưa có cuộc trò chuyện nào"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? `Không tìm thấy cuộc trò chuyện nào với "${searchQuery}"`
                : "Bắt đầu trò chuyện với bạn bè của bạn"
              }
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.startChatButton} onPress={onRefresh}>
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.startChatText}>Làm mới</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item.user._id?.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                colors={["#4CAF50"]} 
                tintColor="#4CAF50" 
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F8E9",
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "600",
  },
  headerGradient: {
    paddingTop: 20,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  headerBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#FF5722",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  headerBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  debugButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    overflow: "hidden",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 44,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#2E7D32",
    fontWeight: "500",
  },
  clearButton: {
    marginLeft: 8,
  },
  content: {
    flex: 1,
    backgroundColor: "#F1F8E9",
  },
  list: {
    paddingTop: 8,
  },
  chatItem: {
    marginHorizontal: 16,
    marginBottom: 2,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chatGradient: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  onlineChatGradient: {
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#E8F5E8",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#4CAF50",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  username: {
    fontSize: 17,
    fontWeight: "600",
    color: "#2E7D32",
    flex: 1,
  },
  rightSection: {
    alignItems: "flex-end",
  },
  timeText: {
    fontSize: 12,
    color: "#81C784",
    marginBottom: 4,
    fontWeight: "500",
  },
  unreadBadge: {
    backgroundColor: "#FF5722",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  lastMessage: {
    fontSize: 14,
    color: "#66BB6A",
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E8F5E8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#66BB6A",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  startChatButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startChatText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
})