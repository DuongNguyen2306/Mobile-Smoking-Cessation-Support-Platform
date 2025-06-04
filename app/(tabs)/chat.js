import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { fetchConversations, fetchUsers } from "../services/api";

export default function ChatScreen() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          router.replace("/(auth)/login");
          return;
        }

        const [usersRes, convRes] = await Promise.all([fetchUsers(), fetchConversations()]);
        setUsers(usersRes.data.data || []);
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
  }, [router]);

  if (loading) return <ActivityIndicator style={styles.loading} size="large" />;

  const handleChatWithUser = (receiverId) => {
    router.push(`/chat/${receiverId}`);
  };

  return (
    <FlatList
      data={conversations.length > 0 ? conversations : users}
      keyExtractor={(item) => item.id?.toString()}
      renderItem={({ item }) => (
        <View style={styles.chatItem}>
          <Text onPress={() => handleChatWithUser(item.id)}>{item.username || item.title}</Text>
        </View>
      )}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center" },
  list: { padding: 16 },
  chatItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#ccc" },
});