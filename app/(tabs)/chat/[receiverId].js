import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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
} from "react-native";
import { fetchMessages, fetchUsers, getUserProfile, sendMessage } from "../../services/api";
import { socketService } from "../../utils/socket";

export default function ChatWithUser() {
  const { receiverId } = useLocalSearchParams();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [receiver, setReceiver] = useState(null);
  const [loadingReceiver, setLoadingReceiver] = useState(true);
  const [myId, setMyId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isReceiverOnline, setIsReceiverOnline] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const initializeSocket = useCallback(async () => {
    try {
      const user = await AsyncStorage.getItem("user");
      const parsedUser = JSON.parse(user);
      setMyId(parsedUser.id);
    } catch (err) {
      console.log("Error loading user from AsyncStorage:", err);
    }
  }, []);

  const fetchMessagesData = useCallback(async () => {
    try {
      const res = await fetchMessages(receiverId);
      const sortedMessages = res.data.data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setMessages(sortedMessages);
    } catch (err) {
      console.log("Error fetching messages:", err.response ? err.response.data : err.message);
    }
  }, [receiverId]);

  const fetchReceiverData = useCallback(async () => {
    setLoadingReceiver(true);
    try {
      const usersRes = await fetchUsers();
      if (usersRes.data && usersRes.data.data) {
        const foundReceiver = usersRes.data.data.find(
          (user) => user._id === receiverId || user.id === receiverId
        );
        if (foundReceiver) {
          setReceiver(foundReceiver);
        } else {
          const profileRes = await getUserProfile(receiverId);
          if (profileRes.data && profileRes.data.data) {
            setReceiver(profileRes.data.data);
          } else {
            setReceiver({ userName: "Không tìm thấy", name: "Không tìm thấy" });
            Alert.alert("Lỗi", "Không thể tải thông tin người dùng.");
          }
        }
      }
    } catch (err) {
      console.log("Error fetching receiver:", err.response ? err.response.data : err.message);
      setReceiver({ userName: "Lỗi tải dữ liệu", name: "Lỗi tải dữ liệu" });
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi tải thông tin người dùng.");
    } finally {
      setLoadingReceiver(false);
    }
  }, [receiverId]);

  const handleImageSelect = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Lỗi", "Cần cấp quyền truy cập thư viện ảnh!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0].uri) {
      setSelectedImage(result.assets[0]);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() && !selectedImage) return;
    try {
      const payload = {
        text: message,
        image: selectedImage ? selectedImage.uri : null,
      };
      const res = await sendMessage(receiverId, payload);
      const newMessage = res.data.data;
      setMessages((prev) => {
        const exists = prev.find((m) => m._id === newMessage._id);
        if (!exists) {
          const updatedMessages = [...prev, newMessage].sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          );
          flatListRef.current?.scrollToEnd({ animated: true });
          return updatedMessages;
        }
        return prev;
      });
      socketService.emit("newMessage", {
        ...newMessage,
        senderId: { _id: myId },
        receiverId: { _id: receiverId },
      });
      setMessage("");
      setSelectedImage(null);
    } catch (err) {
      console.log("Error sending message:", err.response ? err.response.data : err.message);
      Alert.alert("Lỗi", "Không thể gửi tin nhắn.");
    }
  };

  const handleTyping = (text) => {
    setMessage(text);
    if (text.trim()) {
      if (!isTyping) {
        setIsTyping(true);
        socketService.emit("typing", { userId: myId, receiverId, isTyping: true });
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socketService.emit("typing", { userId: myId, receiverId, isTyping: false });
      }, 2000);
    } else if (isTyping) {
      setIsTyping(false);
      socketService.emit("typing", { userId: myId, receiverId, isTyping: false });
    }
  };

  useEffect(() => {
    initializeSocket();
    fetchMessagesData();
    fetchReceiverData();

    if (myId) {
      socketService.connect(myId);
      socketService.emit("userStatus", { userId: myId, online: true });

      socketService.on("newMessage", (msg) => {
        console.log("Received newMessage:", msg);
        const senderId = msg.senderId?._id || msg.senderId;
        const receiverIdFromMsg = msg.receiverId?._id || msg.receiverId;
        if (
          (senderId === myId && receiverIdFromMsg === receiverId) ||
          (senderId === receiverId && receiverIdFromMsg === myId)
        ) {
          setMessages((prev) => {
            const exists = prev.find((m) => m._id === msg._id);
            if (!exists) {
              const updatedMessages = [...prev, msg].sort(
                (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
              );
              flatListRef.current?.scrollToEnd({ animated: true });
              return updatedMessages;
            }
            return prev;
          });
        }
      });

      socketService.on("typing", ({ userId, isTyping }) => {
        console.log("Received typing:", { userId, isTyping, receiverId });
        if (userId === receiverId) {
          setIsReceiverOnline(isTyping || isReceiverOnline);
        }
      });

      socketService.on("userStatus", ({ userId, online }) => {
        console.log("Received userStatus for receiver:", { userId, online, receiverId });
        if (userId === receiverId) {
          setIsReceiverOnline(online);
        }
      });
    }

    return () => {
      if (myId) {
        socketService.emit("userStatus", { userId: myId, online: false });
        socketService.off("newMessage");
        socketService.off("typing");
        socketService.off("userStatus");
      }
    };
  }, [receiverId, fetchMessagesData, fetchReceiverData, myId]);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const renderItem = ({ item }) => {
    const isMyMessage = (item.senderId?._id || item.senderId) === myId;
    return (
      <View style={[styles.messageItem, isMyMessage ? styles.myMessage : styles.otherMessage]}>
        {item.image && (
          <Image
            source={{ uri: item.image }}
            style={styles.messageImage}
            resizeMode="contain"
          />
        )}
        {item.text && <Text style={styles.messageText}>{item.text}</Text>}
        <Text style={styles.messageTime}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
    );
  };

  const memoizedMessages = useMemo(() => messages, [messages]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {receiver && receiver.profilePicture ? (
          <Image source={{ uri: receiver.profilePicture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {loadingReceiver ? "Đang tải..." : receiver?.userName || receiver?.name || "Không tìm thấy người dùng"}
          </Text>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: isReceiverOnline ? "#4caf50" : "#ef5350" },
              ]}
            />
            <Text style={styles.headerSub}>
              {isReceiverOnline ? (isTyping ? "Đang nhập..." : "Đang hoạt động") : "Không hoạt động"}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <View style={styles.chatContainer}>
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Bắt đầu cuộc trò chuyện!</Text>
              <Text style={styles.emptyText}>Hãy gửi tin nhắn đầu tiên để bắt đầu.</Text>
              <TouchableOpacity style={styles.startChatButton} onPress={() => setMessage("Xin chào!")}>
                <Text style={styles.startChatText}>Gửi tin nhắn đầu tiên</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={memoizedMessages}
              keyExtractor={(item) => item._id || String(Math.random())}
              renderItem={renderItem}
              contentContainerStyle={styles.messageList}
              style={styles.flatList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          )}
        </View>

        {selectedImage && (
          <View style={styles.selectedImageContainer}>
            <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setSelectedImage(null)}
            >
              <Text style={styles.removeImageText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.imageButton} onPress={handleImageSelect}>
            <Text style={styles.imageButtonText}>📷</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Nhập tin nhắn..."
            value={message}
            onChangeText={handleTyping}
            multiline
          />
          <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  header: {
    backgroundColor: "#00695c",
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  headerInfo: { flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ccc",
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  statusContainer: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  headerSub: {
    fontSize: 14,
    color: "white",
  },
  chatContainer: { flex: 1 },
  flatList: { flex: 1 },
  messageList: { padding: 10, paddingBottom: 15 },
  messageItem: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    maxWidth: "70%",
    boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.1)",
  },
  myMessage: {
    backgroundColor: "#007AFF",
    alignSelf: "flex-end",
    marginLeft: "30%",
  },
  otherMessage: {
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    marginRight: "30%",
  },
  messageText: {
    fontSize: 16,
    color: "#000",
  },
  messageImage: {
    maxWidth: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    color: "#666",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  imageButton: {
    padding: 10,
    marginRight: 5,
  },
  imageButtonText: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: "#fff",
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#007AFF",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  sendText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  selectedImageContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#e8f0fe",
    borderTopWidth: 1,
    borderColor: "#ccc",
  },
  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
  },
  removeImageButton: {
    backgroundColor: "#ef5350",
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  removeImageText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  startChatButton: {
    backgroundColor: "#00695c",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  startChatText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});