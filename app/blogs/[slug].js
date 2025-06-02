import axios from "axios";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";

export default function BlogDetailScreen() {
  const { slug } = useLocalSearchParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlog = async () => {
  try {
    const res = await axios.get(`http://192.168.0.198:5000/blogs/${slug}`);
    setBlog(res.data.data); // ✅ sửa tại đây
  } catch (err) {
    console.log("Lỗi khi load blog:", err);
  } finally {
    setLoading(false);
  }
};


    fetchBlog();
  }, [slug]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" />;
  if (!blog) return <Text style={{ padding: 20 }}>Không tìm thấy bài viết</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{blog.title}</Text>

      {blog.author && (
        <View style={styles.author}>
          {blog.author.avatar && (
            <Image source={{ uri: blog.author.avatar }} style={styles.avatar} />
          )}
          <Text style={styles.authorName}>{blog.author.username}</Text>
        </View>
      )}

      <Text style={styles.content}>{blog.content}</Text>

     {blog.tags && blog.tags.length > 0 && (
  <View style={styles.tags}>
    {blog.tags.map((tag) => (
      <Text key={tag._id} style={styles.tag}>#{tag.tagName}</Text>
    ))}
  </View>
)}


      <Text style={styles.likeText}>❤️ {blog.likes?.length || 0} lượt thích</Text>

      <Text style={styles.commentHeader}>💬 Bình luận</Text>
      {blog.comments && blog.comments.length > 0 ? (
        blog.comments.map((comment) => (
          <View key={comment.id} style={styles.comment}>
            <Image source={{ uri: comment.author.avatar }} style={styles.commentAvatar} />
            <View>
              <Text style={styles.commentName}>{comment.author.username}</Text>
              <Text>{comment.content}</Text>
            </View>
          </View>
        ))
      ) : (
        <Text>Chưa có bình luận nào.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10
  },
  author: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 20,
    marginRight: 10
  },
  authorName: {
    fontWeight: "500"
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12
  },
  tag: {
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6
  },
  likeText: {
    marginBottom: 12,
    fontWeight: "600"
  },
  commentHeader: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8
  },
  comment: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 6
  },
  commentName: {
    fontWeight: "600"
  }
});
