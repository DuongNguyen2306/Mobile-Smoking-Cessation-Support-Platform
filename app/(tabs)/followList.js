import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getMyFollowers, getMyFollowing } from "../services/api"; // Sửa đường dẫn

export default function FollowListScreen() {
  const router = useRouter();
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [activeTab, setActiveTab] = useState("following");
  const [loading, setLoading] = useState(true);

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

        const followingRes = await getMyFollowing();
        console.log("Following response:", followingRes.data);
        const followersRes = await getMyFollowers();
        console.log("Followers response:", followersRes.data);

        setFollowing(followingRes.data?.data || []);
        setFollowers(followersRes.data?.data || []);
      } catch (err) {
        console.error("Lỗi lấy danh sách follow:", err.message, "Response:", err.response?.data);
        Alert.alert("Lỗi", "Không thể tải danh sách follow");
      } finally {
        setLoading(false);
      }
    };
    fetchFollowData();
  }, []);

  const handleViewProfile = (userId) => {
    router.push({
      pathname: "/(tabs)/users/[id]",
      params: { id: userId },
    });
  };

  const handleChat = (userId) => {
    router.push({
      pathname: "/(tabs)/chat/[receiverId]",
      params: { userId },
    });
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userItem}>
      <TouchableOpacity onPress={() => handleViewProfile(item.id)}>
        <Text style={styles.userName}>{item.userName || "Không có tên"}</Text>
        <Text style={styles.userEmail}>{item.email || "Không có email"}</Text>
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
        ListEmptyComponent={<Text style={styles.emptyText}>Danh sách trống</Text>}
        contentContainerStyle={styles.list}
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
  userName: { fontSize: 16, fontWeight: "600", color: "#333" },
  userEmail: { fontSize: 14, color: "#666" },
  chatButton: { padding: 8, backgroundColor: "#4A90E2", borderRadius: 8 },
  chatButtonText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  emptyText: { padding: 16, textAlign: "center", color: "#888" },
  loading: { padding: 16, textAlign: "center", color: "#888" },
  list: { padding: 16 },
});