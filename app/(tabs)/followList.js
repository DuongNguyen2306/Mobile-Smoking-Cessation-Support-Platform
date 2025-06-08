import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getFollowers, getFollowing } from "../services/api"; // Cập nhật import

export default function FollowListScreen() {
  const router = useRouter();
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [activeTab, setActiveTab] = useState("following");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null); // Lưu userId
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    const fetchFollowData = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          Alert.alert("Thông báo", "Vui lòng đăng nhập để tiếp tục");
          router.push("/(auth)/login");
          return;
        }

        const storedUser = await AsyncStorage.getItem("user");
        const parsedUser = JSON.parse(storedUser);
        if (!parsedUser?.id) {
          throw new Error("Không tìm thấy userId");
        }
        setUserId(parsedUser.id);

        console.log(`API call to getFollowing for userId: ${parsedUser.id}, page: ${page}, limit: ${limit}`);
        const followingRes = await getFollowing(parsedUser.id, { page, limit });
        console.log("Following response full:", followingRes);

        console.log(`API call to getFollowers for userId: ${parsedUser.id}, page: ${page}, limit: ${limit}`);
        const followersRes = await getFollowers(parsedUser.id, { page, limit });
        console.log("Followers response full:", followersRes);

        setFollowing(followingRes.data?.data?.items || followingRes.data?.data || []);
        setFollowers(followersRes.data?.data?.items || followersRes.data?.data || []);
      } catch (err) {
        console.error("Lỗi lấy danh sách follow:", err.message, "Response:", err.response?.data);
        Alert.alert("Lỗi", "Không thể tải danh sách follow. Vui lòng thử lại hoặc kiểm tra kết nối.");
      } finally {
        setLoading(false);
      }
    };
    fetchFollowData();
  }, [page, limit]); // Thêm phụ thuộc page và limit nếu cần reload

  const handleViewProfile = (userId) => {
    router.push({
      pathname: "/(tabs)/users/[id]",
      params: { id: userId },
    });
  };

  const handleChat = (userId) => {
    router.push({
      pathname: "/(tabs)/chat/[receiverId]",
      params: { receiverId: userId },
    });
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userItem}>
      <TouchableOpacity onPress={() => handleViewProfile(item.id)} style={styles.userInfo}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        <View>
          <Text style={styles.userName}>{item.userName || "Không có tên"}</Text>
          <Text style={styles.userEmail}>{item.email || "Không có email"}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.chatButton} onPress={() => handleChat(item.id)}>
        <Text style={styles.chatButtonText}>Nhắn tin</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) return <Text style={styles.loading}>Đang tải...</Text>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "following" && styles.activeTab]}
          onPress={() => setActiveTab("following")}
        >
          <Text style={styles.tabText}>Đang follow ({following.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "followers" && styles.activeTab]}
          onPress={() => setActiveTab("followers")}
        >
          <Text style={styles.tabText}>Người follow ({followers.length})</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === "following" ? following : followers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderUserItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Danh sách trống. Vui lòng kiểm tra lại hoặc làm mới trang.
          </Text>
        }
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchFollowData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  tabContainer: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E0E0E0" },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#4A90E2" },
  tabText: { fontSize: 16, fontWeight: "600", color: "#333" },
  userItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFF",
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  userInfo: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#ccc", marginRight: 10 },
  userName: { fontSize: 16, fontWeight: "600", color: "#333" },
  userEmail: { fontSize: 14, color: "#666" },
  chatButton: { padding: 8, backgroundColor: "#4A90E2", borderRadius: 8 },
  chatButtonText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  emptyText: { padding: 16, textAlign: "center", color: "#888" },
  loading: { padding: 16, textAlign: "center", color: "#888" },
  list: { padding: 16 },
});