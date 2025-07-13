"use client"

import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { LinearGradient } from "expo-linear-gradient"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { followUser, getFollowers, getFollowing, unfollowUser } from "./services/api"

// Color constants
const COLORS = {
  primary: "#4CAF50",
  secondary: "#2E7D32",
  text: "#333",
  lightText: "#666",
  background: "#F8FFF8",
  lightBackground: "#F1F8E9",
  white: "#FFFFFF",
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

export default function FollowListScreen() {
  const router = useRouter()
  const { userId, type } = useLocalSearchParams()
  const [activeTab, setActiveTab] = useState(type === "followers" ? "followers" : "following")
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [followLoading, setFollowLoading] = useState({})
  const [toastMessage, setToastMessage] = useState(null)
  const [followAnimations] = useState({})

  // Hiển thị thông báo tạm thời
  const showToast = (message) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Hiệu ứng hoạt hình khi nhấn follow/unfollow
  const triggerFollowAnimation = (userId) => {
    if (!followAnimations[userId]) {
      followAnimations[userId] = new Animated.Value(1)
    }
    Animated.sequence([
      Animated.timing(followAnimations[userId], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(followAnimations[userId], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start()
  }

  useEffect(() => {
    if (userId) {
      loadFollowData()
    }
  }, [userId, activeTab])

  const loadFollowData = async () => {
    try {
      setLoading(true)
      console.log(`🔍 Loading ${activeTab} for user:`, userId)

      if (activeTab === "followers") {
        const response = await getFollowers(userId, { page: 1, limit: 1000 })
        console.log("📡 Raw followers response:", JSON.stringify(response.data, null, 2))
        const data = response.data?.data?.followers || response.data?.followers || []
        console.log("👥 Followers data:", data)
        setFollowers(Array.isArray(data) ? data : [])
      } else {
        const response = await getFollowing(userId, { page: 1, limit: 1000 })
        console.log("📡 Raw following response:", JSON.stringify(response.data, null, 2))
        const data = response.data?.data?.following || response.data?.following || []
        console.log("👤 Following data:", data)
        setFollowing(Array.isArray(data) ? data : [])

        // Đồng bộ AsyncStorage với server
        const followingIds = data.map((user) => user._id).filter(Boolean)
        await storeFollowing(followingIds)
      }
    } catch (error) {
      console.error("❌ Error loading follow data:", error.message)
      showToast("Không thể tải danh sách. Vui lòng thử lại.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleFollowToggle = async (targetUserId, isCurrentlyFollowing) => {
  console.log("👉 Toggle follow for", targetUserId)
  if (followLoading[targetUserId]) return

  setFollowLoading((prev) => ({ ...prev, [targetUserId]: true }))
  triggerFollowAnimation(targetUserId)

  try {
    if (isCurrentlyFollowing) {
      console.log("📤 Sending UNFOLLOW request...")
      await unfollowUser(targetUserId)
    } else {
      console.log("📤 Sending FOLLOW request...")
      await followUser(targetUserId)
    }

    // ✅ Reload lại danh sách FOLLOW/UNFOLLOW sau khi thay đổi
    await loadFollowData()

  } catch (error) {
    console.error("❌ API follow/unfollow failed:", error.message)
    console.error("📦 Full error:", error.response?.data || error)
    showToast("Thao tác thất bại. Vui lòng thử lại.")
  } finally {
    setFollowLoading((prev) => ({ ...prev, [targetUserId]: false }))
  }
}



  const renderUserItem = ({ item }) => {
    const user = item // Expecting { _id, userName, profilePicture, role }
    const isFollowing = following.some((f) => f._id === user._id);


    return (
      <TouchableOpacity
        onPress={() => {
          router.push({
            pathname: "/userProfile",
            params: { userId: user._id },
          })
        }}
      >
        <Animated.View style={[styles.userItem, { transform: [{ scale: followAnimations[user._id] || 1 }] }]}>
          <LinearGradient colors={[COLORS.white, COLORS.lightBackground]} style={styles.userGradient}>
            <Image
              source={{ uri: user.profilePicture || "https://via.placeholder.com/50" }}
              style={styles.userAvatar}
              resizeMode="cover"
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.userName || "Unknown User"}</Text>
              <Text style={styles.userRole}>{user.role === "coach" ? "Coach" : "User"}</Text>
            </View>
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followingButton, followLoading[user._id] && styles.followButtonDisabled]}
              onPress={() => handleFollowToggle(user._id, isFollowing)}
              disabled={followLoading[user._id]}
            >
              {followLoading[user._id] ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? "Đang theo dõi" : "Theo dõi"}
                </Text>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    )
  }

  const currentData = activeTab === "followers" ? followers : following

  return (
    <SafeAreaView style={styles.container}>
      {toastMessage && (
        <Animated.View style={styles.toastContainer}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.toastGradient}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </LinearGradient>
        </Animated.View>
      )}
      <LinearGradient colors={[COLORS.secondary, COLORS.primary]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Danh sách theo dõi</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "followers" && styles.activeTab]}
          onPress={() => setActiveTab("followers")}
        >
          <Text style={[styles.tabText, activeTab === "followers" && styles.activeTabText]}>
            Người theo dõi ({followers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "following" && styles.activeTab]}
          onPress={() => setActiveTab("following")}
        >
          <Text style={[styles.tabText, activeTab === "following" && styles.activeTabText]}>
            Đang theo dõi ({following.length})
          </Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={currentData}
          renderItem={renderUserItem}
          keyExtractor={(item, index) => item._id?.toString() || index.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            loadFollowData()
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={COLORS.lightText} />
              <Text style={styles.emptyText}>
                {activeTab === "followers" ? "Chưa có người theo dõi" : "Chưa theo dõi ai"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.white,
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.lightText,
  },
  activeTabText: {
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.primary,
  },
  listContainer: {
    padding: 20,
  },
  userItem: {
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.secondary,
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: COLORS.lightText,
  },
  followButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followingButton: {
    backgroundColor: COLORS.lightBackground,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  followButtonDisabled: {
    opacity: 0.6,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.white,
  },
  followingButtonText: {
    color: COLORS.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.lightText,
    textAlign: "center",
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
})