import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  awardBadge,
  cancelQuitPlan,
  getCurrentQuitPlan,
  getFollowers,
  getFollowing,
  getMembership,
  getMyBadges,
  getProfile,
  updateProfile
} from "../services/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const HEADER_HEIGHT = 280;

const getStoredFollowing = async () => {
  try {
    const followingData = await AsyncStorage.getItem("following");
    return followingData ? JSON.parse(followingData) : [];
  } catch (err) {
    console.error("Lỗi khi lấy danh sách following từ AsyncStorage:", err);
    return [];
  }
};

const storeFollowing = async (followingList) => {
  try {
    await AsyncStorage.setItem("following", JSON.stringify(followingList));
  } catch (err) {
    console.error("Lỗi khi lưu danh sách following vào AsyncStorage:", err);
  }
};

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersList, setFollowersList] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [scrollY] = useState(new Animated.Value(0));
  const [imageError, setImageError] = useState(false);
  const [membership, setMembership] = useState(null);

  const loadCurrentPlan = useCallback(async () => {
    try {
      setLoading(true);
      console.log("🔍 Loading current quit plan...");
      const response = await getCurrentQuitPlan({ headers: { "Cache-Control": "no-cache" } });
      console.log("API response for getCurrentQuitPlan:", JSON.stringify(response.data, null, 2));
      if (response.status === 200 && response.data) {
        const plan = response.data.data?.plan || response.data;
        console.log("Parsed plan data:", plan);
        if (plan && plan._id && plan.status !== "completed" && plan.status !== "deleted") {
          setCurrentPlan({
            ...plan,
            title: plan.title || plan.name || "Kế hoạch bỏ thuốc",
            image: plan.image || plan.imageUrl || "https://via.placeholder.com/150",
            startDate: plan.startDate || null,
            duration: plan.duration || 0,
          });
          console.log("✅ Current plan loaded:", { title: plan.title || plan.name, image: plan.image || plan.imageUrl });
        } else {
          console.log("Plan is completed, deleted, or not found, setting to null");
          setCurrentPlan(null);
        }
      } else {
        console.log("No current plan found, setting to null");
        setCurrentPlan(null);
      }
      // Load all user badges from /badges/my
      const badgesResponse = await getMyBadges();
      console.log("My badges response:", JSON.stringify(badgesResponse.data, null, 2));
      if (badgesResponse.status === 200 && badgesResponse.data) {
        setBadges(badgesResponse.data.data || badgesResponse.data.badges || []);
      } else {
        console.log("No badges found for user");
        setBadges([]);
      }
    } catch (error) {
      console.error("Error loading current plan or badges:", error.response?.status, error.message);
      setError(error.response?.data?.message || "Không thể tải kế hoạch hoặc huy hiệu");
      setCurrentPlan(null);
      setBadges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFollowCounts = useCallback(async (userId) => {
    try {
      console.log("🔍 Loading follow counts for userId:", userId);
      const followingList = await getStoredFollowing();
      setFollowingCount(followingList.length);
      console.log("🔢 Following count from AsyncStorage:", followingList.length);
      const [followersRes, followingRes] = await Promise.allSettled([
        getFollowers(userId, { page: 1, limit: 1000 }),
        getFollowing(userId, { page: 1, limit: 1000 }),
      ]);
      if (followersRes.status === "fulfilled") {
        const followersData = followersRes.value.data;
        console.log("📡 Raw followers response:", JSON.stringify(followersData, null, 2));
        let count = 0;
        let followers = [];
        if (followersData?.data?.followers && Array.isArray(followersData.data.followers)) {
          followers = followersData.data.followers;
          count = followers.length;
        } else if (followersData?.followers && Array.isArray(followersData.followers)) {
          followers = followersData.followers;
          count = followers.length;
        } else if (followersData?.data && Array.isArray(followersData.data)) {
          followers = followersData.data;
          count = followers.length;
        } else {
          console.warn("⚠️ Unexpected followers data structure:", followersData);
        }
        console.log("👥 Parsed followers list:", followers);
        setFollowersCount(count);
        setFollowersList(followers);
      } else {
        console.error("❌ Followers request failed:", followersRes.reason);
      }
      if (followingRes.status === "fulfilled") {
        const followingData = followingRes.value.data;
        let count = 0;
        let serverFollowingList = [];
        if (followingData?.data?.following) {
          serverFollowingList = Array.isArray(followingData.data.following)
            ? followingData.data.following.map((user) => user._id)
            : [];
          count = serverFollowingList.length;
        } else if (followingData?.following) {
          serverFollowingList = Array.isArray(followingData.following)
            ? followingData.following.map((user) => user._id)
            : [];
          count = serverFollowingList.length;
        } else if (followingData?.data && Array.isArray(followingData.data)) {
          serverFollowingList = followingData.data.map((user) => user._id);
          count = serverFollowingList.length;
        }
        console.log("🔢 Following count from server:", count);
        setFollowingCount(count);
        await storeFollowing(serverFollowingList);
      } else {
        console.error("❌ Following request failed:", followingRes.reason);
      }
    } catch (err) {
      console.error("❌ Error loading follow counts:", err);
      setError("Không thể tải số lượng người theo dõi.");
    }
  }, []);

  const loadUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("token");
      console.log("Token:", token);
      if (!token) {
        Alert.alert("Thông báo", "Vui lòng đăng nhập để tiếp tục", [
          { text: "OK", onPress: () => router.replace("/(auth)/login") },
        ]);
        return;
      }
      console.log("🔍 Loading user profile...");
      const response = await getProfile();
      if (response.status === 200 && response.data) {
        const userData = response.data.data?.user || response.data.user || response.data || {};
        console.log("✅ Profile loaded:", JSON.stringify(userData, null, 2));
        setUser({
          id: userData.id || userData._id || null,
          userName: userData.userName || userData.name || "Chưa cập nhật",
          email: userData.email || "Chưa cập nhật",
          avatar: userData.avatar || userData.profilePicture || userData.imageUrl || "https://via.placeholder.com/120",
          smokingFreeDays: userData.smokingFreeDays || 0,
          gender: userData.gender || "Chưa cập nhật",
          bio: userData.bio || "",
          address: userData.address || "",
          phone: userData.phone || "",
          isActive: userData.isActive || false,
          createdAt: userData.createdAt || null,
        });
        if (userData.id || userData._id) {
          await loadFollowCounts(userData.id || userData._id);
        }
      } else {
        throw new Error("Định dạng phản hồi không hợp lệ");
      }
    } catch (err) {
      console.error("❌ Error loading profile:", err);
      const errorMessage = err.response?.data?.message || err.message || "Không thể tải hồ sơ";
      setError(errorMessage);
      if (err.response?.status === 401) {
        Alert.alert("Phiên hết hạn", "Vui lòng đăng nhập lại", [
          { text: "OK", onPress: () => router.replace("/(auth)/login") },
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, loadFollowCounts]);

  const loadMembership = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");
      if (!token || !storedUser) return;
      const parsedUser = JSON.parse(storedUser);
      const userId = parsedUser._id || parsedUser.id;
      if (!userId) {
        console.warn("User ID not found");
        return;
      }
      console.log("🔍 Loading membership for user:", userId);
      const response = await getMembership(userId, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Membership API response:", JSON.stringify(response.data, null, 2));
      if (response.status === 200 && response.data.success) {
        setMembership(response.data.data.currentPlan || { name: "Chưa cập nhật" });
      } else {
        console.warn("Membership data not successfully loaded:", response.data.message);
        setMembership({ name: "Chưa cập nhật" });
      }
    } catch (err) {
      console.error("❌ Error loading membership:", err.response?.status, err.response?.data, err.message);
      setMembership({ name: "Chưa cập nhật" });
    }
  }, []);

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Không có token xác thực");
      const updateData = {
        userName: editData.userName,
        bio: editData.bio,
        address: editData.address,
        phone: editData.phone,
      };
      console.log("🔄 Updating profile with data:", updateData);
      const response = await updateProfile(updateData);
      if (response.status === 200) {
        Alert.alert("Thành công", "Hồ sơ đã được cập nhật thành công");
        setEditing(false);
        await loadUserProfile();
      }
    } catch (err) {
      console.error("❌ Error updating profile:", err);
      const errorMessage = err.response?.data?.message || err.message || "Không thể cập nhật hồ sơ";
      Alert.alert("Cập nhật thất bại", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAwardBadge = async (badgeName, badgeDescription) => {
    if (!currentPlan?._id) {
      Alert.alert("Lỗi", "Không tìm thấy kế hoạch hiện tại");
      return;
    }
    try {
      const badgeData = {
        name: badgeName,
        description: badgeDescription,
      };
      const response = await awardBadge(currentPlan._id, badgeData);
      if (response.status === 200 || response.status === 201) {
        Alert.alert("🎉 Chúc mừng!", `Bạn đã nhận được huy hiệu: ${badgeName}`);
        const badgesResponse = await getMyBadges(); // Cập nhật từ /badges/my
        if (badgesResponse.status === 200 && badgesResponse.data) {
          setBadges(badgesResponse.data.data || badgesResponse.data.badges || []);
        }
      }
    } catch (error) {
      console.error("Error awarding badge:", error);
      Alert.alert("Lỗi", "Không thể trao huy hiệu");
    }
  };

  const cancelCurrentPlan = async (reason) => {
    try {
      console.log("📡 Cancelling current quit plan with reason:", reason);
      await cancelQuitPlan(reason);
      console.log("✅ Plan cancelled successfully");
      Alert.alert("Thành công", "Kế hoạch đã được hủy", [
        {
          text: "OK",
          onPress: () => {
            setCurrentPlan(null);
            setBadges([]);
          },
        },
      ]);
    } catch (error) {
      console.error("Error cancelling plan:", error);
      Alert.alert("Lỗi", "Không thể hủy kế hoạch: " + (error.response?.data?.message || error.message));
    }
  };

  useEffect(() => {
    loadUserProfile();
    loadCurrentPlan();
    loadMembership();
  }, [loadUserProfile, loadCurrentPlan, loadMembership]);

  useFocusEffect(
    useCallback(() => {
      loadUserProfile();
      loadCurrentPlan();
      loadMembership();
    }, [loadUserProfile, loadCurrentPlan, loadMembership])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadUserProfile(), loadCurrentPlan(), loadMembership()]);
  }, [loadUserProfile, loadCurrentPlan, loadMembership]);

  const handleLogout = async () => {
    Alert.alert("Xác nhận đăng xuất", "Bạn có chắc muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("user");
            await AsyncStorage.removeItem("following");
            router.replace("/(auth)/login");
          } catch (err) {
            console.error("Lỗi đăng xuất:", err);
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("user");
            await AsyncStorage.removeItem("following");
            router.replace("/(auth)/login");
          }
        },
      },
    ]);
  };

  const handleViewFollowList = (type) => {
    if (user?.id) {
      router.push({
        pathname: "/followList",
        params: { userId: user.id, type },
      });
    }
  };

  const handleViewFollowerProfile = (followerId) => {
    router.push({
      pathname: "/userProfile",
      params: { userId: followerId },
    });
  };

  const handleEditProfile = () => {
    console.log("🔧 Opening edit profile modal");
    setEditData({
      userName: user.userName,
      bio: user.bio,
      address: user.address,
      phone: user.phone,
    });
    setEditing(true);
  };

  const handleCloseEdit = () => {
    console.log("❌ Closing edit profile modal");
    setEditing(false);
    setEditData({});
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Chưa cập nhật";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    });
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT / 2],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT / 2],
    extrapolate: "clamp",
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />
        <LinearGradient colors={["#1B5E20", "#2E7D32", "#4CAF50"]} style={styles.loadingGradient}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Đang tải hồ sơ...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <LinearGradient colors={["#FFEBEE", "#FFFFFF"]} style={styles.errorGradient}>
          <View style={styles.errorContent}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="alert-circle-outline" size={80} color="#FF5722" />
            </View>
            <Text style={styles.errorTitle}>Đã có lỗi xảy ra</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setError(null);
                loadUserProfile();
              }}
            >
              <LinearGradient colors={["#4CAF50", "#66BB6A"]} style={styles.retryGradient}>
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Thử lại</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorContent}>
          <Ionicons name="person-outline" size={80} color="#FF5722" />
          <Text style={styles.errorTitle}>Không tìm thấy người dùng</Text>
          <Text style={styles.errorText}>Thông tin người dùng không tìm thấy</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />
      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4CAF50"]}
            tintColor="#FFFFFF"
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        <Animated.View
          style={[
            styles.headerContainer,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <LinearGradient
            colors={["#1B5E20", "#2E7D32", "#4CAF50", "#66BB6A"]}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerOverlay} />
            <TouchableOpacity style={styles.settingsButton} onPress={handleEditProfile} activeOpacity={0.8}>
              <View style={styles.settingsButtonBackground}>
                <Ionicons name="settings-outline" size={24} color="#2E7D32" />
              </View>
            </TouchableOpacity>
            <View style={styles.header}>
              <View style={styles.profileSection}>
                <View style={styles.profileImageContainer}>
                  <View style={styles.profileImageBorder}>
                    <Image source={{ uri: user.avatar }} style={styles.profileImage} resizeMode="cover" />
                  </View>
                  <View style={styles.statusBadge}>
                    <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
                  </View>
                  <View style={styles.onlineIndicator} />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.userName}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  {membership && (
                    <Text style={styles.userPlan}>{membership.name || "Chưa cập nhật"}</Text>
                  )}
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Stats Section - Removed smoking-free days card */}
        <View style={styles.statsSection}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleViewFollowList("following")}
            activeOpacity={0.8}
          >
            <LinearGradient colors={["#E3F2FD", "#FFFFFF"]} style={styles.statGradient}>
              <View style={styles.statIconContainer}>
                <Ionicons name="people" size={28} color="#2196F3" />
              </View>
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Đang theo dõi</Text>
              <View style={styles.statIndicator} />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => handleViewFollowList("followers")}
            activeOpacity={0.8}
          >
            <LinearGradient colors={["#FCE4EC", "#FFFFFF"]} style={styles.statGradient}>
              <View style={styles.statIconContainer}>
                <Ionicons name="heart" size={28} color="#E91E63" />
              </View>
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Người theo dõi</Text>
              <View style={styles.statIndicator} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {currentPlan && (
          <View style={styles.progressChartSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📊 Kế hoạch hiện tại</Text>
            </View>
            <TouchableOpacity activeOpacity={0.8} onPress={() => router.push("/current")}>
              <View style={styles.planContainer}>
                <View style={styles.planImageContainer}>
                  <Image
                    source={{ uri: imageError ? "https://via.placeholder.com/150" : currentPlan.image }}
                    style={styles.planImage}
                    resizeMode="cover"
                    onError={() => {
                      console.log("Lỗi tải hình ảnh kế hoạch, sử dụng dự phòng");
                      setImageError(true);
                    }}
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(0,255,255,0.3)"]}
                    style={styles.imageOverlay}
                  />
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planTitleText}>{currentPlan.title}</Text>
                  {currentPlan.startDate && (
                    <Text style={styles.planSubText}>
                      Bắt đầu: {formatDate(currentPlan.startDate)}
                    </Text>
                  )}
                  {currentPlan.duration > 0 && (
                    <Text style={styles.planSubText}>
                      Thời gian: {currentPlan.duration} ngày
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Badges Section - Removed "Thêm huy hiệu" button */}
        <View style={styles.badgesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏅 Huy hiệu</Text>
          </View>
          {badges.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
              {badges.map((badge, index) => (
                <View key={index} style={[styles.badgeCard, { marginLeft: index === 0 ? 20 : 12 }]}>
                  <LinearGradient colors={["#FFF8E1", "#FFFFFF"]} style={styles.badgeCardGradient}>
                    <View style={styles.badgeIcon}>
                      <Ionicons name="medal" size={32} color="#FF9800" />
                    </View>
                    <Text style={styles.badgeName}>{badge.name}</Text>
                    <Text style={styles.badgeDescription} numberOfLines={2}>
                      {badge.description}
                    </Text>
                    {badge.awardedAt && (
                      <Text style={styles.badgeDate}>
                        Ngày nhận: {formatDate(badge.awardedAt)}
                      </Text>
                    )}
                  </LinearGradient>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noBadgesContainer}>
              <Ionicons name="medal-outline" size={48} color="#BDBDBD" />
              <Text style={styles.noBadgesText}>Chưa có huy hiệu nào</Text>
              <Text style={styles.noBadgesSubtext}>Hoàn thành các mục tiêu để nhận huy hiệu</Text>
            </View>
          )}
        </View>

        <View style={styles.followersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👥 Người theo dõi gần đây</Text>
            <TouchableOpacity onPress={() => handleViewFollowList("followers")}>
              <Text style={styles.viewAllText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.followersScroll}>
            {followersList.slice(0, 10).map((follower, index) => (
              <TouchableOpacity
                key={follower._id}
                style={[styles.followerCard, { marginLeft: index === 0 ? 20 : 12 }]}
                onPress={() => handleViewFollowerProfile(follower._id)}
                activeOpacity={0.8}
              >
                <LinearGradient colors={["#FFFFFF", "#F8F9FA"]} style={styles.followerCardGradient}>
                  <Image
                    source={{ uri: follower.profilePicture || "https://via.placeholder.com/60" }}
                    style={styles.followerImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.followerName} numberOfLines={1}>
                    {follower.userName || "Không xác định"}
                  </Text>
                  <View style={styles.followerBadge}>
                    <Text style={styles.followerRole}>
                      {follower.role === "coach" ? "Huấn luyện viên" : "Người dùng"}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>📋 Thông tin cá nhân</Text>
          <View style={styles.infoCard}>
            <LinearGradient colors={["#FFFFFF", "#FAFAFA"]} style={styles.infoGradient}>
              {[
                { icon: "person-outline", label: "Giới tính", value: user.gender, color: "#2196F3" },
                { icon: "text-outline", label: "Tiểu sử", value: user.bio || "Chưa cập nhật", color: "#9C27B0" },
                { icon: "location-outline", label: "Địa chỉ", value: user.address || "Chưa cập nhật", color: "#4CAF50" },
                { icon: "call-outline", label: "Điện thoại", value: user.phone || "Chưa cập nhật", color: "#00BCD4" },
                {
                  icon: "checkmark-circle-outline",
                  label: "Trạng thái",
                  value: user.isActive ? "Hoạt động" : "Không hoạt động",
                  color: user.isActive ? "#4CAF50" : "#FF5722",
                },
                { icon: "time-outline", label: "Thành viên từ", value: formatDate(user.createdAt), color: "#607D8B" },
              ].map((item, index) => (
                <View key={index} style={styles.infoItem}>
                  <View style={[styles.infoIcon, { backgroundColor: `${item.color}15` }]}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{item.label}</Text>
                    <Text style={[styles.infoValue, item.label === "Trạng thái" && { color: item.color }]}>
                      {item.value}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#E0E0E0" />
                </View>
              ))}
            </LinearGradient>
          </View>
        </View>

        {/* Action Section - Removed "Cài đặt", "Hỗ trợ", "Giới thiệu" */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>⚙️ Hành động nhanh</Text>
          {[
            {
              icon: "cash-outline",
              text: "Lịch sử thanh toán",
              color: "#FF9800",
              onPress: () => router.push("/paymentHistory"),
            },
            {
              icon: "card-outline",
              text: "Đăng ký gói thành viên",
              color: "#4CAF50",
              onPress: () => router.push({
                pathname: "/membership",
                params: { userId: user.id, userName: user.userName, email: user.email, phone: user.phone },
              }),
            },
          ].map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionButton}
              activeOpacity={0.8}
              onPress={action.onPress || undefined}
            >
              <LinearGradient colors={["#FFFFFF", "#F8F9FA"]} style={styles.actionGradient}>
                <View style={[styles.actionIcon, { backgroundColor: `${action.color}15` }]}>
                  <Ionicons name={action.icon} size={22} color={action.color} />
                </View>
                <Text style={styles.actionText}>{action.text}</Text>
                <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <LinearGradient colors={["#FF5722", "#FF7043"]} style={styles.logoutGradient}>
              <Ionicons name="log-out-outline" size={22} color="#FFFFFF" />
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      <Modal visible={editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCloseEdit}>
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCloseEdit} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>✏️ Chỉnh sửa hồ sơ</Text>
            <TouchableOpacity onPress={handleUpdateProfile} style={styles.saveHeaderButton}>
              <Text style={styles.saveHeaderText}>Lưu</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <LinearGradient colors={["#F8F9FA", "#FFFFFF"]} style={styles.modalGradient}>
              <View style={styles.editImageSection}>
                <View style={styles.editImageContainer}>
                  <Image source={{ uri: user.avatar }} style={styles.editProfileImage} resizeMode="cover" />
                  <TouchableOpacity style={styles.changeImageButton}>
                    <Ionicons name="camera" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.changeImageText}>Chạm để thay đổi ảnh hồ sơ</Text>
              </View>
              <View style={styles.formSection}>
                {[
                  { key: "userName", placeholder: "Nhập tên người dùng", icon: "person-outline", label: "Tên người dùng" },
                  {
                    key: "bio",
                    placeholder: "Giới thiệu về bạn...",
                    icon: "text-outline",
                    label: "Tiểu sử",
                    multiline: true,
                  },
                  { key: "address", placeholder: "Nhập địa chỉ", icon: "location-outline", label: "Địa chỉ" },
                  {
                    key: "phone",
                    placeholder: "+84 xxx xxx xxx",
                    icon: "call-outline",
                    label: "Số điện thoại",
                    keyboardType: "phone-pad",
                  },
                ].map((field, index) => (
                  <View key={index} style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    <View style={styles.inputContainer}>
                      <View style={styles.inputIcon}>
                        <Ionicons name={field.icon} size={20} color="#4CAF50" />
                      </View>
                      <TextInput
                        style={[styles.input, field.multiline && styles.multilineInput]}
                        value={editData[field.key] || ""}
                        onChangeText={(text) => setEditData({ ...editData, [field.key]: text })}
                        placeholder={field.placeholder}
                        placeholderTextColor="#999"
                        multiline={field.multiline}
                        keyboardType={field.keyboardType || "default"}
                      />
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.infoNote}>
                <Ionicons name="information-circle-outline" size={20} color="#4CAF50" />
                <Text style={styles.infoNoteText}>
                  Hiện tại chỉ có thể cập nhật tên người dùng, tiểu sử, địa chỉ và số điện thoại.
                </Text>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
                  <LinearGradient colors={["#4CAF50", "#66BB6A"]} style={styles.saveGradient}>
                    <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCloseEdit}>
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
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
  loadingContent: {
    alignItems: "center",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
  },
  errorGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorContent: {
    alignItems: "center",
    maxWidth: 300,
  },
  errorIconContainer: {
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  retryButton: {
    borderRadius: 25,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  headerContainer: {
    height: HEADER_HEIGHT,
  },
  headerGradient: {
    flex: 1,
    position: "relative",
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  settingsButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  settingsButtonBackground: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  profileSection: {
    alignItems: "center",
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 20,
  },
  profileImageBorder: {
    padding: 4,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  profileImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  statusBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  onlineIndicator: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4CAF50",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  userInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  userName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 6,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userEmail: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 6,
    textAlign: "center",
  },
  userPlan: {
    fontSize: 14,
    color: "#FFD700",
    fontWeight: "600",
    textAlign: "center",
  },
  statsSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 30,
    marginBottom: 30,
    marginTop: -20,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  statGradient: {
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    position: "relative",
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
  },
  statIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
  },
  progressChartSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  planContainer: {
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    padding: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  planImageContainer: {
    position: "relative",
    width: "100%",
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  planImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  planInfo: {
    alignItems: "center",
    marginBottom: 16,
  },
  planTitleText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E7D32",
    textAlign: "center",
    marginBottom: 8,
  },
  planSubText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  badgesSection: {
    marginBottom: 30,
  },
  badgesScroll: {
    paddingVertical: 10,
  },
  badgeCard: {
    width: 120,
    marginRight: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeCardGradient: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  badgeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    lineHeight: 16,
  },
  badgeDate: {
    fontSize: 10,
    color: "#888",
    textAlign: "center",
    marginTop: 4,
  },
  noBadgesContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noBadgesText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
    marginBottom: 4,
  },
  noBadgesSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  viewAllText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
  },
  followersSection: {
    marginBottom: 30,
  },
  followersScroll: {
    paddingVertical: 10,
  },
  followerCard: {
    width: 100,
    marginRight: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  followerCardGradient: {
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  followerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  followerName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 6,
  },
  followerBadge: {
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  followerRole: {
    fontSize: 10,
    color: "#4CAF50",
    fontWeight: "500",
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  infoCard: {
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
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
    borderBottomColor: "#F0F0F0",
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    marginBottom: 4,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  actionSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  actionButton: {
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  actionGradient: {
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  logoutSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  logoutButton: {
    borderRadius: 16,
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutGradient: {
    borderRadius: 16,
    padding: 18,
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
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    backgroundColor: "#FFFFFF",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E7D32",
    textAlign: "center",
  },
  saveHeaderButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveHeaderText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  modalContent: {
    flex: 1,
  },
  modalGradient: {
    flex: 1,
    paddingBottom: 40,
  },
  editImageSection: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  editImageContainer: {
    position: "relative",
    marginBottom: 12,
  },
  editProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#4CAF50",
  },
  changeImageButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  changeImageText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  formSection: {
    paddingHorizontal: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "#E9ECEF",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: "#333",
  },
  multilineInput: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 15,
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 14,
    color: "#2E7D32",
    marginLeft: 8,
    lineHeight: 20,
  },
  modalActions: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  saveButton: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
    borderRadius: 16,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 18,
    marginLeft: 12,
  },
  cancelButton: {
    padding: 18,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 16,
  },
});