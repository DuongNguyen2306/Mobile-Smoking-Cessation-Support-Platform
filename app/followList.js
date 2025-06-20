"use client"

import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { followUser, getFollowers, getFollowing, unfollowUser } from "./services/api"

export default function FollowListScreen() {
  const router = useRouter()
  const { userId, type } = useLocalSearchParams()
  const [activeTab, setActiveTab] = useState(type === "followers" ? "followers" : "following")
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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
      }
    } catch (error) {
      console.error("❌ Error loading follow data:", error.message)
      Alert.alert("Error", "Failed to load follow list")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleFollowToggle = async (targetUserId, isFollowing) => {
    try {
      if (isFollowing) {
        await unfollowUser(targetUserId)
        Alert.alert("Success", "Unfollowed successfully")
      } else {
        await followUser(targetUserId)
        Alert.alert("Success", "Followed successfully")
      }

      await loadFollowData()
    } catch (error) {
      console.error("❌ Error toggling follow:", error.message)
      Alert.alert("Error", error.response?.data?.message || "Failed to perform action")
    }
  }

  const renderUserItem = ({ item }) => {
    const user = item // Expecting { _id, userName, profilePicture, role }
    const isFollowing = following.some(f => f._id === user._id)

    return (
      <TouchableOpacity
        onPress={() => {
          router.push({
            pathname: "/userProfile",
            params: { userId: user._id },
          })
        }}
      >
        <View style={styles.userItem}>
          <LinearGradient colors={["#FFFFFF", "#F8FFF8"]} style={styles.userGradient}>
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
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={() => handleFollowToggle(user._id, isFollowing)}
            >
              <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                {isFollowing ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    )
  }

  const currentData = activeTab === "followers" ? followers : following

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#2E7D32", "#4CAF50"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Follow List</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "followers" && styles.activeTab]}
          onPress={() => setActiveTab("followers")}
        >
          <Text style={[styles.tabText, activeTab === "followers" && styles.activeTabText]}>
            Followers ({followers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "following" && styles.activeTab]}
          onPress={() => setActiveTab("following")}
        >
          <Text style={[styles.tabText, activeTab === "following" && styles.activeTabText]}>
            Following ({following.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading...</Text>
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
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {activeTab === "followers" ? "No followers yet" : "Not following anyone"}
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
    backgroundColor: "#F8FFF8",
  },
  header: {
    paddingTop: 10,
    paddingBottom: 15,
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
    color: "#FFFFFF",
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#4CAF50",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4CAF50",
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
    color: "#2E7D32",
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: "#666",
  },
  followButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followingButton: {
    backgroundColor: "#E8F5E8",
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  followingButtonText: {
    color: "#4CAF50",
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
    color: "#666",
    textAlign: "center",
  },
})