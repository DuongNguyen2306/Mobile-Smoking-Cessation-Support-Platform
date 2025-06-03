import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Button, FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { fetchMessages, markRead, sendMessage } from "../../services/api";

export default function ChatDetailScreen() {
  const { receiverId } = useLocalSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadMessages = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.replace("/(auth)/login");
        return;
      }

      const res = await fetchMessages(receiverId);
      setMessages(res.data.data || []);
      await markRead(receiverId);
    } catch (err) {
      console.log("Lỗi tải tin nhắn:", err);
      if (err.response?.status === 401) {
        router.replace("/(auth)/login");
      }
    } finally {
      setLoading(false);
    }
  }, [receiverId, router]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      try {
        await sendMessage(receiverId, { content: newMessage });
        setNewMessage("");
        loadMessages();
      } catch (err) {
        console.log("Lỗi gửi tin nhắn:", err);
        if (err.response?.status === 401) {
          router.replace("/(auth)/login");
        }
      }
    }
  };

  if (loading) return <ActivityIndicator style={styles.loading} size="large" />;

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => (
          <View style={styles.messageItem}>
            <Text>{item.content}</Text>
            <Text style={styles.timestamp}>{new Date(item.createdAt).toLocaleTimeString()}</Text>
          </View>
        )}
        contentContainerStyle={styles.messageList}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Nhập tin nhắn..."
        />
        <Button title="Gửi" onPress={handleSendMessage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  loading: { flex: 1, justifyContent: "center" },
  messageList: { paddingBottom: 10 },
  messageItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#ccc" },
  timestamp: { fontSize: 12, color: "#888" },
  inputContainer: { flexDirection: "row", alignItems: "center", padding: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", padding: 5, marginRight: 10 },
});