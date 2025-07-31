
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
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import API, { getFollowers, getFollowing, getUserProfile } from "../services/api"

const { width } = Dimensions.get("window")

// Color constants
const COLORS = {
  primary: "#4CAF50",
  secondary: "#2E7D32",
  accent: "#66BB6A",
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
  success: "#4CAF50",
  warning: "#FF9800",
  unfollowGradient: ["#B0BEC5", "#78909C"],
}

const getStoredFollowing = async () => {
  try {
    const followingData = await AsyncStorage.getItem("following")
    return followingData ? JSON.parse(followingData) : []
  } catch (err) {
    console.error("Lỗi khi lấy danh sách following từ AsyncStorage:", err)
    return []
  }
}

const storeFollowing = async (followingList) => {
  try {
    await AsyncStorage.setItem("following", JSON.stringify(followingList))
  } catch (err) {
    console.error("Lỗi khi lưu danh sách following vào AsyncStorage:", err)
  }
}

export default function UserProfileScreen() {
  const router = useRouter()
  const { userId } = useLocalSearchParams()
  console.log("📌 Đang truy cập hồ sơ của userId:", userId)

  const [user, setUser] = useState(null)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followersList, setFollowersList] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [followLoading, setFollowLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

  // Animations
  const [fadeAnim] = useState(new Animated.Value(0))
  const [scaleAnim] = useState(new Animated.Value(0.9))
  const [followAnimation] = useState(new Animated.Value(1))

  const showToast = (message) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 3000)
  }

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

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const refreshFollowStatus = useCallback(async () => {
    try {
      const followingList = await getStoredFollowing()
      setIsFollowing(followingList.includes(userId))
      console.log("🔄 Refreshed follow status:", followingList.includes(userId))
    } catch (error) {
      console.error("❌ Error refreshing follow status:", error)
    }
  }, [userId])

  const loadFollowCounts = useCallback(async (targetUserId) => {
    try {
      console.log("🔍 Loading follow counts for user:", targetUserId)
      const [followersRes, followingRes] = await Promise.allSettled([
        getFollowers(targetUserId, { page: 1, limit: 1000 }),
        getFollowing(targetUserId, { page: 1, limit: 1000 }),
      ])

      if (followersRes.status === "fulfilled") {
        const followersData = followersRes.value.data
        console.log("📡 Raw followers response:", JSON.stringify(followersData, null, 2))

        let count = 0
        let followers = []

        if (followersData?.data?.followers && Array.isArray(followersData.data.followers)) {
          followers = followersData.data.followers
          count = followers.length
        } else if (followersData?.followers && Array.isArray(followersData.followers)) {
          followers = followersData.followers
          count = followers.length
        } else {
          console.warn("⚠️ Unexpected followers data structure:", followersData)
        }

        console.log("👥 Parsed followers list:", followers)
        console.log("🔢 Followers count:", count)

        setFollowersCount(count)
        setFollowersList(followers)
      } else {
        console.error("❌ Followers request failed:", followersRes.reason)
      }

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
        console.log("🔢 Following count calculated:", count)
        setFollowingCount(count)
      } else {
        console.error("❌ Following request failed:", followingRes.reason)
      }
    } catch (error) {
      console.error("❌ Error loading follow counts:", error.message)
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

        await loadFollowCounts(userId)
        await refreshFollowStatus()
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
  }, [userId, router, loadFollowCounts, refreshFollowStatus])

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

  useFocusEffect(
    useCallback(() => {
      console.log("👀 Profile screen focused, refreshing follow status...")
      refreshFollowStatus()
    }, [refreshFollowStatus]),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadUserProfile()
    setRefreshing(false)
  }, [loadUserProfile])

  const handleFollow = async () => {
    const targetUserId = userId
    if (!targetUserId) return

    setFollowLoading(true)
    try {
      let followingList = await getStoredFollowing()
      const wasFollowing = isFollowing

      if (wasFollowing) {
        followingList = followingList.filter((id) => id !== targetUserId)
        setIsFollowing(false)
        await API.put(`/users/unfollow/${targetUserId}`)
      } else {
        followingList.push(targetUserId)
        setIsFollowing(true)
        await API.put(`/users/follow/${targetUserId}`)
      }

      await storeFollowing(followingList)
      showToast(wasFollowing ? "Đã bỏ theo dõi 👋" : "Đã theo dõi 🎉")
      triggerFollowAnimation()
      await loadFollowCounts(targetUserId)
    } catch (error) {
      console.error("❌ Error toggling follow:", error.message)
      showToast("Có lỗi xảy ra khi cập nhật theo dõi.")
    } finally {
      setFollowLoading(false)
    }
  }

  const handleViewFollowList = (type) => {
    router.push({
      pathname: "/followList",
      params: { userId, type },
    })
  }

  const handleSendMessage = () => {
    router.push({
      pathname: "/chat/[receiverId]",
      params: { receiverId: userId },
    })
  }

  const handleViewFollowerProfile = (followerId) => {
    router.push({
      pathname: "/profile/[userId]",
      params: { userId: followerId },
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
        <LinearGradient colors={[COLORS.lightBackground, COLORS.background]} style={styles.loadingGradient}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </LinearGradient>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
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
        <Ionicons name="person-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>Không tìm thấy thông tin người dùng</Text>
      </View>
    )
  }

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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thông tin người dùng</Text>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        <Animated.View style={[styles.profileSection, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={[COLORS.secondary, COLORS.primary, COLORS.accent]}
            style={styles.profileHeaderGradient}
          >
            <View style={styles.profileHeader}>
              <View style={styles.profileImageContainer}>
                <View style={styles.avatarWrapper}>
                  <Image
                    source={{ uri: user.avatar || user.profilePicture || "https://via.placeholder.com/120" }}
                    style={styles.profileImage}
                    resizeMode="cover"
                  />
                  <LinearGradient colors={COLORS.instagramGradient} style={styles.avatarBorder} />
                </View>
                <View style={styles.statusBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                </View>
              </View>

              <Text style={styles.userName}>{user.userName || user.name || "Chưa cập nhật"}</Text>
              <Text style={styles.userEmail}>{user.email || "Chưa cập nhật"}</Text>

              {user.role && (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{user.role === "coach" ? "🏆 Huấn luyện viên" : "👤 Thành viên"}</Text>
                </View>
              )}

              {currentUserId !== userId && (
                <View style={styles.actionButtons}>
                  <Animated.View style={{ transform: [{ scale: followAnimation }] }}>
                    <TouchableOpacity
                      style={[styles.followButton, followLoading && styles.buttonDisabled]}
                      onPress={handleFollow}
                      disabled={followLoading}
                    >
                      {followLoading ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : isFollowing ? (
                        <LinearGradient colors={COLORS.unfollowGradient} style={styles.followGradient}>
                          <Ionicons name="checkmark" size={16} color={COLORS.white} />
                          <Text style={styles.followButtonText}>Đang theo dõi</Text>
                        </LinearGradient>
                      ) : (
                        <LinearGradient colors={COLORS.instagramGradient} style={styles.followGradient}>
                          <Ionicons name="person-add" size={16} color={COLORS.white} />
                          <Text style={styles.followButtonText}>Theo dõi</Text>
                        </LinearGradient>
                      )}
                    </TouchableOpacity>
                  </Animated.View>

                  <TouchableOpacity style={styles.messageButton} onPress={handleSendMessage}>
                    <Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.messageButtonText}>Nhắn tin</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.statsSection}>
          <TouchableOpacity style={styles.statCard} onPress={() => handleViewFollowList("following")}>
            <LinearGradient colors={[COLORS.white, COLORS.lightBackground]} style={styles.statGradient}>
              <View style={styles.statIcon}>
                <Ionicons name="people" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Đang theo dõi</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={() => handleViewFollowList("followers")}>
            <LinearGradient colors={[COLORS.white, COLORS.lightBackground]} style={styles.statGradient}>
              <View style={styles.statIcon}>
                <Ionicons name="heart" size={24} color={COLORS.error} />
              </View>
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Người theo dõi</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {followersList.length > 0 && (
          <View style={styles.followersSection}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="people" size={20} color={COLORS.primary} /> Người theo dõi
            </Text>
            <View style={styles.followersCard}>
              <LinearGradient colors={[COLORS.white, COLORS.lightBackground]} style={styles.followersGradient}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.followersScroll}>
                  {followersList.slice(0, 10).map((follower) => (
                    <TouchableOpacity
                      key={follower._id}
                      style={styles.followerItem}
                      onPress={() => handleViewFollowerProfile(follower._id)}
                    >
                      <Image
                        source={{ uri: follower.profilePicture || "https://via.placeholder.com/60" }}
                        style={styles.followerImage}
                        resizeMode="cover"
                      />
                      <Text style={styles.followerName} numberOfLines={1}>
                        {follower.userName || "Không có tên"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {followersList.length > 10 && (
                    <TouchableOpacity
                      style={styles.moreFollowersItem}
                      onPress={() => handleViewFollowList("followers")}
                    >
                      <View style={styles.moreFollowersCircle}>
                        <Text style={styles.moreFollowersText}>+{followersList.length - 10}</Text>
                      </View>
                      <Text style={styles.followerName}>Xem thêm</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </LinearGradient>
            </View>
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="information-circle" size={20} color={COLORS.primary} /> Thông tin cá nhân
          </Text>

          <View style={styles.infoCard}>
            <LinearGradient colors={[COLORS.white, COLORS.lightBackground]} style={styles.infoGradient}>
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="person-outline" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Giới tính</Text>
                  <Text style={styles.infoValue}>{user.gender || "Chưa cập nhật"}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="shield-outline" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Vai trò</Text>
                  <Text style={styles.infoValue}>{user.role === "coach" ? "Huấn luyện viên" : "Thành viên"}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={user.isActive ? COLORS.success : COLORS.error}
                  />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Trạng thái</Text>
                  <Text style={[styles.infoValue, { color: user.isActive ? COLORS.success : COLORS.error }]}>
                    {user.isActive ? "🟢 Đang hoạt động" : "🔴 Không hoạt động"}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Ngày tham gia</Text>
                  <Text style={styles.infoValue}>{formatDate(user.createdAt)}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.primary,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.error,
    fontWeight: "500",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
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
    justifyContent: "space-between",
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
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.white,
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileSection: {
    marginBottom: 20,
  },
  profileHeaderGradient: {
    paddingTop: 30,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 20,
  },
  avatarWrapper: {
    position: "relative",
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: COLORS.white,
    zIndex: 1,
  },
  avatarBorder: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    top: -5,
    left: -5,
    zIndex: 0,
  },
  statusBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  userName: {
    fontSize: 26,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 6,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userEmail: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 12,
    textAlign: "center",
  },
  roleBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  roleText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  followButton: {
    borderRadius: 25,
    overflow: "hidden",
    minWidth: 140,
    height: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  followGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  followButtonText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: "600",
    marginLeft: 8,
  },
  messageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    minWidth: 140,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  messageButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "600",
    marginLeft: 8,
  },
  statsSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 16,
    justifyContent: "center",
  },
  statCard: {
    flex: 1,
    maxWidth: (width - 56) / 2, // Chia đều không gian cho 2 thẻ
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statGradient: {
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.secondary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.lightText,
    textAlign: "center",
    fontWeight: "500",
  },
  followersSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  followersCard: {
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  followersGradient: {
    borderRadius: 20,
    padding: 16,
  },
  followersScroll: {
    paddingVertical: 8,
  },
  followerItem: {
    alignItems: "center",
    marginRight: 16,
    width: 70,
  },
  followerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  followerName: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: "center",
    fontWeight: "500",
  },
  moreFollowersItem: {
    alignItems: "center",
    width: 70,
  },
  moreFollowersCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.lightBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  moreFollowersText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "bold",
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.secondary,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  infoCard: {
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  infoGradient: {
    borderRadius: 20,
    padding: 20,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(76, 75, 80, 0.1)",
  },
  infoIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.lightText,
    marginBottom: 4,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "600",
  },
  bottomSpacing: {
    height: 40,
  },
})
