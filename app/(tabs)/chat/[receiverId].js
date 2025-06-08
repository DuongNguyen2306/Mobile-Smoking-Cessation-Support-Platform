import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, FlatList, Image, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { fetchMessages, fetchUsers, getUserProfile, sendMessage } from "../../services/api";
import { socketService } from "../../utils/socket";

export default function ChatWithUser() {
  const { receiverId } = useLocalSearchParams();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [receiver, setReceiver] = useState(null);
  const [loadingReceiver, setLoadingReceiver] = useState(true);
  const [myId, setMyId] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    const loadMyId = async () => {
      try {
        const user = await AsyncStorage.getItem("user");
        const parsedUser = JSON.parse(user);
        setMyId(parsedUser.id);
        console.log("My ID:", parsedUser.id);
      } catch (err) {
        console.log("Lỗi tải user từ AsyncStorage:", err);
      }
    };

    const loadMessages = async () => {
      try {
        console.log("Loading messages for receiverId:", receiverId);
        const res = await fetchMessages(receiverId);
        console.log("Full API response (messages):", res);
        const sortedMessages = res.data.data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        setMessages(sortedMessages);
      } catch (err) {
        console.log("Lỗi tải tin nhắn:", err.response ? err.response.data : err.message);
      }
    };

    const loadReceiver = async () => {
      setLoadingReceiver(true);
      try {
        console.log("Loading receiver for receiverId:", receiverId);
        const usersRes = await fetchUsers();
        console.log("Full API response (users):", usersRes);
        if (usersRes.data && usersRes.data.data) {
          const foundReceiver = usersRes.data.data.find(user => user._id === receiverId || user.id === receiverId);
          if (foundReceiver) {
            console.log("Found receiver with userName:", foundReceiver.userName);
            setReceiver(foundReceiver);
          } else {
            console.log("No receiver found in fetchUsers, trying getUserProfile...");
            const profileRes = await getUserProfile(receiverId);
            console.log("Full API response (profile):", profileRes);
            if (profileRes.data && profileRes.data.data) {
              setReceiver(profileRes.data.data);
            } else {
              console.log("No user data found in profileRes");
              setReceiver({ userName: "Không tìm thấy", name: "Không tìm thấy" });
              Alert.alert("Lỗi", "Không thể tải thông tin người dùng.");
            }
          }
        }
      } catch (err) {
        console.log("Lỗi tải thông tin người nhận:", err.response ? err.response.data : err.message);
        setReceiver({ userName: "Lỗi tải dữ liệu", name: "Lỗi tải dữ liệu" });
        Alert.alert("Lỗi", "Đã xảy ra lỗi khi tải thông tin người dùng.");
      } finally {
        setLoadingReceiver(false);
      }
    };

    loadMyId();
    loadMessages();
    loadReceiver();

    socketService.on("newMessage", (msg) => {
      console.log("New message received:", msg);
      if (msg.sender.id === receiverId || msg.receiver.id === receiverId) {
        setMessages((prev) => {
          const updatedMessages = [...prev, msg].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
          return updatedMessages;
        });
      }
    });

    return () => {
      socketService.off("newMessage");
    };
  }, [receiverId]);

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    try {
      console.log("Sending message to receiverId:", receiverId, "with content:", message);
      const payload = { text: message, image: null };
      const res = await sendMessage(receiverId, payload);
      console.log("Send message response:", res.data);
      setMessages((prev) => {
        const updatedMessages = [...prev, res.data.data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
        return updatedMessages;
      });
      socketService.emit("newMessage", res.data.data);
      setMessage("");
    } catch (err) {
      console.log("Lỗi gửi tin nhắn:", err.response ? err.response.data : err.message);
      Alert.alert("Lỗi", "Không thể gửi tin nhắn.");
    }
  };

  const renderItem = ({ item }) => {
    const isMyMessage = item.senderId._id === myId;
    return (
      <View style={[styles.messageItem, isMyMessage ? styles.myMessage : styles.otherMessage]}>
        <Text style={styles.messageText}>{item.text || item.content}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.header}>
        {receiver && receiver.profilePicture ? (
          <Image source={{ uri: receiver.profilePicture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        <Text style={styles.headerTitle}>
          {loadingReceiver ? "Đang tải..." : receiver?.userName || receiver?.name || "Không tìm thấy người dùng"}
        </Text>
        <Text style={styles.headerSub}>Đang hoạt động</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <View style={{ flex: 1 }}>
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
              data={messages}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              contentContainerStyle={{ padding: 10, paddingBottom: 15 }}
              style={{ flex: 1 }}
            />
          )}
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Nhập tin nhắn..."
            value={message}
            onChangeText={setMessage}
          />
          <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
            <Text style={styles.sendText}>Gửi</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#00695c",
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ccc",
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  headerSub: {
    fontSize: 14,
    color: "white",
    marginTop: 2,
  },
  messageItem: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    maxWidth: "70%",
  },
  myMessage: {
    backgroundColor: "#007AFF",
    alignSelf: "flex-end",
    marginLeft: "30%",
  },
  otherMessage: {
    backgroundColor: "#e0e0e0",
    alignSelf: "flex-start",
    marginRight: "30%",
  },
  messageText: {
    fontSize: 16,
    color: "#000",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
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
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: 80,
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
    paddingHorizontal: 20,
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