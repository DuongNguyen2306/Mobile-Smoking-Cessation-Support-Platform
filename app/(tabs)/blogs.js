"use client"

import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useFocusEffect } from "@react-navigation/native"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { deleteBlog, fetchBlogs } from "../services/api"

const { width } = Dimensions.get("window")

export default function BlogsScreen() {
  const router = useRouter()
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredBlogs, setFilteredBlogs] = useState([])
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    loadBlogs()
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredBlogs(blogs)
    } else {
      const filtered = blogs.filter(
        (blog) =>
          blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          blog.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          blog.user?.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          blog.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredBlogs(filtered)
    }
  }, [blogs, searchQuery])

  useFocusEffect(
    useCallback(() => {
      loadBlogs()
    }, []),
  )

  const getCurrentUser = async () => {
    try {
      const userData = await AsyncStorage.getItem("user")
      if (userData) {
        const user = JSON.parse(userData)
        setCurrentUser(user)
        console.log("👤 Current user loaded:", user)
      }
    } catch (error) {
      console.log("❌ Lỗi lấy thông tin user:", error)
    }
  }

  const loadBlogs = async () => {
    try {
      const res = await fetchBlogs()
      console.log("✅ Danh sách blog từ API:", res.data)
      setBlogs(res.data.data?.blogs || res.data.blogs || res.data || [])
    } catch (err) {
      console.log("❌ Lỗi tải blogs:", err)
      console.log("❌ Chi tiết lỗi:", err.response?.data)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    loadBlogs()
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const handleDeleteBlog = (blogId, blogTitle) => {
    Alert.alert("Xác nhận xóa", `Bạn có chắc chắn muốn xóa bài viết "${blogTitle}"?`, [
      {
        text: "Hủy",
        style: "cancel",
      },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            console.log("🗑️ Đang xóa blog với ID:", blogId)
            await deleteBlog(blogId)

            // Cập nhật state ngay lập tức
            setBlogs((prevBlogs) => prevBlogs.filter((blog) => (blog._id || blog.id) !== blogId))

            console.log("✅ Xóa blog thành công")
            Alert.alert("Thành công", "Bài viết đã được xóa thành công!")
          } catch (error) {
            console.error("❌ Lỗi xóa blog:", error)
            const errorMessage = error.response?.data?.message || "Không thể xóa bài viết. Vui lòng thử lại."
            Alert.alert("Lỗi", errorMessage)
          }
        },
      },
    ])
  }

  const handleEditBlog = (blog) => {
    const blogId = blog._id || blog.id
    const slug = blog.slug

    console.log("✏️ Editing blog:")
    console.log("📝 Blog object:", blog)
    console.log("🆔 Blog ID:", blogId)
    console.log("🔗 Blog slug:", slug)

    // Truyền cả blogId và slug để đảm bảo
    if (blogId) {
      router.push(`/editBlog?blogId=${blogId}&slug=${slug || ""}`)
    } else if (slug) {
      router.push(`/editBlog?slug=${slug}`)
    } else {
      Alert.alert("Lỗi", "Không tìm thấy ID hoặc slug của bài viết")
    }
  }

  const isOwner = (blog) => {
    if (!currentUser || !blog.user) {
      return false
    }

    const currentUserId = currentUser._id || currentUser.id
    const blogUserId = blog.user._id || blog.user.id || blog.userId

    console.log("🔍 Kiểm tra quyền sở hữu:")
    console.log("👤 Current User ID:", currentUserId)
    console.log("✍️ Blog User ID:", blogUserId)
    console.log("🔐 Is Owner:", currentUserId === blogUserId)

    return currentUserId === blogUserId
  }

  const renderBlogCard = ({ item, index }) => (
    <TouchableOpacity
      style={[styles.card, { marginTop: index === 0 ? 0 : 16 }]}
      onPress={() => {
        console.log("Điều hướng đến chi tiết blog với slug:", item.slug)
        router.push(`/blogs/${item.slug}`)
      }}
      activeOpacity={0.8}
    >
      <LinearGradient colors={["#FFFFFF", "#F8FFF8"]} style={styles.cardGradient}>
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Ionicons name="leaf" size={12} color="#4CAF50" />
            <Text style={styles.categoryText}>Sức khỏe</Text>
          </View>
          <View style={styles.cardActions}>
            <Text style={styles.dateText}>{item.createdAt ? formatDate(item.createdAt) : ""}</Text>
            {isOwner(item) && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={(e) => {
                    e.stopPropagation()
                    console.log("✏️ Chỉnh sửa blog của mình:", item._id || item.id)
                    handleEditBlog(item)
                  }}
                >
                  <Ionicons name="create-outline" size={16} color="#FF9800" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={(e) => {
                    e.stopPropagation()
                    console.log("🗑️ Xóa blog của mình:", item._id || item.id)
                    handleDeleteBlog(item._id || item.id, item.title)
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#F44336" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {isOwner(item) && (
          <View style={styles.ownerIndicator}>
            <Ionicons name="person-circle" size={14} color="#4CAF50" />
            <Text style={styles.ownerText}>Bài viết của bạn</Text>
          </View>
        )}

        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description && (
          <Text style={styles.cardDescription} numberOfLines={3}>
            {item.description.replace(/<[^>]*>/g, "")}
          </Text>
        )}
        <View style={styles.cardFooter}>
          <View style={styles.authorInfo}>
            <View style={styles.authorAvatar}>
              <Ionicons name="person" size={16} color="#4CAF50" />
            </View>
            <Text style={styles.authorName}>{item.user?.userName || item.user?.name || "Tác giả"}</Text>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="heart-outline" size={14} color="#666" />
              <Text style={styles.statText}>{item.likes?.length || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={14} color="#666" />
              <Text style={styles.statText}>{item.comments?.length || 0}</Text>
            </View>
          </View>
        </View>
        <View style={styles.readMoreContainer}>
          <Text style={styles.readMoreText}>Đọc tiếp</Text>
          <Ionicons name="arrow-forward" size={16} color="#4CAF50" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={["#E8F5E8", "#F1F8E9"]} style={styles.loadingGradient}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Đang tải bài viết...</Text>
          </View>
        </LinearGradient>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#2E7D32", "#4CAF50"]} style={styles.headerGradient}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <Ionicons name="library" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Thư Viện Bài Viết</Text>
              <Text style={styles.headerSubtitle}>Khám phá hành trình bỏ thuốc lá</Text>
            </View>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.searchButton} onPress={() => setShowSearch(!showSearch)}>
              <Ionicons name="search" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.createButton} onPress={() => router.push("/createBlog")}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm bài viết, tác giả..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={showSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={styles.content}>
        {blogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>Chưa có bài viết nào</Text>
            <Text style={styles.emptySubtitle}>Hãy tạo bài viết đầu tiên của bạn</Text>
            <TouchableOpacity style={styles.createFirstButton} onPress={() => router.push("/createBlog")}>
              <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.createFirstGradient}>
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.createFirstText}>Tạo bài viết đầu tiên</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredBlogs}
            keyExtractor={(item) => item._id?.toString() || item.id?.toString() || item.slug?.toString()}
            renderItem={renderBlogCard}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} tintColor="#4CAF50" />
            }
          />
        )}
      </View>
    </SafeAreaView>
  )
}

// Styles remain the same...
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
  loadingContent: {
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "500",
  },
  headerGradient: {
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    backgroundColor: "#F8FFF8",
  },
  list: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  card: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  cardGradient: {
    borderRadius: 16,
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
    marginLeft: 4,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 12,
    color: "#888",
    marginRight: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 8,
    lineHeight: 24,
  },
  cardDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E8F5E8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  authorName: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "500",
  },
  statsContainer: {
    flexDirection: "row",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
  },
  statText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  readMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  readMoreText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "500",
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  createFirstButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  createFirstGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  createFirstText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  ownerIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  ownerText: {
    fontSize: 11,
    color: "#4CAF50",
    fontWeight: "500",
    marginLeft: 4,
  },
  searchContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 4,
  },
  clearButton: {
    marginLeft: 8,
  },
})
