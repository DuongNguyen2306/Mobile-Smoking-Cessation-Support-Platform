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

        const [usersRes, convRes] = await Promise.all([fetchUsers(), fetchConversations()]);
        const normalizedUsers = usersRes.data.data.map(user => ({
          user: { _id: user._id, userName: user.userName, profilePicture: user.profilePicture },
          lastMessage: null,
          unreadCount: 0,
        }));
        setUsers(normalizedUsers);
        setConversations(convRes.data.data || []);
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

    socketService.on('newMessage', (message) => {
      if (message.receiverId.toString() === myId) {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.user._id.toString() === message.senderId.toString()
              ? { ...conv, unreadCount: (conv.unreadCount || 0) + 1 }
              : conv
          )
        );
      }
    });

    return () => {
      socketService.off('newMessage');
    };
  }, [router, myId]);

  if (loading) return <ActivityIndicator style={styles.loading} size="large" />;

  const handleChatWithUser = (receiverId) => {
  console.log("Navigating to chat with receiverId:", receiverId);
  if (receiverId) {
    // ✅ Sửa tại đây: từ `/chat/[receiverId]` → `/chat/${receiverId}`
    router.push(`/chat/${receiverId}`);
  } else {
    console.log("receiverId is invalid");
  }
};


  const renderItem = ({ item }) => {
    const user = item.user || item;
    const unreadCount = item.unreadCount || 0;
    const lastMessage = item.lastMessage?.content || 'No messages yet';

    return (
      <TouchableOpacity style={styles.chatItem} onPress={() => handleChatWithUser(user._id)}>
        <Image
          source={{ uri: user.profilePicture || 'https://via.placeholder.com/50' }}
          style={styles.avatar}
        />
        <View style={styles.chatInfo}>
          <Text style={styles.username}>{user.userName || 'Unknown User'}</Text>
          <Text style={styles.lastMessage}>{lastMessage}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 10 },
  chatInfo: { flex: 1 },
  username: { fontWeight: 'bold' },
  lastMessage: { fontSize: 12, color: '#666' },
  unreadBadge: {
    backgroundColor: 'red',
    borderRadius: 10,
    padding: 5,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadText: { color: 'white', fontSize: 12 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  subText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
});