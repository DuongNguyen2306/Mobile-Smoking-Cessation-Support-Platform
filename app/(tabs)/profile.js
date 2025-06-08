import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getFollowers, getFollowing, getProfile, logout } from "../services/api"; // Cập nhật import

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          Alert.alert("Thông báo", "Vui lòng đăng nhập để tiếp tục", [
            { text: "OK", onPress: () => router.replace("/(auth)/login") },
          ]);
          return;
        }

        const response = await getProfile();
        if (response.status === 200) {
          setUser(response.data.data.user);
        } else {
          throw new Error("Không thể lấy thông tin profile");
        }

        const storedUser = await AsyncStorage.getItem("user");
        const parsedUser = JSON.parse(storedUser);
        if (!parsedUser?.id) {
          throw new Error("Không tìm thấy userId");
        }

        const followersRes = await getFollowers(parsedUser.id, { page: 1, limit: 100 }); // Lấy số lượng lớn để đếm
        const followingRes = await getFollowing(parsedUser.id, { page: 1, limit: 100 });
        setFollowersCount(followersRes.data?.data?.items?.length || followersRes.data?.data?.length || 0);
        setFollowingCount(followingRes.data?.data?.items?.length || followingRes.data?.data?.length || 0);
      } catch (err) {
        console.error("Lỗi tải profile:", err);
        Alert.alert("Lỗi", err.response?.data?.message || "Không thể tải thông tin profile", [
          { text: "OK", onPress: () => router.replace("/(auth)/login") },
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadUserProfile();
  }, [router]);

  const handleLogout = async () => {
    Alert.alert("Xác nhận", "Bạn có chắc chắn muốn đăng xuất?", [
      {
        text: "Hủy",
        style: "cancel",
      },
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
            Alert.alert("Lỗi", "Không thể đăng xuất");
          }
        },
      },
    ]);
  };

  const handleViewFollowList = () => {
    router.push("/followList");
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Đang tải...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Không tìm thấy thông tin</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Image
          source={{ uri: user.avatar || "https://via.placeholder.com/100" }}
          style={styles.profilePicture}
          resizeMode="cover"
        />
        <Text style={styles.userName}>{user.userName || "Chưa cập nhật"}</Text>
        <Text style={styles.email}>{user.email || "Chưa cập nhật"}</Text>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <TouchableOpacity style={styles.statBox} onPress={handleViewFollowList}>
          <Text style={styles.statNumber}>{followingCount}</Text>
          <Text style={styles.statLabel}>Đang follow</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statBox} onPress={handleViewFollowList}>
          <Text style={styles.statNumber}>{followersCount}</Text>
          <Text style={styles.statLabel}>Người follow</Text>
        </TouchableOpacity>
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.info}>Giới tính: {user.gender || "Chưa cập nhật"}</Text>
        <Text style={styles.info}>Vai trò: {user.role || "Chưa cập nhật"}</Text>
        <Text style={styles.info}>Trạng thái: {user.isActive ? "Hoạt động" : "Không hoạt động"}</Text>
        <Text style={styles.info}>Số ngày không hút thuốc: {user.smokingFreeDays || 0}</Text>
        <Text style={styles.info}>
          Ngày tạo: {new Date(user.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
        </Text>
        <Text style={styles.info}>
          Cập nhật lần cuối: {new Date(user.updatedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
        </Text>
      </View>

      <Button title="Đăng xuất" color="red" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  header: { alignItems: "center", padding: 16 },
  profilePicture: { width: 100, height: 100, borderRadius: 50, marginBottom: 8 },
  userName: { fontSize: 20, fontWeight: "bold", color: "#333", marginBottom: 4 },
  email: { fontSize: 14, color: "#666", marginBottom: 16 },
  statsSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statBox: {
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 8,
    width: "40%",
    elevation: 2,
  },
  statNumber: { fontSize: 18, fontWeight: "bold", color: "#4A90E2", marginBottom: 4 },
  statLabel: { fontSize: 14, color: "#666" },
  infoSection: { padding: 16 },
  info: { fontSize: 16, color: "#333", marginBottom: 8, textAlign: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
});