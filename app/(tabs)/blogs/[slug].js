"use client"

import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { LinearGradient } from "expo-linear-gradient"
import { useLocalSearchParams, useRouter } from "expo-router"
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
}

// Hàm định dạng thời gian theo múi giờ Việt Nam (UTC+7)
const formatDateTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
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
    Alert.alert("Lỗi", "Không thể truy cập danh sách theo dõi")
    return []
  }
}

// Hàm lưu danh sách following vào AsyncStorage
const storeFollowing = async (followingList) => {
  try {
    await AsyncStorage.setItem("following", JSON.stringify(followingList))
  } catch (err) {
    console.error("Lỗi khi lưu danh sách following vào AsyncStorage:", err)
    Alert.alert("Lỗi", "Không thể lưu danh sách theo dõi")
  }
}

export default function BlogDetailScreen() {
  const { slug } = useLocalSearchParams()
  const router = useRouter()
  const [blog, setBlog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState("")
  const [userId, setUserId] = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [commentLoading, setCommentLoading] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [likeAnimation] = useState(new Animated.Value(1))
  const [toastMessage, setToastMessage] = useState(null)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editedComment, setEditedComment] = useState("")

  // Hiển thị thông báo tạm thời
  const showToast = (message) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 2000)
  }

  // Hiệu ứng hoạt hình khi nhấn thích
  const triggerLikeAnimation = () => {
    Animated.sequence([
      Animated.timing(likeAnimation, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(likeAnimation, {
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
        setUserId(parsedUser._id || parsedUser.id)
      }

      const res = await API.get(`/blogs/${slug}`)
      const transformedBlog = {
        ...res.data.data,
        id: res.data.data._id || res.data.data.id,
        tags: res.data.data.tags
          ? Array.isArray(res.data.data.tags)
            ? res.data.data.tags
            : [res.data.data.tags]
          : [],
        user: res.data.data.user || {},
        likes: res.data.data.likes || [],
        comments: res.data.data.comments || [],
      }
      setBlog(transformedBlog)

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
      likes: wasLiked
        ? prev.likes.filter((like) => like !== userId)
        : [...(prev.likes || []), userId],
    }))
    triggerLikeAnimation()
    showToast(wasLiked ? "Đã bỏ thích" : "Đã thích bài viết")

    let attempts = 0
    const maxAttempts = 3
    while (attempts < maxAttempts) {
      try {
        const response = await API.post(`/blogs/${blog.id}/like`)
        setBlog((prev) => ({
          ...prev,
          likes: response.data.data.likes || prev.likes,
        }))
        break
      } catch (err) {
        attempts++
        console.error(`Lỗi thích bài viết (thử ${attempts}/${maxAttempts}):`, err)
        if (attempts === maxAttempts) {
          setBlog((prev) => ({
            ...prev,
            likes: wasLiked
              ? [...(prev.likes || []), userId]
              : prev.likes.filter((like) => like !== userId),
          }))
          Alert.alert("Lỗi", err.response?.data?.message || "Không thể thích bài viết")
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
    setLikeLoading(false)
  }, [blog?.id, userId, likeLoading, router])

  // Xử lý thêm bình luận
  const handleAddComment = useCallback(async () => {
    if (!userId) {
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
    const userData = JSON.parse(await AsyncStorage.getItem("user"))
    const newComment = {
      _id: `temp-${Date.now()}`,
      author: { _id: userId, userName: userData?.userName || "Người dùng" },
      text: comment,
      createdAt: new Date().toISOString(),
    }

    setBlog((prev) => ({
      ...prev,
      comments: [...(prev.comments || []), newComment],
    }))
    showToast("Bình luận đã được đăng")

    let attempts = 0
    const maxAttempts = 3
    while (attempts < maxAttempts) {
      try {
        const response = await API.post(`/comments`, { // Replace with correct endpoint (e.g., /blogs/${blog.id}/comments)
          blogId: blog.id,
          text: comment,
        })
        setComment("")
        setBlog((prev) => ({
          ...prev,
          comments: prev.comments.map((c) =>
            c._id === newComment._id ? response.data.data : c
          ),
        }))
        break
      } catch (err) {
        attempts++
        console.error(`Lỗi thêm bình luận (thử ${attempts}/${maxAttempts}):`, err)
        if (attempts === maxAttempts) {
          setBlog((prev) => ({
            ...prev,
            comments: prev.comments.filter((c) => c._id !== newComment._id),
          }))
          Alert.alert("Lỗi", "Không thể thêm bình luận. Vui lòng kiểm tra kết nối hoặc thử lại sau.")
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
    setCommentLoading(false)
  }, [blog?.id, userId, comment, commentLoading, router])

  // Xử lý chỉnh sửa bình luận
  const handleEditComment = useCallback(async (commentId) => {
    if (!userId) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để chỉnh sửa bình luận")
      router.push("/(auth)/login")
      return
    }

    if (!editedComment.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập nội dung bình luận")
      return
    }

    if (editedComment.length < 3) {
      Alert.alert("Thông báo", "Bình luận phải có ít nhất 3 ký tự")
      return
    }

    if (editedComment.length > 500) {
      Alert.alert("Thông báo", "Bình luận không được vượt quá 500 ký tự")
      return
    }

    if (commentLoading || !blog?.id) return

    setCommentLoading(true)
    setBlog((prev) => ({
      ...prev,
      comments: prev.comments.map((c) =>
        c._id === commentId ? { ...c, text: editedComment, updatedAt: new Date().toISOString() } : c
      ),
    }))
    setEditingCommentId(null)
    setEditedComment("")
    showToast("Bình luận đã được chỉnh sửa")

    let attempts = 0
    const maxAttempts = 3
    while (attempts < maxAttempts) {
      try {
        const response = await API.put(`/blogs/${blog.id}/comments/${commentId}`, { text: editedComment })
        setBlog((prev) => ({
          ...prev,
          comments: prev.comments.map((c) =>
            c._id === commentId ? response.data.data : c
          ),
        }))
        break
      } catch (err) {
        attempts++
        console.error(`Lỗi chỉnh sửa bình luận (thử ${attempts}/${maxAttempts}):`, err)
        if (attempts === maxAttempts) {
          setBlog((prev) => ({
            ...prev,
            comments: prev.comments.map((c) =>
              c._id === commentId ? { ...c, text: c.text } : c
            ),
          }))
          Alert.alert("Lỗi", err.response?.data?.message || "Không thể chỉnh sửa bình luận")
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
    setCommentLoading(false)
  }, [blog?.id, userId, editedComment, commentLoading])

  // Xử lý xóa bình luận
  const handleDeleteComment = useCallback(async (commentId) => {
    if (!userId) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để xóa bình luận")
      router.push("/(auth)/login")
      return
    }

    if (!blog?.id) return

    Alert.alert(
      "Xác nhận",
      "Bạn có chắc muốn xóa bình luận này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            setCommentLoading(true)
            setBlog((prev) => ({
              ...prev,
              comments: prev.comments.filter((c) => c._id !== commentId),
            }))
            showToast("Bình luận đã được xóa")

            let attempts = 0
            const maxAttempts = 3
            while (attempts < maxAttempts) {
              try {
                await API.delete(`/blogs/${blog.id}/comments/${commentId}`)
                break
              } catch (err) {
                attempts++
                console.error(`Lỗi xóa bình luận (thử ${attempts}/${maxAttempts}):`, err)
                if (attempts === maxAttempts) {
                  setBlog((prev) => ({
                    ...prev,
                    comments: [...prev.comments],
                  }))
                  Alert.alert("Lỗi", err.response?.data?.message || "Không thể xóa bình luận")
                }
                await new Promise((resolve) => setTimeout(resolve, 1000))
              }
            }
            setCommentLoading(false)
          },
        },
      ],
      { cancelable: true }
    )
  }, [blog?.id, userId])

  // Xử lý xem hồ sơ
  const handleViewProfile = async () => {
  const targetUserId = blog?.user?._id || blog?.user?.id

  if (!targetUserId) {
    Alert.alert("Lỗi", "Không tìm thấy ID người dùng")
    return
  }

  try {
    // Điều hướng tới userProfile và truyền userId qua query
    router.push(`/userProfile?userId=${targetUserId}`)
  } catch (err) {
    console.error("Lỗi khi điều hướng đến hồ sơ người dùng:", err)
    Alert.alert("Lỗi", "Không thể mở trang hồ sơ người dùng")
  }
}


  // Xử lý theo dõi/bỏ theo dõi
  const handleFollow = async () => {
    if (!userId) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để theo dõi")
      router.push("/(auth)/login")
      return
    }

    const targetUserId = blog?.user?._id || blog?.user?.id
    if (!targetUserId || !isValidObjectId(targetUserId)) {
      Alert.alert("Lỗi", "ID người dùng không hợp lệ")
      return
    }

    try {
      let followingList = await getStoredFollowing()
      if (isFollowing) {
        await API.post(`/users/unfollow/${targetUserId}`)
        followingList = followingList.filter((id) => id !== targetUserId)
        await storeFollowing(followingList)
        setIsFollowing(false)
        showToast(`Đã bỏ theo dõi ${blog.user?.userName || "tác giả"}`)
      } else {
        await API.post(`/users/follow/${targetUserId}`)
        followingList.push(targetUserId)
        await storeFollowing(followingList)
        setIsFollowing(true)
        showToast(`Đã theo dõi ${blog.user?.userName || "tác giả"}`)
        router.push("/followList")
      }
    } catch (err) {
      console.error("Lỗi theo dõi/bỏ theo dõi:", err)
      Alert.alert("Lỗi", err.response?.data?.message || "Không thể thực hiện hành động")
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
        <View style={styles.toastContainer}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.toastGradient}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </LinearGradient>
        </View>
      )}

      <LinearGradient colors={[COLORS.secondary, COLORS.primary]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Quay lại danh sách bài viết"
            accessibilityHint="Trở về trang trước"
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {blog.title || "Bài viết"}
          </Text>
          <TouchableOpacity
            style={styles.shareButton}
            accessibilityLabel="Chia sẻ bài viết"
            accessibilityHint="Chia sẻ bài viết này với người khác"
          >
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
              <Text style={styles.dateText}>{formatDateTime(blog.createdAt)}</Text>
            </View>
            <View style={styles.categoryBadge}>
              <Ionicons name="leaf" size={12} color={COLORS.primary} />
              <Text style={styles.categoryText}>Sức khỏe</Text>
            </View>
          </View>

          <View style={styles.authorSection}>
            <View style={styles.authorContainer}>
              {blog.user?.avatar ? (
                <Image source={{ uri: blog.user.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={24} color={COLORS.primary} />
                </View>
              )}
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{blog.user?.userName || "Tác giả"}</Text>
                <Text style={styles.authorEmail}>{blog.user?.role || "Thành viên"}</Text>
              </View>
            </View>

            <View style={styles.authorActions}>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={handleViewProfile}
                accessibilityLabel="Xem hồ sơ tác giả"
                accessibilityHint="Mở trang hồ sơ của tác giả bài viết"
              >
                <Ionicons name="person-outline" size={16} color={COLORS.primary} />
                <Text style={styles.profileButtonText}>Hồ sơ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.unfollowButton]}
                onPress={handleFollow}
                accessibilityLabel={isFollowing ? "Bỏ theo dõi tác giả" : "Theo dõi tác giả"}
                accessibilityHint={isFollowing ? "Ngừng theo dõi tác giả này" : "Bắt đầu theo dõi tác giả này"}
              >
                <Ionicons
                  name={isFollowing ? "person-remove" : "person-add"}
                  size={16}
                  color={COLORS.white}
                />
                <Text style={styles.followButtonText}>{isFollowing ? "Bỏ theo dõi" : "Theo dõi"}</Text>
              </TouchableOpacity>
            </View>
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

          <View style={styles.analyticsContainer}>
            <Text style={styles.sectionTitle}>Thống kê tương tác</Text>
            <Text style={styles.analyticsText}>Lượt thích: {blog.likes?.length || 0}</Text>
            <Text style={styles.analyticsText}>Bình luận: {blog.comments?.length || 0}</Text>
          </View>

          <View style={styles.actionsContainer}>
            <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
              <TouchableOpacity
                style={[styles.actionButton, isLiked && styles.likedButton, likeLoading && styles.actionButtonDisabled]}
                onPress={handleLike}
                accessibilityLabel={isLiked ? "Bỏ thích bài viết" : "Thích bài viết"}
                accessibilityHint={isLiked ? "Bỏ thích bài viết này" : "Thích bài viết này"}
              >
                {likeLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Ionicons
                    name={isLiked ? "heart" : "heart-outline"}
                    size={20}
                    color={isLiked ? COLORS.white : COLORS.primary}
                  />
                )}
                <Text style={[styles.actionText, isLiked && styles.likedText]}>
                  {blog.likes?.length || 0}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              style={styles.actionButton}
              accessibilityLabel="Xem bình luận"
              accessibilityHint="Xem tất cả bình luận của bài viết"
            >
              <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
              <Text style={styles.actionText}>{blog.comments?.length || 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              accessibilityLabel="Lưu bài viết"
              accessibilityHint="Lưu bài viết để xem sau"
            >
              <Ionicons name="bookmark-outline" size={20} color={COLORS.primary} />
              <Text style={styles.actionText}>Lưu</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>Bình luận ({blog.comments?.length || 0})</Text>

            <View style={styles.commentInputContainer}>
              <View style={styles.commentInputWrapper}>
                <TextInput
                  style={styles.commentInput}
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Chia sẻ suy nghĩ của bạn..."
                  placeholderTextColor={COLORS.placeholder}
                  multiline
                  maxLength={maxCommentLength}
                  accessibilityLabel="Nhập bình luận"
                  accessibilityHint="Viết bình luận cho bài viết"
                />
                <Text style={styles.charCounter}>
                  {comment.length}/{maxCommentLength}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.commentButton, commentLoading && styles.commentButtonDisabled]}
                onPress={handleAddComment}
                disabled={commentLoading}
                accessibilityLabel="Gửi bình luận"
                accessibilityHint="Gửi bình luận bạn vừa nhập"
              >
                {commentLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Ionicons name="send" size={16} color={COLORS.white} />
                )}
              </TouchableOpacity>
            </View>

            {blog.comments && blog.comments.length > 0 ? (
              blog.comments.map((item) => (
                <View key={item._id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    {item.author?.avatar ? (
                      <Image source={{ uri: item.author.avatar }} style={styles.commentAvatar} />
                    ) : (
                      <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={16} color={COLORS.primary} />
                      </View>
                    )}
                    <View style={styles.commentInfo}>
                      <Text style={styles.commentAuthor}>{item.author?.userName || "Người dùng"}</Text>
                      <Text style={styles.commentDate}>
                        {formatDateTime(item.updatedAt || item.createdAt)}
                      </Text>
                    </View>
                  </View>
                  {editingCommentId === item._id ? (
                    <View style={styles.editCommentContainer}>
                      <TextInput
                        style={styles.commentInput}
                        value={editedComment}
                        onChangeText={setEditedComment}
                        multiline
                        maxLength={maxCommentLength}
                        accessibilityLabel="Chỉnh sửa bình luận"
                        accessibilityHint="Sửa nội dung bình luận của bạn"
                      />
                      <View style={styles.editCommentActions}>
                        <TouchableOpacity
                          style={styles.commentButton}
                          onPress={() => handleEditComment(item._id)}
                          disabled={commentLoading}
                          accessibilityLabel="Lưu chỉnh sửa bình luận"
                          accessibilityHint="Lưu các thay đổi của bình luận"
                        >
                          <Ionicons name="checkmark" size={16} color={COLORS.white} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.commentButton, styles.cancelButton]}
                          onPress={() => {
                            setEditingCommentId(null)
                            setEditedComment("")
                          }}
                          accessibilityLabel="Hủy chỉnh sửa bình luận"
                          accessibilityHint="Hủy việc chỉnh sửa bình luận"
                        >
                          <Ionicons name="close" size={16} color={COLORS.white} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.commentContent}>{item.text}</Text>
                  )}
                  {item.author?._id === userId && !editingCommentId && (
                    <View style={styles.commentActions}>
                      <TouchableOpacity
                        style={styles.commentActionButton}
                        onPress={() => {
                          setEditingCommentId(item._id)
                          setEditedComment(item.text)
                        }}
                        accessibilityLabel="Chỉnh sửa bình luận"
                        accessibilityHint="Sửa nội dung bình luận này"
                      >
                        <Ionicons name="pencil" size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.commentActionButton}
                        onPress={() => handleDeleteComment(item._id)}
                        accessibilityLabel="Xóa bình luận"
                        accessibilityHint="Xóa bình luận này"
                      >
                        <Ionicons name="trash" size={16} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  )}
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
    backgroundColor: COLORS.background,
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  toastText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "500",
  },
  headerGradient: {
    paddingTop: 10,
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
    height: 250,
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
    color: COLORS.secondary,
    lineHeight: 32,
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
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
  authorSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.lightBackground,
    borderRadius: 12,
    marginBottom: 16,
  },
  authorContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.lightBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  authorInfo: {
    justifyContent: "center",
  },
  authorName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  authorEmail: {
    fontSize: 14,
    color: COLORS.lightText,
  },
  authorActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.lightBackground,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
  },
  profileButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 4,
  },
  followButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  unfollowButton: {
    backgroundColor: COLORS.error,
  },
  followButtonText: {
    fontSize: 14,
    color: COLORS.white,
    marginLeft: 4,
  },
  htmlContainer: {
    marginBottom: 24,
  },
  analyticsContainer: {
    marginBottom: 24,
  },
  analyticsText: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.secondary,
    marginBottom: 12,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.lightBackground,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  likedButton: {
    backgroundColor: COLORS.primary,
  },
  actionText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 8,
  },
  likedText: {
    color: COLORS.white,
  },
  commentsSection: {
    marginBottom: 24,
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  commentInputWrapper: {
    flex: 1,
    position: "relative",
  },
  commentInput: {
    backgroundColor: COLORS.lightBackground,
    borderRadius: 20,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    maxHeight: 120,
    textAlignVertical: "top",
  },
  charCounter: {
    position: "absolute",
    bottom: 12,
    right: 12,
    fontSize: 12,
    color: COLORS.placeholder,
  },
  commentButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  commentButtonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    backgroundColor: COLORS.error,
  },
  commentItem: {
    backgroundColor: COLORS.lightBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  commentInfo: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  commentDate: {
    fontSize: 12,
    color: COLORS.placeholder,
  },
  commentContent: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  commentActionButton: {
    padding: 8,
  },
  editCommentContainer: {
    marginTop: 8,
  },
  editCommentActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  noCommentsContainer: {
    alignItems: "center",
    padding: 24,
  },
  noCommentsText: {
    fontSize: 16,
    color: COLORS.lightText,
    marginTop: 12,
  },
  noCommentsSubtext: {
    fontSize: 14,
    color: COLORS.placeholder,
    marginTop: 4,
  },
})