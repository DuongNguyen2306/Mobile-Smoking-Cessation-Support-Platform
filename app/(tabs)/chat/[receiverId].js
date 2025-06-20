"use client"

import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as ImagePicker from "expo-image-picker"
import { LinearGradient } from "expo-linear-gradient"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Alert,
  Animated,
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
  const typingAnimation = useRef(new Animated.Value(0)).current

  console.log("💬 ChatWithUser - receiverId:", receiverId)

  // Hàm quay về chat screen
  const handleBackToChat = () => {
    console.log("🔙 Navigating back to chat screen")
    router.replace("/(tabs)/chat") // Hoặc router.push("/(tabs)/chat") tùy vào cấu trúc routing của bạn
  }

  // Typing animation
  useEffect(() => {
    if (isReceiverTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnimation, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start()
    } else {
      typingAnimation.setValue(0)
    }
  }, [isReceiverTyping])

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
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
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
        text: tempMessage.text,
        image: tempMessage.image,
      }

      const res = await sendMessage(receiverId, payload)
      const newMessage = res.data.data
      console.log("✅ Message sent via API:", newMessage)

      setMessages((prev) =>
        prev
          .map((msg) => (msg._id === tempMessage._id ? newMessage : msg))
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      )

      if (socketService && socketService.isConnected()) {
        const socketData = {
          ...newMessage,
          senderId: { _id: myId },
          receiverId: { _id: receiverId },
        }
        socketService.emit("newMessage", socketData)
        console.log("✅ Message emitted via socket")

        // Cập nhật danh sách chat bên ngoài
        if (typeof window !== "undefined" && typeof window.refreshConversations === "function") {
          window.refreshConversations()
        }
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
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffDays >= 1) return `${diffDays} ngày`
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
                <Ionicons name="time-outline" size={12} color={isMyMessage ? "rgba(255,255,255,0.7)" : "#999"} />
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
      <LinearGradient colors={["#2E7D32", "#4CAF50", "#66BB6A"]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToChat}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <View style={styles.avatarContainer}>
              {receiver && receiver.profilePicture ? (
                <Image source={{ uri: receiver.profilePicture }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={24} color="#4CAF50" />
                </View>
              )}
              {isReceiverOnline && <View style={styles.onlineIndicator} />}
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
                    : lastOfflineTime
                    ? `Hoạt động ${getTimeAgo(lastOfflineTime)} trước`
                    : "Không hoạt động"}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="call" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="videocam" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.chatContainer} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.messagesContainer}>
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="chatbubble-outline" size={64} color="#A5D6A7" />
              </View>
              <Text style={styles.emptyTitle}>Bắt đầu cuộc trò chuyện!</Text>
              <Text style={styles.emptyText}>Hãy gửi tin nhắn đầu tiên để bắt đầu trò chuyện.</Text>
              <TouchableOpacity style={styles.startChatButton} onPress={() => setMessage("Xin chào! 👋")}>
                <Ionicons name="hand-right" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
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
                  <Animated.View 
                    style={[
                      styles.dot, 
                      { 
                        opacity: typingAnimation.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.3, 1, 0.3],
                        })
                      }
                    ]} 
                  />
                  <Animated.View 
                    style={[
                      styles.dot, 
                      { 
                        opacity: typingAnimation.interpolate({
                          inputRange: [0, 0.2, 0.7, 1],
                          outputRange: [0.3, 0.3, 1, 0.3],
                        })
                      }
                    ]} 
                  />
                  <Animated.View 
                    style={[
                      styles.dot, 
                      { 
                        opacity: typingAnimation.interpolate({
                          inputRange: [0, 0.4, 0.9, 1],
                          outputRange: [0.3, 0.3, 0.3, 1],
                        })
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        {selectedImage && (
          <View style={styles.selectedImageContainer}>
            <LinearGradient colors={["#E8F5E8", "#F1F8E9"]} style={styles.selectedImageGradient}>
              <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
              <View style={styles.selectedImageInfo}>
                <Text style={styles.selectedImageText}>Ảnh đã chọn</Text>
                <Text style={styles.selectedImageSize}>
                  {selectedImage.width}x{selectedImage.height}
                </Text>
              </View>
              <TouchableOpacity style={styles.removeImageButton} onPress={() => setSelectedImage(null)}>
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        <LinearGradient colors={["#FFFFFF", "#F8FFF8"]} style={styles.inputGradient}>
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.imageButton} onPress={handleImageSelect}>
              <Ionicons name="camera" size={22} color="#4CAF50" />
            </TouchableOpacity>

            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nhập tin nhắn..."
                placeholderTextColor="#A5D6A7"
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
              <Ionicons name="send" size={18} color="#FFFFFF" />
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
    backgroundColor: "#F1F8E9",
  },
  headerGradient: {
    paddingTop: 10,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  userInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 2,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
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
    color: "#66BB6A",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontWeight: "500",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    borderRadius: 18,
    padding: 14,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
  },
  myMessage: {
    borderBottomRightRadius: 6,
  },
  otherMessage: {
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: "#E8F5E8",
  },
  tempMessage: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  otherMessageText: {
    color: "#2E7D32",
    fontWeight: "500",
  },
  messageImage: {
    width: 220,
    height: 160,
    borderRadius: 12,
    marginBottom: 8,
  },
  tempIndicator: {
    position: "absolute",
    bottom: 6,
    right: 6,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    padding: 16,
    alignSelf: "flex-start",
    maxWidth: "80%",
    borderWidth: 1,
    borderColor: "#E8F5E8",
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  typingDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
    marginHorizontal: 3,
  },
  selectedImageContainer: {
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedImageGradient: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  selectedImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },
  selectedImageInfo: {
    flex: 1,
  },
  selectedImageText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E7D32",
    marginBottom: 4,
  },
  selectedImageSize: {
    fontSize: 12,
    color: "#66BB6A",
  },
  removeImageButton: {
    backgroundColor: "#FF5722",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F5E8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8F5E8",
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  input: {
    fontSize: 16,
    color: "#2E7D32",
    textAlignVertical: "center",
    fontWeight: "500",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#BDBDBD",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonActive: {
    backgroundColor: "#4CAF50",
    shadowColor: "#4CAF50",
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
    fontSize: 22,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#66BB6A",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  startChatButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 24,
    paddingVertical: 14,
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
  },
})