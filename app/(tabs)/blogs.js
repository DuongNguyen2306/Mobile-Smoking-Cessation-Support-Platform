import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { fetchBlogs } from "../services/api";

export default function BlogsScreen() {
  const router = useRouter();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        const res = await fetchBlogs();
        console.log("Dữ liệu blog nhận được:", res.data.data.blogs);
        setBlogs(res.data.data.blogs || []);
      } catch (err) {
        console.log("Lỗi tải blogs:", err);
      } finally {
        setLoading(false);
      }
    };
    loadBlogs();
  }, []);

  if (loading) return <ActivityIndicator style={styles.loading} size="large" />;

  return (
    <FlatList
      data={blogs}
      keyExtractor={(item) => item.id?.toString() || item.slug?.toString()}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>{item.title}</Text>
          <Text numberOfLines={2}>{item.content}</Text>
          <Text onPress={() => {
            console.log("Điều hướng đến chi tiết blog với slug:", item.slug);
            router.push(`/blogs/${item.slug}`);
          }}>Xem chi tiết</Text>
        </View>
      )}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center" },
  list: { padding: 16 },
  card: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#ccc", marginBottom: 10 },
  title: { fontSize: 16, fontWeight: "bold" },
});