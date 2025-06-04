import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { fetchBlogs } from "../services/api";

export default function BlogsScreen() {
  const router = useRouter();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        const res = await fetchBlogs();
        console.log("Danh sách blog từ API:", res.data.data.blogs);
        setBlogs(res.data.data.blogs || []);
      } catch (err) {
        console.log("Lỗi tải blogs:", err);
      } finally {
        setLoading(false);
      }
    };
    loadBlogs();
  }, []);

  if (loading) return <ActivityIndicator style={styles.loading} size="large" color="#4A90E2" />;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Danh sách Blog</Text>
      <FlatList
        data={blogs}
        keyExtractor={(item) => item._id?.toString() || item.slug?.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              console.log("Điều hướng đến chi tiết blog với slug:", item.slug);
              router.push(`/blogs/${item.slug}`);
            }}
          >
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.title}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  header: { fontSize: 24, fontWeight: "bold", padding: 16, color: "#333" },
  loading: { flex: 1, justifyContent: "center" },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: { padding: 16 },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
});