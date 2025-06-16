import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
} from "react-native";
import { getFollowers, getFollowing, getProfile, logout } from "../services/api";

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadFollowCounts = useCallback(async (userId) => {
    try {
      console.log("🔍 Loading follow counts for userId:", userId);
      const [followersRes, followingRes] = await Promise.allSettled([
        getFollowers(userId),
        getFollowing(userId),
      ]);

      if (followersRes.status === "fulfilled") {
        const followersData = followersRes.value.data;
        setFollowersCount(
          (followersData?.data?.followers?.length || followersData?.followers?.length || followersData?.data?.length) || 0
        );
      }
      if (followingRes.status === "fulfilled") {
        const followingData = followingRes.value.data;
        setFollowingCount(
          (followingData?.data?.following?.length || followingData?.following?.length || followingData?.data?.length) || 0
        );
      }
    } catch (err) {
      console.error("❌ Error loading follow counts:", err);
      setError("Không thể tải số liệu theo dõi.");
    }
  }, []);

  const loadUserProfile = useCallback(async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Thông báo", "Vui lòng đăng nhập để tiếp tục", [
          { text: "OK", onPress: () => router.replace("/(auth)/login") },
        ]);
        return;
      }

      console.log("🔍 Loading user profile...");
      const response = await getProfile();

      if (response.status === 200 && response.data) {
        const userData = response.data.data?.user || response.data.user || response.data;
        console.log("✅ Profile loaded:", userData);
        setUser(userData);

        if (userData.id) {
          await loadFollowCounts(userData.id);
        }
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("❌ Error loading profile:", err);
      const errorMessage =
        err.response?.data?.message || err.message || "Không thể tải thông tin profile";
      setError(errorMessage);

      if (err.response?.status === 401) {
        Alert.alert("Phiên đăng nhập hết hạn", "Vui lòng đăng nhập lại", [
          { text: "OK", onPress: () => router.replace("/(auth)/login") },
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, loadFollowCounts]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUserProfile();
  }, [loadUserProfile]);

  const handleLogout = async () => {
    Alert.alert("Xác nhận đăng xuất", "Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("user");
            router.replace("/(auth)/login");
          } catch (err) {
            console.error("Lỗi đăng xuất:", err);
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("user");
            router.replace("/(auth)/login");
          }
        },
      },
    ]);
  };

  const handleViewFollowList = () => {
    if (user?.id) {
      router.push({
        pathname: "/followList",
        params: { userId: user.id },
      });
    }
  };

  const handleEditProfile = () => {
    Alert.alert("Thông báo", "Tính năng chỉnh sửa profile sẽ được cập nhật sớm!");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Chưa cập nhật";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={["#E8F5E8", "#F1F8E9"]} style={styles.loadingGradient}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </LinearGradient>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF5722" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            loadUserProfile();
          }}
        >
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="person-outline" size={64} color="#FF5722" />
        <Text style={styles.errorText}>Không tìm thấy thông tin người dùng</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} />}
      >
        {/* Header */}
        <LinearGradient colors={["#2E7D32", "#4CAF50", "#66BB6A"]} style={styles.headerGradient}>
          <View style={styles.header}>
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

            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
              <Ionicons name="create-outline" size={16} color="#4CAF50" />
              <Text style={styles.editButtonText}>Chỉnh sửa</Text>
            </TouchableOpacity>
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

        {/* Achievement Section */}
        <View style={styles.achievementSection}>
          <Text style={styles.sectionTitle}>Thành tích</Text>
          <View style={styles.achievementCard}>
            <LinearGradient colors={["#E8F5E8", "#F1F8E9"]} style={styles.achievementGradient}>
              <View style={styles.achievementIcon}>
                <Ionicons name="trophy" size={32} color="#FF9800" />
              </View>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementTitle}>Hành trình bỏ thuốc</Text>
                <Text style={styles.achievementDesc}>
                  {user.smokingFreeDays > 0
                    ? `Đã kiên trì ${user.smokingFreeDays} ngày không hút thuốc!`
                    : "Bắt đầu hành trình bỏ thuốc của bạn"}
                </Text>
              </View>
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

        {/* Action Section */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.actionButton}>
            <LinearGradient colors={["#E8F5E8", "#F1F8E9"]} style={styles.actionGradient}>
              <Ionicons name="settings-outline" size={20} color="#4CAF50" />
              <Text style={styles.actionText}>Cài đặt</Text>
              <Ionicons name="chevron-forward" size={16} color="#4CAF50" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <LinearGradient colors={["#E8F5E8", "#F1F8E9"]} style={styles.actionGradient}>
              <Ionicons name="help-circle-outline" size={20} color="#4CAF50" />
              <Text style={styles.actionText}>Trợ giúp</Text>
              <Ionicons name="chevron-forward" size={16} color="#4CAF50" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <LinearGradient colors={["#E8F5E8", "#F1F8E9"]} style={styles.actionGradient}>
              <Ionicons name="information-circle-outline" size={20} color="#4CAF50" />
              <Text style={styles.actionText}>Về ứng dụng</Text>
              <Ionicons name="chevron-forward" size={16} color="#4CAF50" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LinearGradient colors={["#FF5722", "#FF7043"]} style={styles.logoutGradient}>
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
    paddingTop: 20,
  },
  header: {
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
    marginBottom: 16,
    textAlign: "center",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "500",
    marginLeft: 4,
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
  achievementSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 12,
  },
  achievementCard: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementGradient: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  achievementIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 4,
  },
  achievementDesc: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
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
  actionSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionButton: {
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionGradient: {
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: "#2E7D32",
    fontWeight: "500",
    marginLeft: 12,
  },
  logoutSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  logoutButton: {
    borderRadius: 12,
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutGradient: {
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "bold",
    marginLeft: 8,
  },
});