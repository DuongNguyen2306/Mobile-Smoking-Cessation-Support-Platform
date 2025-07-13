import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
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
import { getFollowers, getFollowing, getProfile, updateProfile } from "../services/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [scrollY] = useState(new Animated.Value(0));

  const loadFollowCounts = useCallback(async (userId) => {
    try {
      console.log("🔍 Loading follow counts for userId:", userId);

      // Lấy followingCount từ AsyncStorage trước
      const followingList = await getStoredFollowing();
      setFollowingCount(followingList.length);
      console.log("🔢 Following count from AsyncStorage:", followingList.length);

      // Gọi API để lấy followers và following
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

        // Đồng bộ AsyncStorage với server
        await storeFollowing(serverFollowingList);
      } else {
        console.error("❌ Following request failed:", followingRes.reason);
      }
    } catch (err) {
      console.error("❌ Error loading follow counts:", err);
      setError("Failed to load follow counts.");
    }
  }, []);

  const loadUserProfile = useCallback(async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Notification", "Please log in to continue", [
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
          userName: userData.userName || userData.name || "Not Updated",
          email: userData.email || "Not Updated",
          avatar: userData.avatar || userData.profilePicture || userData.imageUrl || "https://via.placeholder.com/120",
          smokingFreeDays: userData.smokingFreeDays || 0,
          gender: userData.gender || "Not Updated",
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
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("❌ Error loading profile:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to load profile";
      setError(errorMessage);

      if (err.response?.status === 401) {
        Alert.alert("Session Expired", "Please log in again", [
          { text: "OK", onPress: () => router.replace("/(auth)/login") },
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, loadFollowCounts]);

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No authentication token");

      const updateData = {
        userName: editData.userName,
        bio: editData.bio,
        address: editData.address,
        phone: editData.phone,
      };

      console.log("🔄 Updating profile with data:", updateData);
      const response = await updateProfile(updateData, token);
      
      if (response.status === 200) {
        Alert.alert("Success", "Profile updated successfully");
        setEditing(false);
        await loadUserProfile();
      }
    } catch (err) {
      console.error("❌ Error updating profile:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to update profile";
      Alert.alert("Update Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUserProfile();
  }, [loadUserProfile]);

  const handleLogout = async () => {
    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("user");
            await AsyncStorage.removeItem("following"); // Xóa danh sách following khi logout
            router.replace("/(auth)/login");
          } catch (err) {
            console.error("Logout error:", err);
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
    if (!dateString) return "Not Updated";
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT / 2],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />
        <LinearGradient colors={["#1B5E20", "#2E7D32", "#4CAF50"]} style={styles.loadingGradient}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading your profile...</Text>
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
            <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
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
                <Text style={styles.retryButtonText}>Try Again</Text>
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
          <Text style={styles.errorTitle}>User Not Found</Text>
          <Text style={styles.errorText}>User information not found</Text>
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
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
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
              transform: [{ translateY: headerTranslateY }]
            }
          ]}
        >
          <LinearGradient 
            colors={["#1B5E20", "#2E7D32", "#4CAF50", "#66BB6A"]} 
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerOverlay} />
            <View style={styles.header}>
              <View style={styles.profileSection}>
                <View style={styles.profileImageContainer}>
                  <View style={styles.profileImageBorder}>
                    <Image
                      source={{ uri: user.avatar }}
                      style={styles.profileImage}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={styles.statusBadge}>
                    <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
                  </View>
                  <View style={styles.onlineIndicator} />
                </View>

                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.userName}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <View style={styles.userBadge}>
                    <Ionicons name="shield-checkmark" size={16} color="#FFD700" />
                    <Text style={styles.badgeText}>Verified</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.editButton} 
                  onPress={handleEditProfile}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={["#FFFFFF", "#F8F9FA"]} style={styles.editButtonGradient}>
                    <Ionicons name="create-outline" size={20} color="#2E7D32" />
                    <Text style={styles.editButtonText}>✏️ Edit Profile</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

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
              <Text style={styles.statLabel}>Following</Text>
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
              <Text style={styles.statLabel}>Followers</Text>
              <View style={styles.statIndicator} />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.statCard}>
            <LinearGradient colors={["#E8F5E8", "#FFFFFF"]} style={styles.statGradient}>
              <View style={styles.statIconContainer}>
                <Ionicons name="calendar" size={28} color="#4CAF50" />
              </View>
              <Text style={styles.statNumber}>{user.smokingFreeDays}</Text>
              <Text style={styles.statLabel}>Smoke-Free Days</Text>
              <View style={styles.statIndicator} />
            </LinearGradient>
          </View>
        </View>

        <View style={styles.achievementSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏆 Achievements</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.achievementCard}>
            <LinearGradient 
              colors={["#FFF8E1", "#FFFFFF"]} 
              style={styles.achievementGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.achievementContent}>
                <View style={styles.achievementIcon}>
                  <LinearGradient colors={["#FF9800", "#FFB74D"]} style={styles.achievementIconGradient}>
                    <Ionicons name="trophy" size={32} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementTitle}>Quit Smoking Journey</Text>
                  <Text style={styles.achievementDesc}>
                    {user.smokingFreeDays > 0
                      ? `Amazing! ${user.smokingFreeDays} days smoke-free! 🎉`
                      : "Start your quit smoking journey today"}
                  </Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${Math.min(user.smokingFreeDays * 2, 100)}%` }]} />
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

        {followersList.length > 0 && (
          <View style={styles.followersSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>👥 Recent Followers</Text>
              <TouchableOpacity onPress={() => handleViewFollowList("followers")}>
                <Text style={styles.viewAllText}>View All</Text>
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
                      {follower.userName || "Unknown"}
                    </Text>
                    <View style={styles.followerBadge}>
                      <Text style={styles.followerRole}>
                        {follower.role === "coach" ? "Coach" : "User"}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>📋 Personal Information</Text>

          <View style={styles.infoCard}>
            <LinearGradient colors={["#FFFFFF", "#FAFAFA"]} style={styles.infoGradient}>
              {[
                { icon: "person-outline", label: "Gender", value: user.gender, color: "#2196F3" },
                { icon: "text-outline", label: "Bio", value: user.bio || "Not Updated", color: "#9C27B0" },
                { icon: "location-outline", label: "Address", value: user.address || "Not Updated", color: "#4CAF50" },
                { icon: "call-outline", label: "Phone", value: user.phone || "Not Updated", color: "#00BCD4" },
                { icon: "checkmark-circle-outline", label: "Status", value: user.isActive ? "Active" : "Inactive", color: user.isActive ? "#4CAF50" : "#FF5722" },
                { icon: "time-outline", label: "Member Since", value: formatDate(user.createdAt), color: "#607D8B" },
              ].map((item, index) => (
                <View key={index} style={styles.infoItem}>
                  <View style={[styles.infoIcon, { backgroundColor: `${item.color}15` }]}>
                    <Ionicons name={item.icon} size={22} color={item.color} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>{item.label}</Text>
                    <Text style={[styles.infoValue, item.label === "Status" && { color: item.color }]}>
                      {item.value}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#E0E0E0" />
                </View>
              ))}
            </LinearGradient>
          </View>
        </View>

        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>⚙️ Quick Actions</Text>
          
          {[
            { icon: "settings-outline", text: "Settings", color: "#2196F3" },
            { icon: "help-circle-outline", text: "Help & Support", color: "#9C27B0" },
            { icon: "information-circle-outline", text: "About", color: "#FF9800" },
          ].map((action, index) => (
            <TouchableOpacity key={index} style={styles.actionButton} activeOpacity={0.8}>
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
              <Text style={styles.logoutText}>Sign Out</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      <Modal
        visible={editing}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseEdit}
      >
        <SafeAreaView style={styles.modalContainer}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCloseEdit} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>✏️ Edit Profile</Text>
            <TouchableOpacity onPress={handleUpdateProfile} style={styles.saveHeaderButton}>
              <Text style={styles.saveHeaderText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <LinearGradient colors={["#F8F9FA", "#FFFFFF"]} style={styles.modalGradient}>
              <View style={styles.editImageSection}>
                <View style={styles.editImageContainer}>
                  <Image
                    source={{ uri: user.avatar }}
                    style={styles.editProfileImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity style={styles.changeImageButton}>
                    <Ionicons name="camera" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.changeImageText}>Tap to change profile photo</Text>
              </View>

              <View style={styles.formSection}>
                {[
                  { key: "userName", placeholder: "Enter your username", icon: "person-outline", label: "Username" },
                  { key: "bio", placeholder: "Tell us about yourself...", icon: "text-outline", label: "Bio", multiline: true },
                  { key: "address", placeholder: "Enter your address", icon: "location-outline", label: "Address" },
                  { key: "phone", placeholder: "+84 xxx xxx xxx", icon: "call-outline", label: "Phone Number", keyboardType: "phone-pad" },
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
                  Only username, bio, address, and phone can be updated at this time.
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
                  <LinearGradient colors={["#4CAF50", "#66BB6A"]} style={styles.saveGradient}>
                    <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.cancelButton} onPress={handleCloseEdit}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
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
  header: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
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
    marginBottom: 12,
    textAlign: "center",
  },
  userBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  editButton: {
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  editButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
  },
  editButtonText: {
    fontSize: 16,
    color: "#2E7D32",
    fontWeight: "700",
    marginLeft: 8,
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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
  achievementSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  achievementCard: {
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  achievementGradient: {
    borderRadius: 20,
    padding: 20,
  },
  achievementContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  achievementIcon: {
    marginRight: 16,
  },
  achievementIconGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 6,
  },
  achievementDesc: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 3,
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