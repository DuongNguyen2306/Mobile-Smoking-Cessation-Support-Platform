import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { fetchConversations, fetchUsers } from "../services/api";
import { socketService } from "../utils/socket";

export default function ChatScreen() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          router.replace("/(auth)/login");
          return;
        }

        const user = await AsyncStorage.getItem("user");
        const parsedUser = JSON.parse(user);
        setMyId(parsedUser.id);
        console.log("Loaded myId:", parsedUser.id);

        const [usersRes, convRes] = await Promise.all([fetchUsers(), fetchConversations()]);
        console.log("Users data:", usersRes.data.data);
        console.log("Conversations data:", convRes.data.data);

        const normalizedUsers = usersRes.data.data
          .filter((user) => user.role !== "admin") // Chỉ loại admin, tạm bỏ điều kiện user._id !== parsedUser.id để kiểm tra
          .map((user) => ({
            user: { _id: user._id, userName: user.userName, profilePicture: user.profilePicture },
            lastMessage: null,
            unreadCount: 0,
          }));
        setUsers(normalizedUsers);
        const normalizedConversations = convRes.data.data.map((conv) => ({
          user: conv.participants.find((p) => p._id !== parsedUser.id),
          lastMessage: conv.lastMessage,
          unreadCount: conv.unreadCount || 0,
        }));
        setConversations(normalizedConversations);
      } catch (err) {
        console.log("Lỗi tải dữ liệu chat:", err);
        if (err.response?.status === 401) {
          router.replace("/(auth)/login");
        }
      } finally {
        setLoading(false);
      }
    };
    checkAuthAndLoadData();
  }, [router]);

  useEffect(() => {
    if (myId) {
      socketService.connect(myId);
      socketService.emit("userStatus", { userId: myId, online: true });

      socketService.on("newMessage", (message) => {
        console.log("Received newMessage in chat:", message);
        const senderId = message.senderId?._id || message.senderId;
        const receiverId = message.receiverId?._id || message.receiverId;
        if (receiverId === myId || senderId === myId) {
          setConversations((prev) => {
            const targetId = receiverId === myId ? senderId : receiverId;
            const existingConv = prev.find((conv) => conv.user._id === targetId);
            if (existingConv) {
              return prev.map((conv) =>
                conv.user._id === targetId
                  ? {
                      ...conv,
                      lastMessage: message,
                      unreadCount: receiverId === myId ? (conv.unreadCount || 0) + 1 : conv.unreadCount,
                    }
                  : conv
              );
            } else {
              const user = users.find((u) => u.user._id === targetId);
              if (user) {
                return [
                  ...prev,
                  {
                    user: user.user,
                    lastMessage: message,
                    unreadCount: receiverId === myId ? 1 : 0,
                  },
                ];
              }
              return prev;
            }
          });
        }
      });

      socketService.on("userStatus", ({ userId, online }) => {
        console.log("Received userStatus:", { userId, online });
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          if (online) {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });
      });
    }

    return () => {
      if (myId) {
        socketService.emit("userStatus", { userId: myId, online: false });
        socketService.off("newMessage");
        socketService.off("userStatus");
      }
    };
  }, [myId, users]);

  if (loading) return <ActivityIndicator style={styles.loading} size="large" color="#00695c" />;

  const handleChatWithUser = (receiverId) => {
    if (receiverId) {
      router.push(`/chat/${receiverId}`);
    } else {
      console.log("receiverId is invalid");
    }
  };

  const renderItem = ({ item }) => {
    const user = item.user || item;
    const unreadCount = item.unreadCount || 0;
    const lastMessage = item.lastMessage?.text || item.lastMessage?.content || "Chưa có tin nhắn";

    return (
      <TouchableOpacity style={styles.chatItem} onPress={() => handleChatWithUser(user._id)}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: user.profilePicture || "https://via.placeholder.com/50" }}
            style={styles.avatar}
          />
          {onlineUsers.has(user._id) && <View style={styles.onlineIndicator} />}
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.username}>{user.userName || "Unknown User"}</Text>
            {onlineUsers.has(user._id) && <Text style={styles.onlineText}>Online</Text>}
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastMessage}
          </Text>
        </View>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!loading && conversations.length === 0 && users.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Tìm người để chat!</Text>
        <Text style={styles.subText}>Bắt đầu bằng cách kết nối với bạn bè hoặc tìm người dùng mới.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={conversations.length > 0 ? conversations : users}
      keyExtractor={(item) => (item.user?._id || item._id)?.toString()}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center" },
  list: { padding: 16 },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
    boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.1)",
  },
  avatarContainer: { position: "relative" },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 12,
    width: 12,
    height: 12,
    backgroundColor: "#4caf50",
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  username: { fontWeight: "bold", fontSize: 16, color: "#333" },
  onlineText: {
    fontSize: 12,
    color: "#4caf50",
    marginLeft: 8,
    fontWeight: "500",
  },
  lastMessage: { fontSize: 14, color: "#666" },
  unreadBadge: {
    backgroundColor: "#ef5350",
    borderRadius: 12,
    padding: 6,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  subText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
  },
});