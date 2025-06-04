import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Image,
  StyleSheet,
  Text,
  View
} from "react-native";
import { followUser, getUserProfile, sendMessage, unfollowUser } from "../services/api";

// Hàm định dạng thời gian theo múi giờ Việt Nam (UTC+7)
const formatDateTime = (dateString) => {
  if (!dateString || isNaN(new Date(dateString))) return "Chưa cập nhật";
  const date = new Date(dateString);
  return date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
};

// Hàm kiểm tra xem một chuỗi có phải là ObjectId hợp lệ không
const isValidObjectId = (id) => {
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  return objectIdPattern.test(id);
};

// Hàm lấy danh sách following từ AsyncStorage
const getStoredFollowing = async () => {
  try {
    const followingData = await AsyncStorage.getItem("following");
    return followingData ? JSON.parse(followingData) : [];
  } catch (err) {
    console.error("Lỗi khi lấy danh sách following từ AsyncStorage:", err);
    return [];
  }
};

// Hàm lưu danh sách following vào AsyncStorage
const storeFollowing = async (followingList) => {
  try {
    await AsyncStorage.setItem("following", JSON.stringify(followingList));
  } catch (err) {
    console.error("Lỗi khi lưu danh sách following vào AsyncStorage:", err);
  }
};

export default function ProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Thêm state để kích hoạt useEffect lại

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("token");
        console.log("Token:", token); // Debug token
        if (!token) {
          Alert.alert("Thông báo", "Vui lòng đăng nhập để tiếp tục");
          router.push("/(auth)/login");
          return;
        }

        const userData = await AsyncStorage.getItem("user");
        console.log("User data:", userData); // Debug user
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setCurrentUserId(parsedUser._id || parsedUser.id);
        }

        if (!id || !isValidObjectId(id)) {
          throw new Error(`ID không hợp lệ: ${id}`);
        }

        const response = await getUserProfile(id);
        if (response.data?.user) {
          setUser(response.data.user);
        } else if (response.data?.data?.user) {
          setUser(response.data.data.user);
        } else {
          throw new Error("Dữ liệu người dùng không được trả về từ API");
        }

        // Lấy danh sách following từ AsyncStorage
        let followingList = await getStoredFollowing();
        console.log("Following list from AsyncStorage:", followingList); // Debug

        // Nếu danh sách rỗng, đồng bộ từ backend (giả sử dùng getUserProfile để lấy following tạm thời)
        if (!followingList.length && currentUserId) {
          console.log("Attempting to sync following list from user profile or fallback");
          const userProfile = await getUserProfile(currentUserId);
          if (userProfile.data?.user?.following) {
            followingList = userProfile.data.user.following.map((u) => u._id || u.id);
            await storeFollowing(followingList);
          } else {
            console.warn("No following data in user profile, using empty list");
          }
        }
        setIsFollowing(followingList.includes(id));
        console.log("Is following (initial):", followingList.includes(id)); // Debug
      } catch (err) {
        console.error("Lỗi tải profile:", err.message, "Response:", err.response?.data);
        Alert.alert("Lỗi", err.message || "Không thể tải thông tin profile");
      } finally {
        setLoading(false);
      }
    };
    if (id) loadProfile();
  }, [id, currentUserId, refreshKey]);

  const handleFollow = async () => {
    if (!currentUserId) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để follow");
      router.push("/(auth)/login");
      return;
    }

    if (!isValidObjectId(id)) {
      Alert.alert("Lỗi", "ID người dùng không hợp lệ");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Thông báo", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        router.push("/(auth)/login");
        return;
      }

      let followingList = await getStoredFollowing();

      if (isFollowing) {
        console.log("Calling unfollowUser with id:", id); // Debug
        const response = await unfollowUser(id);
        console.log("Unfollow response:", response); // Debug
        followingList = followingList.filter((userId) => userId !== id);
        await storeFollowing(followingList);
        setIsFollowing(false);
        setRefreshKey((prev) => prev + 1); // Kích hoạt useEffect lại
        Alert.alert("Thông báo", `Đã bỏ theo dõi ${user?.userName || "người dùng"}`);
      } else {
        console.log("Calling followUser with id:", id); // Debug
        const response = await followUser(id);
        console.log("Follow response:", response); // Debug
        if (response.data?.status === "fail" && response.data?.message === "Already following this user") {
          Alert.alert("Thông báo", "Bạn đã follow người dùng này trước đó!");
          if (!followingList.includes(id)) {
            followingList.push(id);
            await storeFollowing(followingList);
          }
          setIsFollowing(true);
          setRefreshKey((prev) => prev + 1); // Kích hoạt useEffect lại
          return;
        }
        followingList.push(id);
        await storeFollowing(followingList);
        setIsFollowing(true);
        setRefreshKey((prev) => prev + 1); // Kích hoạt useEffect lại
        Alert.alert("Thông báo", `Đã follow ${user?.userName || "người dùng"}`);
        // Gửi tin nhắn với payload đúng định dạng
        try {
          await sendMessage(id, { text: `${currentUserId} đã follow bạn!` }); // Sử dụng 'text' thay vì 'content'
          console.log("Send message success");
        } catch (sendErr) {
          console.error("Lỗi gửi tin nhắn:", sendErr.message, "Response:", sendErr.response?.data);
          Alert.alert("Cảnh báo", "Follow thành công nhưng không thể gửi thông báo.");
        }
      }
    } catch (err) {
      console.error("Lỗi follow/unfollow:", err.message, "Response:", err.response?.data);
      if (err.response?.status === 401) {
        Alert.alert("Thông báo", "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        router.push("/(auth)/login");
      } else if (err.response?.status === 400 && err.response?.data?.message === "Already following this user") {
        Alert.alert("Thông báo", "Bạn đã follow người dùng này trước đó!");
        let followingList = await getStoredFollowing();
        if (!followingList.includes(id)) {
          followingList.push(id);
          await storeFollowing(followingList);
          setIsFollowing(true);
          setRefreshKey((prev) => prev + 1); // Kích hoạt useEffect lại
        }
      } else {
        Alert.alert("Lỗi", err.response?.data?.message || "Không thể thực hiện hành động");
      }
    }
  };

  if (loading) return (
    <View style={styles.container}>
      <Text style={styles.title}>Đang tải...</Text>
    </View>
  );

  if (!user) return (
    <View style={styles.container}>
      <Text style={styles.title}>Không tìm thấy profile</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trang cá nhân của {user.userName || "Chưa cập nhật"}</Text>
      {user.profilePicture && (
        <Image
          source={{ uri: user.profilePicture }}
          style={styles.profilePicture}
          resizeMode="cover"
        />
      )}
      <Text style={styles.info}>Email: {user.email || "Chưa cập nhật"}</Text>
      <Text style={styles.info}>Giới tính: {user.gender || "Chưa cập nhật"}</Text>
      <Text style={styles.info}>Vai trò: {user.role || "Chưa cập nhật"}</Text>
      <Text style={styles.info}>Trạng thái: {user.isActive ? "Hoạt động" : "Không hoạt động"}</Text>
      <Text style={styles.info}>Ngày tạo: {formatDateTime(user.createdAt)}</Text>
      <Text style={styles.info}>Cập nhật lần cuối: {formatDateTime(user.updatedAt)}</Text>
      <Button
        title={isFollowing ? "Bỏ theo dõi" : "Follow"}
        color={isFollowing ? "red" : "green"}
        onPress={handleFollow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  profilePicture: { width: 100, height: 100, borderRadius: 50, marginBottom: 16 },
  info: { fontSize: 16, marginBottom: 8, textAlign: "center" },
});