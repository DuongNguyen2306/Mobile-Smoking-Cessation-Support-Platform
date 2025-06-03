import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from "react-native";
import { fetchBlogBySlug } from "../../services/api";

export default function BlogDetailScreen() {
  const { slug } = useLocalSearchParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBlog = async () => {
      try {
        const res = await fetchBlogBySlug(slug);
        console.log("Dữ liệu blog chi tiết:", res.data.data);
        const transformedBlog = {
          ...res.data.data,
          tags: res.data.data.tags ? (Array.isArray(res.data.data.tags) ? res.data.data.tags : [res.data.data.tags]) : [],
        };
        setBlog(transformedBlog);
      } catch (err) {
        console.log("Lỗi tải blog chi tiết:", err);
      } finally {
        setLoading(false);
      }
    };
    if (slug) loadBlog();
  }, [slug]);

  if (loading) return <ActivityIndicator style={styles.loading} size="large" />;

  if (!blog) return <Text style={styles.error}>Không tìm thấy blog</Text>;

  return (
    <FlatList
      ListHeaderComponent={
        <View style={styles.container}>
          <Text style={styles.title}>{blog.title}</Text>
          <View style={styles.authorContainer}>
            {blog.author?.avatar ? (
              <Image source={{ uri: blog.author.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]} />
            )}
            <View>
              <Text style={styles.authorName}>{blog.author?.username || "Ẩn danh"}</Text>
              <Text style={styles.authorEmail}>{blog.author?.email}</Text>
            </View>
          </View>
          <Text style={styles.content}>{blog.content}</Text>
          <View style={styles.tagsContainer}>
            <Text style={styles.sectionTitle}>Thẻ:</Text>
            {blog.tags && Array.isArray(blog.tags) ? (
              blog.tags.map((tag, index) => (
                <Text
                  key={typeof tag === "string" ? tag : tag.id || `tag-${index}`}
                  style={styles.tag}
                >
                  {typeof tag === "string" ? tag : tag.tagName || tag.name || "Không có tên thẻ"}
                </Text>
              ))
            ) : (
              <Text style={styles.noData}>Không có thẻ</Text>
            )}
          </View>
          <Text style={styles.sectionTitle}>Lượt thích ({blog.likes?.length || 0}):</Text>
          {blog.likes?.length > 0 ? (
            blog.likes.map((like) => (
              <View key={like.id} style={styles.likeItem}>
                <Text>{like.username}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noData}>Chưa có lượt thích</Text>
          )}
          <Text style={styles.sectionTitle}>Bình luận ({blog.comments?.length || 0}):</Text>
        </View>
      }
      data={blog.comments || []}
      keyExtractor={(item, index) => item.id?.toString() || `comment-${index}`}
      renderItem={({ item }) => (
        <View style={styles.commentItem}>
          <Text style={styles.commentAuthor}>
            {item.author?.username || "Ẩn danh"}<Text>: </Text>
          </Text>
          <Text style={styles.commentContent}>{item.content}</Text>
          <Text style={styles.commentDate}>
            {new Date(item.createdAt).toLocaleString("vi-VN")}
          </Text>
        </View>
      )}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center" },
  error: { padding: 16, textAlign: "center", color: "red" },
  container: { padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
  authorContainer: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 8 },
  avatarPlaceholder: { backgroundColor: "#ccc" },
  authorName: { fontSize: 16, fontWeight: "600" },
  authorEmail: { fontSize: 14, color: "#666" },
  content: { fontSize: 16, marginBottom: 16 },
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  tag: { fontSize: 14, backgroundColor: "#e0e6e0", padding: 4, borderRadius: 4, marginRight: 4, marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginTop: 12, marginBottom: 8 },
  likeItem: { padding: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  commentItem: { padding: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  commentAuthor: { fontWeight: "bold" },
  commentContent: { marginVertical: 4 },
  commentDate: { fontSize: 12, color: "#888" },
  noData: { color: "#666", fontStyle: "italic" },
  list: { paddingBottom: 20 },
});