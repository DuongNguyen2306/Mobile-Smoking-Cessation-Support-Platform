import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { LinearGradient } from "expo-linear-gradient"
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import RenderHtml from "react-native-render-html"
import API from "../../services/api"

const { width } = Dimensions.get("window")

// Color constants
const COLORS = {
  primary: "#4CAF50",
  secondary: "#2E7D32",
  error: "#FF5722",
  text: "#333",
  lightText: "#666",
  placeholder: "#999",
  background: "#F8FFF8",
  lightBackground: "#F1F8E9",
  white: "#FFFFFF",
  overlay: "rgba(0,0,0,0.3)",
  instagram: "#E4405F",
  instagramGradient: ["#833AB4", "#C13584", "#E1306C", "#FD1D1D"],
}

// Hàm định dạng thời gian theo múi giờ Việt Nam (UTC+7)
const formatDateTime = (dateString) => {
  try {
    if (!dateString) return "Vừa xong"
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Vừa xong"
    return date.toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch (error) {
    console.error("Error formatting date:", error)
    return "Không xác định"
  }
}

// Hàm định dạng thời gian tương đối (như Instagram)
const formatRelativeTime = (dateString) => {
  try {
    if (!dateString) return "vừa xong"
    const now = new Date()
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "vừa xong"

    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "vừa xong"
    if (diffMins < 60) return `${diffMins} phút`
    if (diffHours < 24) return `${diffHours} giờ`
    if (diffDays < 7) return `${diffDays} ngày`
    return formatDateTime(dateString)
  } catch (error) {
    console.error("Error formatting relative time:", error)
    return "Không xác định"
  }
}

// Hàm kiểm tra ObjectId hợp lệ
const isValidObjectId = (id) => {
  const objectIdPattern = /^[0-9a-fA-F]{24}$/
  return objectIdPattern.test(id)
}

// Hàm lấy danh sách following từ AsyncStorage
const getStoredFollowing = async () => {
  try {
    const followingData = await AsyncStorage.getItem("following")
    return followingData ? JSON.parse(followingData) : []
  } catch (err) {
    console.error("Lỗi khi lấy danh sách following từ AsyncStorage:", err)
    return []
  }
}

// Hàm lưu danh sách following vào AsyncStorage
const storeFollowing = async (followingList) => {
  try {
    await AsyncStorage.setItem("following", JSON.stringify(followingList))
  } catch (err) {
    console.error("Lỗi khi lưu danh sách following vào AsyncStorage:", err)
  }
}

export default function BlogDetailScreen() {
  const { slug } = useLocalSearchParams()
  const router = useRouter()
  const [blog, setBlog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState("")
  const [userId, setUserId] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [commentLoading, setCommentLoading] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [likeAnimation] = useState(new Animated.Value(1))
  const [followAnimation] = useState(new Animated.Value(1))
  const [toastMessage, setToastMessage] = useState(null)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editedComment, setEditedComment] = useState("")

  // Hiển thị thông báo tạm thời
  const showToast = (message) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Hiệu ứng hoạt hình khi nhấn thích
  const triggerLikeAnimation = () => {
    Animated.sequence([
      Animated.timing(likeAnimation, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(likeAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start()
  }

  // Hiệu ứng hoạt hình khi nhấn follow
  const triggerFollowAnimation = () => {
    Animated.sequence([
      Animated.timing(followAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(followAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()
  }

  // Tải dữ liệu blog và thông tin người dùng
  const loadBlogAndUser = useCallback(async () => {
    try {
      setLoading(true)
      const token = await AsyncStorage.getItem("token")
      if (!token) {
        Alert.alert("Thông báo", "Vui lòng đăng nhập để tiếp tục")
        router.push("/(auth)/login")
        return
      }

      const userData = await AsyncStorage.getItem("user")
      if (userData) {
        const parsedUser = JSON.parse(userData)
        const currentUserId = parsedUser._id || parsedUser.id
        setUserId(currentUserId)
        setCurrentUser(parsedUser)
        console.log("Current user:", parsedUser)
      }

      const res = await API.get(`/blogs/${slug}`)
      console.log("Blog data:", res.data.data)

      const transformedBlog = {
        ...res.data.data,
        id: res.data.data._id || res.data.data.id,
        tags: res.data.data.tags ? (Array.isArray(res.data.data.tags) ? res.data.data.tags : [res.data.data.tags]) : [],
        user: res.data.data.user || {},
        likes: res.data.data.likes || [],
        comments: res.data.data.comments || [],
      }
      setBlog(transformedBlog)
      console.log("Comments:", transformedBlog.comments)

      const targetUserId = transformedBlog.user?._id || transformedBlog.user?.id
      if (targetUserId && isValidObjectId(targetUserId)) {
        const followingList = await getStoredFollowing()
        setIsFollowing(followingList.includes(targetUserId))
      }
    } catch (err) {
      console.error("Lỗi tải blog chi tiết:", err)
      if (err.response?.status === 401) {
        router.replace("/(auth)/login")
      }
      Alert.alert("Lỗi", "Không thể tải bài viết. Vui lòng thử lại.")
    } finally {
      setLoading(false)
    }
  }, [slug, router, refreshKey])

  useEffect(() => {
    loadBlogAndUser()
  }, [loadBlogAndUser])

  // Thêm function để refresh follow status
  const refreshFollowStatus = useCallback(async () => {
    try {
      const targetUserId = blog?.user?._id || blog?.user?.id
      if (targetUserId && isValidObjectId(targetUserId)) {
        const followingList = await getStoredFollowing()
        setIsFollowing(followingList.includes(targetUserId))
        console.log("🔄 Blog: Refreshed follow status:", followingList.includes(targetUserId))
      }
    } catch (error) {
      console.error("❌ Blog: Error refreshing follow status:", error)
    }
  }, [blog?.user?._id, blog?.user?.id])

  // Thêm useFocusEffect để refresh follow status khi screen focus
  useFocusEffect(
    useCallback(() => {
      if (blog?.user?._id || blog?.user?.id) {
        console.log("👀 Blog detail screen focused, refreshing follow status...")
        refreshFollowStatus()
      }
    }, [refreshFollowStatus, blog?.user?._id, blog?.user?.id]),
  )

  // Xử lý nhấn thích
  const handleLike = useCallback(async () => {
    if (!userId) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để thích bài viết")
      router.push("/(auth)/login")
      return
    }

    if (likeLoading || !blog?.id) return

    setLikeLoading(true)
    const wasLiked = blog.likes?.some((like) => like === userId)

    setBlog((prev) => ({
      ...prev,
      likes: wasLiked ? prev.likes.filter((like) => like !== userId) : [...(prev.likes || []), userId],
    }))
    triggerLikeAnimation()
    showToast(wasLiked ? "Đã bỏ thích ❤️" : "Đã thích bài viết 💚")

    try {
      const response = await API.post(`/blogs/${blog.id}/like`)
      setBlog((prev) => ({
        ...prev,
        likes: response.data.data.likes || prev.likes,
      }))
    } catch (err) {
      console.error("Lỗi thích bài viết:", err)
      setBlog((prev) => ({
        ...prev,
        likes: wasLiked ? [...(prev.likes || []), userId] : prev.likes.filter((like) => like !== userId),
      }))
      Alert.alert("Lỗi", err.response?.data?.message || "Không thể thích bài viết")
    }
    setLikeLoading(false)
  }, [blog?.id, userId, likeLoading, router])

  // Xử lý thêm bình luận
  const handleAddComment = useCallback(async () => {
    if (!userId || !currentUser) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để bình luận")
      router.push("/(auth)/login")
      return
    }

    if (!comment.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập nội dung bình luận")
      return
    }

    if (comment.length < 3) {
      Alert.alert("Thông báo", "Bình luận phải có ít nhất 3 ký tự")
      return
    }

    if (comment.length > 500) {
      Alert.alert("Thông báo", "Bình luận không được vượt quá 500 ký tự")
      return
    }

    if (commentLoading || !blog?.id) return

    setCommentLoading(true)

    // Tạo comment tạm thời với đầy đủ thông tin user
    const tempComment = {
      _id: `temp-${Date.now()}`,
      text: comment,
      author: {
        _id: userId,
        userName: currentUser?.userName || currentUser?.name || currentUser?.email?.split("@")[0] || "Bạn",
        email: currentUser?.email || "",
        profilePicture: currentUser?.avatar || currentUser?.profilePicture || null,
      },
      blog: blog.id,
      createdAt: new Date().toISOString(),
      isTemp: true,
    }

    setBlog((prev) => ({
      ...prev,
      comments: [...(prev.comments || []), tempComment],
    }))

    setComment("")
    showToast("Đã đăng bình luận! 💬")

    try {
      const response = await API.post(`/blogs/${blog.id}/comment`, {
        comment: comment,
      })

      console.log("Comment response:", response.data)
      const serverComment = response.data.data

      setBlog((prev) => ({
        ...prev,
        comments: prev.comments.map((c) => (c._id === tempComment._id ? serverComment : c)),
      }))
    } catch (err) {
      console.error("Lỗi thêm bình luận:", err)
      setBlog((prev) => ({
        ...prev,
        comments: prev.comments.filter((c) => c._id !== tempComment._id),
      }))
      Alert.alert("Lỗi", "Không thể thêm bình luận. Vui lòng thử lại.")
    }
    setCommentLoading(false)
  }, [blog?.id, userId, currentUser, comment, commentLoading, router])

  // Xử lý xem hồ sơ
  const handleViewProfile = async () => {
    const targetUserId = blog?.user?._id || blog?.user?.id

    if (!targetUserId) {
      Alert.alert("Lỗi", "Không tìm thấy ID người dùng")
      return
    }

    try {
      router.push(`/userProfile?userId=${targetUserId}`)
    } catch (err) {
      console.error("Lỗi khi điều hướng đến hồ sơ người dùng:", err)
      Alert.alert("Lỗi", "Không thể mở trang hồ sơ người dùng")
    }
  }

  // Xử lý theo dõi/bỏ theo dõi (Local only - API not available)
  const handleFollow = async () => {
  const targetUserId = blog?.user?._id || blog?.user?.id;
  if (!targetUserId) return;

  try {
    let followingList = await getStoredFollowing();
    const wasFollowing = isFollowing;

    if (wasFollowing) {
      followingList = followingList.filter((id) => id !== targetUserId);
      setIsFollowing(false);
      await API.put(`/users/unfollow/${targetUserId}`);
    } else {
      followingList.push(targetUserId);
      setIsFollowing(true);
      await API.put(`/users/follow/${targetUserId}`);
    }

    await storeFollowing(followingList);
    showToast(wasFollowing ? "Đã bỏ theo dõi 👋" : "Đã theo dõi 🎉");
  } catch (error) {
    console.error("❌ Error toggling follow:", error.message);
    showToast("Có lỗi xảy ra khi cập nhật theo dõi.");
  }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={[COLORS.lightBackground, COLORS.background]} style={styles.loadingGradient}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải bài viết...</Text>
        </LinearGradient>
      </View>
    )
  }

  if (!blog) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>Không tìm thấy bài viết</Text>
      </View>
    )
  }

  const isLiked = blog.likes?.some((like) => like === userId)
  const maxCommentLength = 500

  return (
    <SafeAreaView style={styles.container}>
      {toastMessage && (
        <Animated.View style={styles.toastContainer}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.toastGradient}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </LinearGradient>
        </Animated.View>
      )}

      <LinearGradient colors={[COLORS.secondary, COLORS.primary]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Quay lại danh sách bài viết"
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {blog.title || "Bài viết"}
          </Text>
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="share-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {blog.image && blog.image.length > 0 && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: blog.image[0] }} style={styles.blogImage} resizeMode="cover" />
            <LinearGradient colors={["transparent", COLORS.overlay]} style={styles.imageOverlay} />
          </View>
        )}

        <View style={styles.contentContainer}>
          <Text style={styles.title}>{blog.title || "Không có tiêu đề"}</Text>

          <View style={styles.metaContainer}>
            <View style={styles.dateContainer}>
              <Ionicons name="time-outline" size={16} color={COLORS.primary} />
              <Text style={styles.dateText}>{formatRelativeTime(blog.createdAt)}</Text>
            </View>
            <View style={styles.categoryBadge}>
              <Ionicons name="leaf" size={12} color={COLORS.primary} />
              <Text style={styles.categoryText}>Sức khỏe</Text>
            </View>
          </View>

          {/* Instagram-style Author Section */}
          <View style={styles.instagramAuthorSection}>
            <View style={styles.authorContainer}>
              <View style={styles.avatarWrapper}>
                {blog.user?.avatar || blog.user?.profilePicture ? (
                  <Image source={{ uri: blog.user.avatar || blog.user.profilePicture }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={24} color={COLORS.primary} />
                  </View>
                )}
                <LinearGradient colors={COLORS.instagramGradient} style={styles.avatarBorder} />
              </View>
              <View style={styles.authorInfo}>
                <TouchableOpacity onPress={handleViewProfile}>
                  <Text style={styles.authorName}>{blog.user?.userName || blog.user?.name || "Tác giả"}</Text>
                </TouchableOpacity>
                <Text style={styles.authorRole}>{blog.user?.role || "Thành viên"}</Text>
              </View>
            </View>

            {/* Chỉ hiển thị nút follow nếu không phải chính mình */}
            {blog.user?._id !== userId && blog.user?.id !== userId && (
              <Animated.View style={{ transform: [{ scale: followAnimation }] }}>
                <TouchableOpacity
                  style={[
                    styles.instagramFollowButton,
                    isFollowing && styles.instagramUnfollowButton,
                    followLoading && styles.followButtonDisabled,
                  ]}
                  onPress={handleFollow}
                  disabled={followLoading}
                  accessibilityLabel={isFollowing ? "Bỏ theo dõi tác giả" : "Theo dõi tác giả"}
                >
                  {followLoading ? (
                    <View style={styles.followingContent}>
                      <ActivityIndicator size="small" color={COLORS.text} />
                    </View>
                  ) : isFollowing ? (
                    <View style={styles.followingContent}>
                      <Ionicons name="checkmark" size={16} color={COLORS.text} />
                      <Text style={styles.instagramUnfollowText}>Đang theo dõi</Text>
                    </View>
                  ) : (
                    <LinearGradient colors={COLORS.instagramGradient} style={styles.followGradient}>
                      <Text style={styles.instagramFollowText}>Theo dõi</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>

          <View style={styles.htmlContainer}>
            <RenderHtml
              contentWidth={width - 40}
              source={{ html: blog.description || "<p>Không có nội dung</p>" }}
              tagsStyles={{
                p: { fontSize: 16, color: COLORS.text, marginBottom: 12, lineHeight: 24 },
                h1: { fontSize: 24, fontWeight: "bold", color: COLORS.secondary, marginVertical: 16 },
                h2: { fontSize: 22, fontWeight: "bold", color: COLORS.secondary, marginVertical: 14 },
                h3: { fontSize: 20, fontWeight: "bold", color: COLORS.secondary, marginVertical: 12 },
                strong: { fontWeight: "bold", color: COLORS.secondary },
                ol: { marginLeft: 16, marginBottom: 12 },
                ul: { marginLeft: 16, marginBottom: 12 },
                li: { fontSize: 16, color: COLORS.text, marginBottom: 8, lineHeight: 22 },
                img: { width: "100%", height: 200, borderRadius: 8, marginVertical: 12 },
              }}
            />
          </View>

          {/* Instagram-style Actions */}
          <View style={styles.instagramActionsContainer}>
            <View style={styles.mainActions}>
              <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
                <TouchableOpacity style={styles.instagramActionButton} onPress={handleLike} disabled={likeLoading}>
                  {likeLoading ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Ionicons
                      name={isLiked ? "heart" : "heart-outline"}
                      size={28}
                      color={isLiked ? COLORS.error : COLORS.text}
                    />
                  )}
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity style={styles.instagramActionButton}>
                <Ionicons name="chatbubble-outline" size={26} color={COLORS.text} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.instagramActionButton}>
                <Ionicons name="paper-plane-outline" size={26} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.instagramActionButton}>
              <Ionicons name="bookmark-outline" size={26} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Likes and Comments Count */}
          <View style={styles.statsContainer}>
            <Text style={styles.likesCount}>
              {blog.likes?.length > 0 && <Text style={styles.boldText}>{blog.likes.length} lượt thích</Text>}
            </Text>
            {blog.comments?.length > 0 && (
              <Text style={styles.commentsCount}>Xem tất cả {blog.comments.length} bình luận</Text>
            )}
          </View>

          {/* Instagram-style Comment Input */}
          <View style={styles.instagramCommentInput}>
            <View style={styles.commentInputWrapper}>
              {currentUser?.avatar || currentUser?.profilePicture ? (
                <Image
                  source={{ uri: currentUser.avatar || currentUser.profilePicture }}
                  style={styles.commentInputAvatar}
                />
              ) : (
                <View style={[styles.commentInputAvatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={16} color={COLORS.primary} />
                </View>
              )}
              <TextInput
                style={styles.commentInput}
                value={comment}
                onChangeText={setComment}
                placeholder="Thêm bình luận..."
                placeholderTextColor={COLORS.placeholder}
                multiline
                maxLength={maxCommentLength}
              />
              <TouchableOpacity
                style={[styles.postButton, !comment.trim() && styles.postButtonDisabled]}
                onPress={handleAddComment}
                disabled={commentLoading || !comment.trim()}
              >
                {commentLoading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Text style={[styles.postButtonText, !comment.trim() && styles.postButtonTextDisabled]}>Đăng</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            {blog.comments && blog.comments.length > 0 ? (
              blog.comments.map((item) => (
                <View key={item._id} style={styles.instagramCommentItem}>
                  <View style={styles.commentHeader}>
                    {item.author?.profilePicture ? (
                      <Image source={{ uri: item.author.profilePicture }} style={styles.commentAvatar} />
                    ) : (
                      <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={16} color={COLORS.primary} />
                      </View>
                    )}
                    <View style={styles.commentContent}>
                      <Text style={styles.commentText}>
                        <Text style={styles.commentAuthor}>
                          {item.author?.userName ||
                            item.author?.name ||
                            item.author?.email?.split("@")[0] ||
                            "Người dùng"}
                        </Text>{" "}
                        {item.text}
                      </Text>
                      <View style={styles.commentMeta}>
                        <Text style={styles.commentTime}>{formatRelativeTime(item.createdAt)}</Text>
                        <TouchableOpacity style={styles.commentAction}>
                          <Text style={styles.commentActionText}>Thích</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.commentAction}>
                          <Text style={styles.commentActionText}>Trả lời</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.commentLikeButton}>
                    <Ionicons name="heart-outline" size={12} color={COLORS.placeholder} />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.noCommentsContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color={COLORS.placeholder} />
                <Text style={styles.noCommentsText}>Chưa có bình luận nào</Text>
                <Text style={styles.noCommentsSubtext}>Hãy là người đầu tiên chia sẻ suy nghĩ!</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: COLORS.error,
    fontWeight: "500",
  },
  toastContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: "center",
  },
  toastGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  toastText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  headerGradient: {
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
    marginHorizontal: 16,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    position: "relative",
  },
  blogImage: {
    width: "100%",
    height: 300,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    lineHeight: 32,
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 14,
    color: COLORS.lightText,
    marginLeft: 4,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.lightBackground,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 12,
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 4,
  },
  // Instagram-style Author Section
  instagramAuthorSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#EFEFEF",
    marginBottom: 20,
  },
  authorContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    zIndex: 1,
  },
  avatarBorder: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    top: -3,
    left: -3,
    zIndex: 0,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.lightBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  authorRole: {
    fontSize: 14,
    color: COLORS.lightText,
  },
  // Instagram-style Follow Button
  instagramFollowButton: {
    borderRadius: 8,
    overflow: "hidden",
    minWidth: 100,
    height: 32,
  },
  instagramUnfollowButton: {
    backgroundColor: "#EFEFEF",
    borderWidth: 1,
    borderColor: "#DBDBDB",
  },
  followButtonDisabled: {
    opacity: 0.6,
  },
  followGradient: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  followingContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  instagramFollowText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  instagramUnfollowText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  htmlContainer: {
    marginBottom: 24,
  },
  // Instagram-style Actions
  instagramActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#EFEFEF",
    marginBottom: 12,
  },
  mainActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  instagramActionButton: {
    marginRight: 16,
    padding: 4,
  },
  statsContainer: {
    marginBottom: 16,
  },
  likesCount: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  boldText: {
    fontWeight: "600",
  },
  commentsCount: {
    fontSize: 14,
    color: COLORS.lightText,
  },
  // Instagram-style Comment Input
  instagramCommentInput: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#EFEFEF",
    paddingBottom: 16,
    marginBottom: 16,
  },
  commentInputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  commentInputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 8,
    paddingHorizontal: 0,
    maxHeight: 80,
  },
  postButton: {
    marginLeft: 12,
    paddingVertical: 8,
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  postButtonTextDisabled: {
    color: COLORS.placeholder,
  },
  // Instagram-style Comments
  commentsSection: {
    marginBottom: 24,
  },
  instagramCommentItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  commentHeader: {
    flexDirection: "row",
    flex: 1,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  commentAuthor: {
    fontWeight: "600",
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentTime: {
    fontSize: 12,
    color: COLORS.lightText,
    marginRight: 16,
  },
  commentAction: {
    marginRight: 16,
  },
  commentActionText: {
    fontSize: 12,
    color: COLORS.lightText,
    fontWeight: "600",
  },
  commentLikeButton: {
    padding: 4,
    marginLeft: 8,
  },
  noCommentsContainer: {
    alignItems: "center",
    padding: 32,
  },
  noCommentsText: {
    fontSize: 16,
    color: COLORS.lightText,
    marginTop: 12,
    fontWeight: "500",
  },
  noCommentsSubtext: {
    fontSize: 14,
    color: COLORS.placeholder,
    marginTop: 4,
  },
})