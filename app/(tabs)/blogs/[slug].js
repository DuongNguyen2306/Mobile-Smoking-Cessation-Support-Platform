import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import RenderHtml from "react-native-render-html";
import { addComment, fetchBlogBySlug, followUser, likeBlog, sendMessage, unfollowUser } from "../../services/api";

// Hàm định dạng thời gian theo múi giờ Việt Nam (UTC+7)
const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
};

// Hàm kiểm tra xem một chuỗi có phải là ObjectId hợp lệ không
const isValidObjectId = (id) => {
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  return objectIdPattern.test(id);
};

// Hàm lấy danh sách following từ AsyncStorage
const getStoredFollowing = async () => {
  try {
    const followingData = await AsyncStorage.getItem("following");
    return followingData ? JSON.parse(followingData) : [];
  } catch (err) {
    console.error("Lỗi khi lấy danh sách following từ AsyncStorage:", err);
    return [];
  }
};

// Hàm lưu danh sách following vào AsyncStorage
const storeFollowing = async (followingList) => {
  try {
    await AsyncStorage.setItem("following", JSON.stringify(followingList));
  } catch (err) {
    console.error("Lỗi khi lưu danh sách following vào AsyncStorage:", err);
  }
};

export default function BlogDetailScreen() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [userId, setUserId] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Thêm state để kích hoạt useEffect lại

  useEffect(() => {
    const loadBlogAndUser = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("token");
        console.log("Token:", token); // Debug token
        if (!token) {
          Alert.alert("Thông báo", "Vui lòng đăng nhập để tiếp tục");
          router.push("/(auth)/login");
          return;
        }

        const userData = await AsyncStorage.getItem("user");
        console.log("User data:", userData); // Debug user
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUserId(parsedUser._id || parsedUser.id);
        }

        const res = await fetchBlogBySlug(slug);
        const transformedBlog = {
          ...res.data.data,
          tags: res.data.data.tags
            ? Array.isArray(res.data.data.tags)
              ? res.data.data.tags
              : [res.data.data.tags]
            : [],
        };
        setBlog(transformedBlog);

        // Lấy danh sách following từ AsyncStorage
        let followingList = await getStoredFollowing();
        console.log("Following list from AsyncStorage:", followingList); // Debug

        const targetUserId = transformedBlog.user._id || transformedBlog.user.id;
        // Nếu danh sách rỗng, đồng bộ từ backend (giả sử dùng getUserProfile để lấy following tạm thời)
        if (!followingList.length && userId) {
          console.log("Attempting to sync following list from user profile or fallback");
          const userProfile = await getUserProfile(userId);
          if (userProfile.data?.user?.following) {
            followingList = userProfile.data.user.following.map((u) => u._id || u.id);
            await storeFollowing(followingList);
          } else {
            console.warn("No following data in user profile, using empty list");
          }
        }
        setIsFollowing(followingList.includes(targetUserId));
        console.log("Is following (initial):", followingList.includes(targetUserId)); // Debug
      } catch (err) {
        console.log("Lỗi tải blog chi tiết:", err);
        if (err.response?.status === 401) {
          router.replace("/(auth)/login");
        }
      } finally {
        setLoading(false);
      }
    };
    loadBlogAndUser();
  }, [slug, router, userId, refreshKey]);

  const handleLike = async () => {
    if (!userId) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để thích bài viết");
      router.push("/(auth)/login");
      return;
    }

    try {
      await likeBlog(blog.id);
      const res = await fetchBlogBySlug(slug);
      setBlog({
        ...res.data.data,
        tags: res.data.data.tags
          ? Array.isArray(res.data.data.tags)
            ? res.data.data.tags
            : [res.data.data.tags]
          : [],
      });
    } catch (err) {
      console.log("Lỗi thích bài viết:", err);
      Alert.alert("Lỗi", "Không thể thích bài viết");
    }
  };

  const handleAddComment = async () => {
    if (!userId) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để bình luận");
      router.push("/(auth)/login");
      return;
    }

    if (!comment.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập nội dung bình luận");
      return;
    }

    try {
      await addComment(blog.id, comment);
      setComment("");
      const res = await fetchBlogBySlug(slug);
      setBlog({
        ...res.data.data,
        tags: res.data.data.tags
          ? Array.isArray(res.data.data.tags)
            ? res.data.data.tags
            : [res.data.data.tags]
          : [],
      });
    } catch (err) {
      console.log("Lỗi thêm bình luận:", err);
      Alert.alert("Lỗi", "Không thể thêm bình luận");
    }
  };

  const handleViewProfile = () => {
    if (blog.user._id || blog.user.id) {
      const userId = blog.user._id || blog.user.id;
      if (!isValidObjectId(userId)) {
        Alert.alert("Lỗi", "ID người dùng không hợp lệ");
        return;
      }
      router.push({
        pathname: "/[id]",
        params: { id: userId },
      });
    }
  };

  const handleFollow = async () => {
    if (!userId) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để follow");
      router.push("/(auth)/login");
      return;
    }

    const targetUserId = blog.user._id || blog.user.id;
    if (!isValidObjectId(targetUserId)) {
      Alert.alert("Lỗi", "ID người dùng không hợp lệ");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Thông báo", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        router.push("/(auth)/login");
        return;
      }

      let followingList = await getStoredFollowing();

      if (isFollowing) {
        console.log("Calling unfollowUser with id:", targetUserId); // Debug
        const response = await unfollowUser(targetUserId);
        console.log("Unfollow response:", response); // Debug
        followingList = followingList.filter((userId) => userId !== targetUserId);
        await storeFollowing(followingList);
        setIsFollowing(false);
        setRefreshKey((prev) => prev + 1); // Kích hoạt useEffect lại
        Alert.alert("Thông báo", `Đã bỏ theo dõi ${blog.user.userName}`);
      } else {
        console.log("Calling followUser with id:", targetUserId); // Debug
        const response = await followUser(targetUserId);
        console.log("Follow response:", response); // Debug
        if (response.data?.status === "fail" && response.data?.message === "Already following this user") {
          Alert.alert("Thông báo", "Bạn đã follow người dùng này trước đó!");
          if (!followingList.includes(targetUserId)) {
            followingList.push(targetUserId);
            await storeFollowing(followingList);
          }
          setIsFollowing(true);
          setRefreshKey((prev) => prev + 1); // Kích hoạt useEffect lại
          return;
        }
        followingList.push(targetUserId);
        await storeFollowing(followingList);
        setIsFollowing(true);
        setRefreshKey((prev) => prev + 1); // Kích hoạt useEffect lại
        Alert.alert("Thông báo", `Đã follow ${blog.user.userName}`);
        // Gửi tin nhắn với payload đúng định dạng
        try {
          await sendMessage(targetUserId, { text: `${userId} đã follow bạn!` }); // Sử dụng 'text' thay vì 'content'
          console.log("Send message success");
        } catch (sendErr) {
          console.error("Lỗi gửi tin nhắn:", sendErr.message, "Response:", sendErr.response?.data);
          Alert.alert("Cảnh báo", "Follow thành công nhưng không thể gửi thông báo.");
        }
      }
    } catch (err) {
      console.error("Lỗi follow/unfollow:", err.message, "Response:", err.response?.data);
      if (err.response?.status === 401) {
        Alert.alert("Thông báo", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        router.push("/(auth)/login");
      } else if (err.response?.status === 400 && err.response?.data?.message === "Already following this user") {
        Alert.alert("Thông báo", "Bạn đã follow người dùng này trước đó!");
        let followingList = await getStoredFollowing();
        if (!followingList.includes(targetUserId)) {
          followingList.push(targetUserId);
          await storeFollowing(followingList);
          setIsFollowing(true);
          setRefreshKey((prev) => prev + 1); // Kích hoạt useEffect lại
        }
      } else {
        Alert.alert("Lỗi", err.response?.data?.message || "Không thể thực hiện hành động");
      }
    }
  };

  if (loading) return <ActivityIndicator style={styles.loading} size="large" color="#4A90E2" />;

  if (!blog) return <Text style={styles.error}>Không tìm thấy blog</Text>;

  const isLiked = blog.likes?.some((like) => like === userId);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <View style={styles.contentContainer}>
            <View style={styles.headerContainer}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>◄</Text>
              </TouchableOpacity>
              <Text style={styles.title}>{blog.title}</Text>
            </View>

            <View style={styles.authorContainer}>
              {blog.user?.avatar ? (
                <Image source={{ uri: blog.user.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]} />
              )}
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{blog.user?.userName || ""}</Text>
                <Text style={styles.authorEmail}>{blog.user?.email}</Text>
                <TouchableOpacity style={styles.profileButton} onPress={handleViewProfile}>
                  <Text style={styles.profileButtonText}>Xem profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.followButton, isFollowing && styles.unfollowButton]}
                  onPress={handleFollow}
                >
                  <Text style={styles.followButtonText}>
                    {isFollowing ? "Bỏ theo dõi" : "Follow"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.date}>Ngày tạo: {formatDateTime(blog.createdAt)}</Text>
            <Text style={styles.date}>Cập nhật: {formatDateTime(blog.updatedAt)}</Text>

            {blog.image && blog.image.length > 0 && (
              <Image
                source={{ uri: blog.image[0] }}
                style={styles.blogImage}
                resizeMode="cover"
              />
            )}

            <RenderHtml
              contentWidth={300}
              source={{ html: blog.description || "<p>Không có nội dung</p>" }}
              tagsStyles={{
                p: { fontSize: 16, color: "#333", marginBottom: 8 },
                h3: { fontSize: 20, fontWeight: "bold", color: "#333", marginVertical: 12 },
                strong: { fontWeight: "bold" },
                ol: { marginLeft: 16 },
                li: { fontSize: 16, color: "#333", marginBottom: 8 },
                img: { width: "100%", height: 200, resizeMode: "cover" },
              }}
            />

            <View style={styles.actionsContainer}>
              <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                <Text style={[styles.actionText, isLiked && styles.likedText]}>
                  {isLiked ? "Đã thích" : "Thích"} ({blog.likes?.length || 0})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionText}>Bình luận ({blog.comments?.length || 0})</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Bình luận:</Text>
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                value={comment}
                onChangeText={setComment}
                placeholder="Viết bình luận..."
                multiline
              />
              <TouchableOpacity style={styles.commentButton} onPress={handleAddComment}>
                <Text style={styles.commentButtonText}>Gửi</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        data={blog.comments || []}
        keyExtractor={(item, index) => item._id?.toString() || `comment-${index}`}
        renderItem={({ item }) => (
          <View style={styles.commentItem}>
            <View style={styles.commentHeader}>
              {item.author?.avatar ? (
                <Image source={{ uri: item.author.avatar }} style={styles.commentAvatar} />
              ) : (
                <View style={[styles.commentAvatar, styles.avatarPlaceholder]} />
              )}
              <View style={styles.commentInfo}>
                <Text style={styles.commentAuthor}>{item.author?.userName || ""}</Text>
                <Text style={styles.commentEmail}>{item.author?.email}</Text>
                <Text style={styles.commentDate}>{formatDateTime(item.createdAt)}</Text>
              </View>
            </View>
            <Text style={styles.commentContent}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  contentContainer: { padding: 16 },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
    backgroundColor: "#4A90E2",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginLeft: 12,
  },
  authorContainer: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  authorInfo: { marginLeft: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  avatarPlaceholder: { backgroundColor: "#ccc" },
  authorName: { fontSize: 16, fontWeight: "600", color: "#333" },
  authorEmail: { fontSize: 14, color: "#666" },
  profileButton: {
    padding: 6,
    backgroundColor: "#4A90E2",
    borderRadius: 8,
    marginTop: 4,
  },
  profileButtonText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  followButton: {
    padding: 6,
    backgroundColor: "#28a745",
    borderRadius: 8,
    marginTop: 4,
  },
  unfollowButton: {
    backgroundColor: "#dc3545",
  },
  followButtonText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  date: { fontSize: 14, color: "#888", marginBottom: 8 },
  blogImage: { width: "100%", height: 200, borderRadius: 8, marginBottom: 16 },
  actionsContainer: { flexDirection: "row", marginBottom: 16 },
  actionButton: { marginRight: 16 },
  actionText: { fontSize: 16, color: "#4A90E2" },
  likedText: { color: "#FF4D4F" },
  sectionTitle: { fontSize: 20, fontWeight: "bold", color: "#333", marginBottom: 12 },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 8,
    elevation: 2,
  },
  commentInput: {
    flex: 1,
    fontSize: 16,
    padding: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginRight: 8,
  },
  commentButton: {
    backgroundColor: "#4A90E2",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  commentButtonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  commentItem: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 1,
  },
  commentHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 12 },
  commentInfo: { flex: 1 },
  commentAuthor: { fontSize: 16, fontWeight: "600", color: "#333" },
  commentEmail: { fontSize: 14, color: "#666" },
  commentContent: { fontSize: 16, color: "#333", marginBottom: 8 },
  commentDate: { fontSize: 12, color: "#888" },
  loading: { flex: 1, justifyContent: "center" },
  error: { padding: 16, textAlign: "center", color: "red" },
  list: { paddingBottom: 20 },
});