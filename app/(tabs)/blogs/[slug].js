"use client"

import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { LinearGradient } from "expo-linear-gradient"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
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
import { addComment, fetchBlogBySlug, followUser, likeBlog, sendMessage, unfollowUser } from "../../services/api"

const { width } = Dimensions.get("window")

// Hàm định dạng thời gian theo múi giờ Việt Nam (UTC+7)
const formatDateTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
}

// Hàm kiểm tra xem một chuỗi có phải là ObjectId hợp lệ không
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
  const [isFollowing, setIsFollowing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [commentLoading, setCommentLoading] = useState(false)

  useEffect(() => {
    const loadBlogAndUser = async () => {
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

        const res = await fetchBlogBySlug(slug)
        const transformedBlog = {
          ...res.data.data,
          tags: res.data.data.tags
            ? Array.isArray(res.data.data.tags)
              ? res.data.data.tags
              : [res.data.data.tags]
            : [],
        }
        setBlog(transformedBlog)

        const followingList = await getStoredFollowing()
        const targetUserId = transformedBlog.user._id || transformedBlog.user.id
        setIsFollowing(followingList.includes(targetUserId))
      } catch (err) {
        console.log("Lỗi tải blog chi tiết:", err)
        if (err.response?.status === 401) {
          router.replace("/(auth)/login")
        }
      } finally {
        setLoading(false)
      }
    }
    loadBlogAndUser()
  }, [slug, router, userId, refreshKey])

  const handleLike = async () => {
    if (!userId) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để thích bài viết")
      router.push("/(auth)/login")
      return
    }

    try {
      await likeBlog(blog.id)
      const res = await fetchBlogBySlug(slug)
      setBlog({
        ...res.data.data,
        tags: res.data.data.tags ? (Array.isArray(res.data.data.tags) ? res.data.data.tags : [res.data.data.tags]) : [],
      })
    } catch (err) {
      console.log("Lỗi thích bài viết:", err)
      Alert.alert("Lỗi", "Không thể thích bài viết")
    }
  }

  const handleAddComment = async () => {
    if (!userId) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để bình luận")
      router.push("/(auth)/login")
      return
    }

    if (!comment.trim()) {
      Alert.alert("Thông báo", "Vui lòng nhập nội dung bình luận")
      return
    }

    setCommentLoading(true)
    try {
      await addComment(blog.id, comment)
      setComment("")
      const res = await fetchBlogBySlug(slug)
      setBlog({
        ...res.data.data,
        tags: res.data.data.tags ? (Array.isArray(res.data.data.tags) ? res.data.data.tags : [res.data.data.tags]) : [],
      })
    } catch (err) {
      console.log("Lỗi thêm bình luận:", err)
      Alert.alert("Lỗi", "Không thể thêm bình luận")
    } finally {
      setCommentLoading(false)
    }
  }

  const handleViewProfile = () => {
    if (blog.user._id || blog.user.id) {
      const userId = blog.user._id || blog.user.id
      if (!isValidObjectId(userId)) {
        Alert.alert("Lỗi", "ID người dùng không hợp lệ")
        return
      }
      router.push({
        pathname: "/[id]",
        params: { id: userId },
      })
    }
  }

  const handleFollow = async () => {
    if (!userId) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để follow")
      router.push("/(auth)/login")
      return
    }

    const targetUserId = blog.user._id || blog.user.id
    if (!isValidObjectId(targetUserId)) {
      Alert.alert("Lỗi", "ID người dùng không hợp lệ")
      return
    }

    try {
      const token = await AsyncStorage.getItem("token")
      if (!token) {
        Alert.alert("Thông báo", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
        router.push("/(auth)/login")
        return
      }

      let followingList = await getStoredFollowing()

      if (isFollowing) {
        await unfollowUser(targetUserId)
        followingList = followingList.filter((userId) => userId !== targetUserId)
        await storeFollowing(followingList)
        setIsFollowing(false)
        setRefreshKey((prev) => prev + 1)
        Alert.alert("Thông báo", `Đã bỏ theo dõi ${blog.user.userName}`)
      } else {
        const response = await followUser(targetUserId)
        if (response.data?.status === "fail" && response.data?.message === "Already following this user") {
          Alert.alert("Thông báo", "Bạn đã follow người dùng này trước đó!")
          if (!followingList.includes(targetUserId)) {
            followingList.push(targetUserId)
            await storeFollowing(followingList)
          }
          setIsFollowing(true)
          setRefreshKey((prev) => prev + 1)
          return
        }
        followingList.push(targetUserId)
        await storeFollowing(followingList)
        setIsFollowing(true)
        setRefreshKey((prev) => prev + 1)
        Alert.alert("Thông báo", `Đã follow ${blog.user.userName}`)

        try {
          await sendMessage(targetUserId, { text: `${userId} đã follow bạn!` })
        } catch (sendErr) {
          console.error("Lỗi gửi tin nhắn:", sendErr.message)
        }
      }
    } catch (err) {
      console.error("Lỗi follow/unfollow:", err.message)
      Alert.alert("Lỗi", err.response?.data?.message || "Không thể thực hiện hành động")
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={["#E8F5E8", "#F1F8E9"]} style={styles.loadingGradient}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Đang tải bài viết...</Text>
        </LinearGradient>
      </View>
    )
  }

  if (!blog) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF5722" />
        <Text style={styles.errorText}>Không tìm thấy bài viết</Text>
      </View>
    )
  }

  const isLiked = blog.likes?.some((like) => like === userId)

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#2E7D32", "#4CAF50"]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {blog.title}
          </Text>
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="share-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Blog Image */}
        {blog.image && blog.image.length > 0 && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: blog.image[0] }} style={styles.blogImage} resizeMode="cover" />
            <LinearGradient colors={["transparent", "rgba(0,0,0,0.3)"]} style={styles.imageOverlay} />
          </View>
        )}

        {/* Content Container */}
        <View style={styles.contentContainer}>
          {/* Title */}
          <Text style={styles.title}>{blog.title}</Text>

          {/* Meta Info */}
          <View style={styles.metaContainer}>
            <View style={styles.dateContainer}>
              <Ionicons name="time-outline" size={16} color="#4CAF50" />
              <Text style={styles.dateText}>{formatDateTime(blog.createdAt)}</Text>
            </View>
            <View style={styles.categoryBadge}>
              <Ionicons name="leaf" size={12} color="#4CAF50" />
              <Text style={styles.categoryText}>Sức khỏe</Text>
            </View>
          </View>

          {/* Author Section */}
          <View style={styles.authorSection}>
            <View style={styles.authorContainer}>
              {blog.user?.avatar ? (
                <Image source={{ uri: blog.user.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons name="person" size={24} color="#4CAF50" />
                </View>
              )}
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{blog.user?.userName || blog.user?.name || "Tác giả"}</Text>
                <Text style={styles.authorEmail}>{blog.user?.role || "Thành viên"}</Text>
              </View>
            </View>

            <View style={styles.authorActions}>
              <TouchableOpacity style={styles.profileButton} onPress={handleViewProfile}>
                <Ionicons name="person-outline" size={16} color="#4CAF50" />
                <Text style={styles.profileButtonText}>Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.unfollowButton]}
                onPress={handleFollow}
              >
                <Ionicons name={isFollowing ? "person-remove" : "person-add"} size={16} color="#FFFFFF" />
                <Text style={styles.followButtonText}>{isFollowing ? "Bỏ theo dõi" : "Theo dõi"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <View style={styles.htmlContainer}>
            <RenderHtml
              contentWidth={width - 40}
              source={{ html: blog.description || "<p>Không có nội dung</p>" }}
              tagsStyles={{
                p: { fontSize: 16, color: "#333", marginBottom: 12, lineHeight: 24 },
                h1: { fontSize: 24, fontWeight: "bold", color: "#2E7D32", marginVertical: 16 },
                h2: { fontSize: 22, fontWeight: "bold", color: "#2E7D32", marginVertical: 14 },
                h3: { fontSize: 20, fontWeight: "bold", color: "#2E7D32", marginVertical: 12 },
                strong: { fontWeight: "bold", color: "#2E7D32" },
                ol: { marginLeft: 16, marginBottom: 12 },
                ul: { marginLeft: 16, marginBottom: 12 },
                li: { fontSize: 16, color: "#333", marginBottom: 8, lineHeight: 22 },
                img: { width: "100%", height: 200, borderRadius: 8, marginVertical: 12 },
              }}
            />
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={[styles.actionButton, isLiked && styles.likedButton]} onPress={handleLike}>
              <Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color={isLiked ? "#FFFFFF" : "#4CAF50"} />
              <Text style={[styles.actionText, isLiked && styles.likedText]}>{blog.likes?.length || 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={20} color="#4CAF50" />
              <Text style={styles.actionText}>{blog.comments?.length || 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="bookmark-outline" size={20} color="#4CAF50" />
              <Text style={styles.actionText}>Lưu</Text>
            </TouchableOpacity>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>Bình luận ({blog.comments?.length || 0})</Text>

            {/* Add Comment */}
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                value={comment}
                onChangeText={setComment}
                placeholder="Chia sẻ suy nghĩ của bạn..."
                placeholderTextColor="#999"
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.commentButton, commentLoading && styles.commentButtonDisabled]}
                onPress={handleAddComment}
                disabled={commentLoading}
              >
                {commentLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            {blog.comments && blog.comments.length > 0 ? (
              blog.comments.map((item, index) => (
                <View key={item._id?.toString() || `comment-${index}`} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    {item.author?.avatar ? (
                      <Image source={{ uri: item.author.avatar }} style={styles.commentAvatar} />
                    ) : (
                      <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={16} color="#4CAF50" />
                      </View>
                    )}
                    <View style={styles.commentInfo}>
                      <Text style={styles.commentAuthor}>
                        {item.author?.userName || item.author?.name || "Người dùng"}
                      </Text>
                      <Text style={styles.commentDate}>{formatDateTime(item.createdAt)}</Text>
                    </View>
                  </View>
                  <Text style={styles.commentContent}>{item.text}</Text>
                </View>
              ))
            ) : (
              <View style={styles.noCommentsContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color="#CCCCCC" />
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
    backgroundColor: "#F8FFF8",
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
    color: "#4CAF50",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FFF8",
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: "#FF5722",
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
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginHorizontal: 16,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
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
    color: "#2E7D32",
    lineHeight: 32,
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
    marginLeft: 4,
  },
  authorSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  authorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: "#E8F5E8",
    justifyContent: "center",
    alignItems: "center",
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E7D32",
    marginBottom: 2,
  },
  authorEmail: {
    fontSize: 14,
    color: "#666",
  },
  authorActions: {
    flexDirection: "row",
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  profileButtonText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "500",
    marginLeft: 4,
  },
  followButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  unfollowButton: {
    backgroundColor: "#FF5722",
  },
  followButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
    marginLeft: 4,
  },
  htmlContainer: {
    marginBottom: 24,
  },
  actionsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
  },
  likedButton: {
    backgroundColor: "#4CAF50",
  },
  actionText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "500",
    marginLeft: 6,
  },
  likedText: {
    color: "#FFFFFF",
  },
  commentsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 16,
  },
  commentInputContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  commentInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    maxHeight: 100,
    paddingRight: 12,
  },
  commentButton: {
    backgroundColor: "#4CAF50",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  commentButtonDisabled: {
    opacity: 0.7,
  },
  commentItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    marginRight: 12,
  },
  commentInfo: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E7D32",
    marginBottom: 2,
  },
  commentDate: {
    fontSize: 12,
    color: "#888",
  },
  commentContent: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
  noCommentsContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noCommentsText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
    marginTop: 12,
  },
  noCommentsSubtext: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
})
