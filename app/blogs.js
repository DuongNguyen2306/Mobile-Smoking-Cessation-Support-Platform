import axios from "axios";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";

export default function BlogListScreen() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await axios.get("http://192.168.0.198:5000/blogs");
        console.log("DATA BLOG:", res.data.data.blogs);
        setBlogs(res.data.data.blogs);
      } catch (err) {
        console.error("Lỗi khi lấy blogs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  const renderItem = ({ item }) => (
    <Pressable
      onPress={() => {
        if (item.slug) {
          router.push(`/blogs/${item.slug}`);
        } else {
          alert("Blog này không có đường dẫn chi tiết (slug)");
        }
      }}
    >
      <View style={styles.card}>
        <Text style={styles.title}>{item.title}</Text>
        <Text numberOfLines={2}>{item.content}</Text>

        {item.author ? (
          <View style={styles.author}>
            {item.author.avatar && (
              <Image source={{ uri: item.author.avatar }} style={styles.avatar} />
            )}
            <Text>{item.author.username || "Không rõ tác giả"}</Text>
          </View>
        ) : (
          <Text style={{ marginTop: 8, fontStyle: "italic" }}>Không rõ tác giả</Text>
        )}
      </View>
    </Pressable>
  );

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;

  return (
    <FlatList
      data={blogs}
      keyExtractor={(item, index) => item.id?.toString() || index.toString()}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 16 }}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2
  },
  title: {
    fontSize: 16,
    fontWeight: "bold"
  },
  author: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8
  }
});
