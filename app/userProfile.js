"use client"

import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { LinearGradient } from "expo-linear-gradient"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"
import { followUser, getFollowers, getFollowing, getUserProfile, sendMessage, unfollowUser } from "./services/api"

export default function UserProfileScreen() {
  const router = useRouter()
  const { userId } = useLocalSearchParams()
  const [user, setUser] = useState(null)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)

  const loadFollowCounts = useCallback(async (targetUserId) => {
    try {
      console.log("🔍 Loading follow counts for user:", targetUserId)

      const [followersRes, followingRes] = await Promise.allSettled([
        getFollowers(targetUserId, { page: 1, limit: 1000 }),
        getFollowing(targetUserId, { page: 1, limit: 1000 }),
      ])

      // Handle followers
      if (followersRes.status === "fulfilled") {
        const followersData = followersRes.value.data
        let count = 0
        if (followersData?.data?.followers) {
          count = Array.isArray(followersData.data.followers) ? followersData.data.followers.length : 0
        } else if (followersData?.followers) {
          count = Array.isArray(followersData.followers) ? followersData.followers.length : 0
        } else if (followersData?.data && Array.isArray(followersData.data)) {
          count = followersData.data.length
        }
        console.log("Followers count calculated:", count)
        setFollowersCount(count)
      }

      // Handle following
      if (followingRes.status === "fulfilled") {
        const followingData = followingRes.value.data
        let count = 0
        if (followingData?.data?.following) {
          count = Array.isArray(followingData.data.following) ? followingData.data.following.length : 0
        } else if (followingData?.following) {
          count = Array.isArray(followingData.following) ? followingData.following.length : 0
        } else if (followingData?.data && Array.isArray(followingData.data)) {
          count = followingData.data.length
        }
        console.log("Following count calculated:", count)
        setFollowingCount(count)
      }
    } catch (error) {
      console.log("❌ Error loading follow counts:", error)
    }
  }, [])

  const loadUserProfile = useCallback(async () => {
    try {
      setError(null)
      const token = await AsyncStorage.getItem("token")
      if (!token) {
        Alert.alert("Thông báo", "Vui lòng đăng nhập để tiếp tục", [
          { text: "OK", onPress: () => router.replace("/(auth)/login") },
        ])
        return
      }

      // Get current user ID
      const userData = await AsyncStorage.getItem("user")
      if (userData) {
        const parsedUser = JSON.parse(userData)
        setCurrentUserId(parsedUser._id || parsedUser.id)
      }

      console.log("🔍 Loading user profile for userId:", userId)
      const response = await getUserProfile(userId)
      console.log("📡 API response for user profile:", response.data)

      if (response.status === 200 && response.data) {
        let targetUserData
        if (response.data.data?.user) {
          targetUserData = response.data.data.user
        } else if (response.data.user) {
          targetUserData = response.data.user
        } else {
          targetUserData = response.data
        }
        if (!targetUserData || !targetUserData._id) {
          throw new Error("Dữ liệu người dùng không hợp lệ")
        }
        console.log("✅ Loaded user data:", targetUserData)
        setUser(targetUserData)

        // Load follow counts
        await loadFollowCounts(userId)

        // Check if current user is following this user
        const followingData = await AsyncStorage.getItem("following")
        const followingList = followingData ? JSON.parse(followingData) : []
        setIsFollowing(followingList.includes(userId))
      } else {
        throw new Error("Invalid response format")
      }
    } catch (err) {
      console.error("❌ Error loading user profile:", err)
      const errorMessage = err.response?.data?.message || err.message || "Không thể tải thông tin người dùng"
      setError(errorMessage)

      if (err.response?.status === 401) {
        Alert.alert("Phiên đăng nhập hết hạn", "Vui lòng đăng nhập lại", [
          { text: "OK", onPress: () => router.replace("/(auth)/login") },
        ])
      }
    }
  }, [userId, router, loadFollowCounts])

  useEffect(() => {
    if (userId) {
      const initLoad = async () => {
        setLoading(true)
        await loadUserProfile()
        setLoading(false)
      }
      initLoad()
    }
  }, [userId, loadUserProfile])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadUserProfile()
    setRefreshing(false)
  }, [loadUserProfile])

  const handleFollow = async () => {
    if (!currentUserId) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để follow")
      router.push("/(auth)/login")
      return
    }

    try {
      const followingData = await AsyncStorage.getItem("following")
      let followingList = followingData ? JSON.parse(followingData) : []

      if (isFollowing) {
        await unfollowUser(userId)
        followingList = followingList.filter((id) => id !== userId)
        await AsyncStorage.setItem("following", JSON.stringify(followingList))
        setIsFollowing(false)
        Alert.alert("Thành công", `Đã bỏ theo dõi ${user.userName || user.name}`)
      } else {
        await followUser(userId)
        followingList.push(userId)
        await AsyncStorage.setItem("following", JSON.stringify(followingList))
        setIsFollowing(true)
        Alert.alert("Thành công", `Đã theo dõi ${user.userName || user.name}`)

        // Send notification message
        try {
          await sendMessage(userId, { text: `${currentUserId} đã follow bạn!` })
        } catch (sendErr) {
          console.error("Lỗi gửi tin nhắn:", sendErr.message)
        }
      }

      // Refresh follow counts
      await loadFollowCounts(userId)
    } catch (err) {
      console.error("❌ Error toggling follow:", err)
      Alert.alert("Lỗi", err.response?.data?.message || "Không thể thực hiện thao tác")
    }
  }

  const handleViewFollowList = () => {
    router.push({
      pathname: "/followList",
      params: { userId: userId },
    })
  }

  const handleSendMessage = () => {
    router.push({
      pathname: "/chat/[receiverId]",
      params: { receiverId: userId },
    })
  }

  const formatDate = (dateString) => {
    if (!dateString) return "Chưa cập nhật"
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={["#E8F5E8", "#F1F8E9"]} style={styles.loadingGradient}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </LinearGradient>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF5722" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError(null)
            setLoading(true)
            loadUserProfile().finally(() => setLoading(false))
          }}
        >
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="person-outline" size={64} color="#FF5722" />
        <Text style={styles.errorText}>Không tìm thấy thông tin người dùng</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#2E7D32", "#4CAF50"]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thông tin người dùng</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} />}
      >
        {/* Profile Header */}
        <LinearGradient colors={["#2E7D32", "#4CAF50", "#66BB6A"]} style={styles.profileHeaderGradient}>
          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              <Image
                source={{ uri: user.avatar || "https://via.placeholder.com/120" }}
                style={styles.profileImage}
                resizeMode="cover"
              />
              <View style={styles.statusBadge}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              </View>
            </View>

            <Text style={styles.userName}>{user.userName || user.name || "Chưa cập nhật"}</Text>
            <Text style={styles.userEmail}>{user.email || "Chưa cập nhật"}</Text>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.unfollowButton]}
                onPress={handleFollow}
              >
                <Ionicons name={isFollowing ? "person-remove" : "person-add"} size={16} color="#FFFFFF" />
                <Text style={styles.followButtonText}>{isFollowing ? "Bỏ theo dõi" : "Theo dõi"}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.messageButton} onPress={handleSendMessage}>
                <Ionicons name="chatbubble-outline" size={16} color="#4CAF50" />
                <Text style={styles.messageButtonText}>Nhắn tin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <TouchableOpacity style={styles.statCard} onPress={handleViewFollowList}>
            <LinearGradient colors={["#FFFFFF", "#F8FFF8"]} style={styles.statGradient}>
              <Ionicons name="people" size={24} color="#4CAF50" />
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Đang theo dõi</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={handleViewFollowList}>
            <LinearGradient colors={["#FFFFFF", "#F8FFF8"]} style={styles.statGradient}>
              <Ionicons name="heart" size={24} color="#4CAF50" />
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Người theo dõi</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.statCard}>
            <LinearGradient colors={["#FFFFFF", "#F8FFF8"]} style={styles.statGradient}>
              <Ionicons name="calendar" size={24} color="#4CAF50" />
              <Text style={styles.statNumber}>{user.smokingFreeDays || 0}</Text>
              <Text style={styles.statLabel}>Ngày không hút</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>

          <View style={styles.infoCard}>
            <LinearGradient colors={["#FFFFFF", "#F8FFF8"]} style={styles.infoGradient}>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="person-outline" size={20} color="#4CAF50" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Giới tính</Text>
                  <Text style={styles.infoValue}>{user.gender || "Chưa cập nhật"}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="shield-outline" size={20} color="#4CAF50" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Vai trò</Text>
                  <Text style={styles.infoValue}>{user.role || "Thành viên"}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Trạng thái</Text>
                  <Text style={[styles.infoValue, { color: user.isActive ? "#4CAF50" : "#FF5722" }]}>
                    {user.isActive ? "Đang hoạt động" : "Không hoạt động"}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="calendar-outline" size={20} color="#4CAF50" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Ngày tham gia</Text>
                  <Text style={styles.infoValue}>{formatDate(user.createdAt)}</Text>
                </View>
              </View>
            </LinearGradient>
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
  scrollView: {
    flex: 1,
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
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#FF5722",
    fontWeight: "500",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  headerGradient: {
    paddingTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  placeholder: {
    width: 40,
  },
  profileHeaderGradient: {
    paddingTop: 20,
  },
  profileHeader: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statusBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
    textAlign: "center",
  },
  userEmail: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 20,
    textAlign: "center",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  followButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  unfollowButton: {
    backgroundColor: "#FF5722",
  },
  followButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
    marginLeft: 6,
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  messageButtonText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "500",
    marginLeft: 6,
  },
  statsSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statGradient: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E7D32",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 12,
  },
  infoCard: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoGradient: {
    borderRadius: 16,
    padding: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F5E8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
})