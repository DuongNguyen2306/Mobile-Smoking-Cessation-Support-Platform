"use client"

import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { fetchBlogs } from "../services/api"

const { width } = Dimensions.get("window")

export default function BlogsScreen() {
  const router = useRouter()
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadBlogs = async () => {
    try {
      const res = await fetchBlogs()
      console.log("Danh sách blog từ API:", res.data.data.blogs)
      setBlogs(res.data.data.blogs || [])
    } catch (err) {
      console.log("Lỗi tải blogs:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadBlogs()
  }, [])

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
          <Text style={styles.dateText}>{item.createdAt ? formatDate(item.createdAt) : ""}</Text>
        </View>

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
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="search" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {blogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>Chưa có bài viết nào</Text>
            <Text style={styles.emptySubtitle}>Hãy quay lại sau để đọc những bài viết mới nhất</Text>
          </View>
        ) : (
          <FlatList
            data={blogs}
            keyExtractor={(item) => item._id?.toString() || item.slug?.toString()}
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
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
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
  dateText: {
    fontSize: 12,
    color: "#888",
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
  },
})
