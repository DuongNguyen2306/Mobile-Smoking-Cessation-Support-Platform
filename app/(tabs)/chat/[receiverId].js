"use client"

import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as ImagePicker from "expo-image-picker"
import { LinearGradient } from "expo-linear-gradient"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { fetchMessages, fetchUsers, getUserProfile, sendMessage } from "../../services/api"
import { socketService } from "../../utils/socket"

const { width } = Dimensions.get("window")

export default function ChatWithUser() {
  const { receiverId } = useLocalSearchParams()
  const router = useRouter()
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState("")
  const [receiver, setReceiver] = useState(null)
  const [loadingReceiver, setLoadingReceiver] = useState(true)
  const [myId, setMyId] = useState(null)
  const [isTyping, setIsTyping] = useState(false)
  const [isReceiverTyping, setIsReceiverTyping] = useState(false)
  const [isReceiverOnline, setIsReceiverOnline] = useState(false)
  const [lastOfflineTime, setLastOfflineTime] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [socketConnected, setSocketConnected] = useState(false)
  const flatListRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  console.log("💬 ChatWithUser - receiverId:", receiverId)

  const initializeSocket = useCallback(async () => {
    try {
      const user = await AsyncStorage.getItem("user")
      const parsedUser = JSON.parse(user)
      setMyId(parsedUser.id)
      console.log("👤 Current user ID:", parsedUser.id)

      if (!socketService || typeof socketService.connect !== "function") {
        console.log("❌ SocketService not properly imported")
        return
      }

      socketService.connect(parsedUser.id)
      setSocketConnected(socketService.isConnected())

      const connectionMonitor = setInterval(() => {
        const connected = socketService.isConnected()
        setSocketConnected(connected)
        if (!connected) {
          console.log("🔄 Socket disconnected, attempting reconnect...")
          socketService.connect(parsedUser.id)
        }
      }, 5000)

      return () => clearInterval(connectionMonitor)
    } catch (err) {
      console.log("❌ Error initializing socket:", err)
    }
  }, [])

  const fetchMessagesData = useCallback(async () => {
    try {
      console.log("📡 Fetching messages for receiverId:", receiverId)
      const res = await fetchMessages(receiverId)
      console.log("✅ Messages response:", res.data)

      if (res.data && res.data.data) {
        const sortedMessages = res.data.data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        setMessages(sortedMessages)
        console.log("📨 Loaded messages:", sortedMessages.length)
      }
    } catch (err) {
      console.log("❌ Error fetching messages:", err.response ? err.response.data : err.message)
    }
  }, [receiverId])

  const fetchReceiverData = useCallback(async () => {
    setLoadingReceiver(true)
    try {
      console.log("👤 Fetching receiver data for:", receiverId)
      const usersRes = await fetchUsers()
      if (usersRes.data && usersRes.data.data) {
        const foundReceiver = usersRes.data.data.find((user) => user._id === receiverId || user.id === receiverId)
        if (foundReceiver) {
          setReceiver(foundReceiver)
          setIsReceiverOnline(foundReceiver.online || false)
          console.log("✅ Found receiver:", foundReceiver.userName)
        } else {
          const profileRes = await getUserProfile(receiverId)
          if (profileRes.data && profileRes.data.data) {
            setReceiver(profileRes.data.data)
            setIsReceiverOnline(profileRes.data.data.online || false)
            console.log("✅ Found receiver via profile:", profileRes.data.data.userName)
          } else {
            setReceiver({ userName: "Không tìm thấy", name: "Không tìm thấy" })
            Alert.alert("Lỗi", "Không thể tải thông tin người dùng.")
          }
        }
      }
    } catch (err) {
      console.log("❌ Error fetching receiver:", err.response ? err.response.data : err.message)
      setReceiver({ userName: "Lỗi tải dữ liệu", name: "Lỗi tải dữ liệu" })
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi tải thông tin người dùng.")
    } finally {
      setLoadingReceiver(false)
    }
  }, [receiverId])

  const handleImageSelect = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Lỗi", "Cần cấp quyền truy cập thư viện ảnh!")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    })
    if (!result.canceled && result.assets[0].uri) {
      setSelectedImage(result.assets[0])
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() && !selectedImage) return

    const tempMessage = {
      _id: `temp_${Date.now()}`,
      text: message,
      image: selectedImage ? selectedImage.uri : null,
      senderId: { _id: myId },
      receiverId: { _id: receiverId },
      createdAt: new Date().toISOString(),
      isTemp: true,
    }

    setMessages((prev) => [...prev, tempMessage])
    setMessage("")
    setSelectedImage(null)

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)

    try {
      console.log("📤 Sending message to:", receiverId)
      const payload = {
        text: message,
        image: selectedImage ? selectedImage.uri : null,
      }

      const res = await sendMessage(receiverId, payload)
      const newMessage = res.data.data
      console.log("✅ Message sent via API:", newMessage)

      setMessages((prev) =>
        prev
          .map((msg) => (msg._id === tempMessage._id ? newMessage : msg))
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
      )

      if (socketService && socketService.isConnected()) {
        const socketData = {
          ...newMessage,
          senderId: { _id: myId },
          receiverId: { _id: receiverId },
        }
        socketService.emit("newMessage", socketData) // Sửa lại từ sendMessage thành emit
        console.log("✅ Message emitted via socket")
      }
    } catch (err) {
      console.log("❌ Error sending message:", err.response ? err.response.data : err.message)
      setMessages((prev) => prev.filter((msg) => msg._id !== tempMessage._id))
      Alert.alert("Lỗi", "Không thể gửi tin nhắn.")
    }
  }

  const handleTyping = (text) => {
    setMessage(text)
    if (text.trim()) {
      if (!isTyping) {
        setIsTyping(true)
        if (socketService && typeof socketService.sendTyping === "function") {
          socketService.sendTyping(receiverId, true)
        }
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
        if (socketService && typeof socketService.sendTyping === "function") {
          socketService.sendTyping(receiverId, false)
        }
      }, 2000)
    } else if (isTyping) {
      setIsTyping(false)
      if (socketService && typeof socketService.sendTyping === "function") {
        socketService.sendTyping(receiverId, false)
      }
    }
  }

  useEffect(() => {
    const cleanup = initializeSocket()
    fetchMessagesData()
    fetchReceiverData()

    return () => {
      if (typeof cleanup === "function") {
        try {
          cleanup()
        } catch (error) {
          console.log("⚠️ Cleanup error:", error)
        }
      }
    }
  }, [initializeSocket, fetchMessagesData, fetchReceiverData])

  useEffect(() => {
    if (myId && socketService && socketService.isConnected()) {
      console.log("🔌 Setting up socket listeners for chat")

      const handleNewMessage = (msg) => {
        console.log("📨 Received newMessage in chat:", msg)
        const senderId = msg.senderId?._id || msg.senderId
        const receiverIdFromMsg = msg.receiverId?._id || msg.receiverId

        if (
          (senderId === myId && receiverIdFromMsg === receiverId) ||
          (senderId === receiverId && receiverIdFromMsg === myId)
        ) {
          console.log("✅ Message is for this conversation")
          setMessages((prev) => {
            const exists = prev.find((m) => m._id === msg._id)
            if (!exists) {
              const updatedMessages = [...prev, msg].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
              setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
              return updatedMessages
            }
            return prev
          })
        }
      }

      const handleTyping = ({ userId, isTyping: typing }) => {
        console.log("⌨️ Received typing:", { userId, typing, receiverId })
        if (userId === receiverId) {
          setIsReceiverTyping(typing)
        }
      }

      const handleUserStatus = ({ userId, online, timestamp }) => {
        console.log("👤 Received userStatus in chat:", { userId, online, receiverId, timestamp })
        if (userId === receiverId) {
          setIsReceiverOnline(online)
          setLastOfflineTime(online ? null : timestamp || new Date())
        }
      }

      if (socketService && typeof socketService.on === "function") {
        socketService.on("newMessage", handleNewMessage)
        socketService.on("typing", handleTyping)
        socketService.on("userStatus", handleUserStatus)
        socketService.on("userStatusUpdate", handleUserStatus)
      }

      return () => {
        console.log("🧹 Cleaning up socket listeners in chat")

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }

        if (socketService && typeof socketService.off === "function") {
          try {
            socketService.off("newMessage", handleNewMessage)
            socketService.off("typing", handleTyping)
            socketService.off("userStatus", handleUserStatus)
            socketService.off("userStatusUpdate", handleUserStatus)
          } catch (error) {
            console.log("⚠️ Error cleaning up listeners:", error)
          }
        }
      }
    }
  }, [myId, receiverId])

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages])

  const getTimeAgo = (date) => {
    if (!date) return ""
    const now = new Date()
    const diffMs = now - new Date(date)
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    if (diffHours >= 1) return `${diffHours} giờ`
    if (diffMins >= 1) return `${diffMins} phút`
    return "vừa xong"
  }

  const renderMessage = ({ item, index }) => {
    const isMyMessage = (item.senderId?._id || item.senderId) === myId
    const showTime =
      index === 0 || new Date(item.createdAt).getTime() - new Date(messages[index - 1].createdAt).getTime() > 300000

    return (
      <View style={styles.messageContainer}>
        {showTime && (
          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>
              {new Date(item.createdAt).toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
              })}
            </Text>
          </View>
        )}

        <View style={[styles.messageWrapper, isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
          <LinearGradient
            colors={isMyMessage ? ["#4CAF50", "#66BB6A"] : ["#FFFFFF", "#F8F9FA"]}
            style={[
              styles.messageItem,
              isMyMessage ? styles.myMessage : styles.otherMessage,
              item.isTemp && styles.tempMessage,
            ]}
          >
            {item.image && <Image source={{ uri: item.image }} style={styles.messageImage} resizeMode="cover" />}
            {item.text && (
              <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
                {item.text}
              </Text>
            )}
            {item.isTemp && (
              <View style={styles.tempIndicator}>
                <Ionicons name="time-outline" size={12} color={isMyMessage ? "#FFFFFF" : "#666"} />
              </View>
            )}
          </LinearGradient>
        </View>
      </View>
    )
  }

  const memoizedMessages = useMemo(() => messages, [messages])

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#2E7D32", "#4CAF50"]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <View style={styles.avatarContainer}>
              {receiver && receiver.profilePicture ? (
                <Image source={{ uri: receiver.profilePicture }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={20} color="#4CAF50" />
                </View>
              )}
              <View style={[styles.statusIndicator, { backgroundColor: isReceiverOnline ? "#4CAF50" : "#BDBDBD" }]} />
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {loadingReceiver ? "Đang tải..." : receiver?.userName || receiver?.name || "Không tìm thấy người dùng"}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isReceiverTyping
                  ? "Đang nhập..."
                  : isReceiverOnline
                    ? "Đang hoạt động"
                    : `Hoạt động ${getTimeAgo(lastOfflineTime)} trước`}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <View style={[styles.connectionIndicator, { backgroundColor: socketConnected ? "#4CAF50" : "#FF5722" }]}>
              <Ionicons name={socketConnected ? "wifi" : "wifi-off"} size={16} color="#FFFFFF" />
            </View>
            <TouchableOpacity style={styles.callButton}>
              <Ionicons name="videocam" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.chatContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.messagesContainer}>
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="chatbubble-outline" size={60} color="#CCCCCC" />
              </View>
              <Text style={styles.emptyTitle}>Bắt đầu cuộc trò chuyện!</Text>
              <Text style={styles.emptyText}>Hãy gửi tin nhắn đầu tiên để bắt đầu.</Text>
              <TouchableOpacity style={styles.startChatButton} onPress={() => setMessage("Xin chào! 👋")}>
                <Text style={styles.startChatText}>Chào hỏi</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={memoizedMessages}
              keyExtractor={(item) => item._id || String(Math.random())}
              renderItem={renderMessage}
              contentContainerStyle={styles.messageList}
              style={styles.flatList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          )}

          {isReceiverTyping && (
            <View style={styles.typingContainer}>
              <View style={styles.typingBubble}>
                <View style={styles.typingDots}>
                  <View style={[styles.dot, styles.dot1]} />
                  <View style={[styles.dot, styles.dot2]} />
                  <View style={[styles.dot, styles.dot3]} />
                </View>
              </View>
            </View>
          )}
        </View>

        {selectedImage && (
          <View style={styles.selectedImageContainer}>
            <LinearGradient colors={["#E8F5E8", "#F1F8E9"]} style={styles.selectedImageGradient}>
              <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
              <TouchableOpacity style={styles.removeImageButton} onPress={() => setSelectedImage(null)}>
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        <LinearGradient colors={["#FFFFFF", "#F8FFF8"]} style={styles.inputGradient}>
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.imageButton} onPress={handleImageSelect}>
              <Ionicons name="camera" size={24} color="#4CAF50" />
            </TouchableOpacity>

            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nhập tin nhắn..."
                placeholderTextColor="#999"
                value={message}
                onChangeText={handleTyping}
                multiline
                maxLength={1000}
              />
            </View>

            <TouchableOpacity
              onPress={handleSendMessage}
              style={[styles.sendButton, (message.trim() || selectedImage) && styles.sendButtonActive]}
              disabled={!message.trim() && !selectedImage}
            >
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FFF8",
  },
  headerGradient: {
    paddingTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  statusIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  userInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  connectionIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 8,
  },
  timeContainer: {
    alignItems: "center",
    marginVertical: 16,
  },
  timeLabel: {
    fontSize: 12,
    color: "#888",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageWrapper: {
    maxWidth: "80%",
  },
  myMessageWrapper: {
    alignSelf: "flex-end",
  },
  otherMessageWrapper: {
    alignSelf: "flex-start",
  },
  messageItem: {
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: "relative",
  },
  myMessage: {
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E8F5E8",
  },
  tempMessage: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: "#FFFFFF",
  },
  otherMessageText: {
    color: "#333333",
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  tempIndicator: {
    position: "absolute",
    bottom: 4,
    right: 4,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    alignSelf: "flex-start",
    maxWidth: "80%",
    borderWidth: 1,
    borderColor: "#E8F5E8",
  },
  typingDots: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
    marginHorizontal: 2,
  },
  selectedImageContainer: {
    margin: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  selectedImageGradient: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  selectedImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  removeImageButton: {
    backgroundColor: "#FF5722",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  inputGradient: {
    borderTopWidth: 1,
    borderTopColor: "#E8F5E8",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  imageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8F5E8",
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  input: {
    fontSize: 16,
    color: "#333",
    textAlignVertical: "center",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#BDBDBD",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  sendButtonActive: {
    backgroundColor: "#4CAF50",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  startChatButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  startChatText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
})