import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { fetchBlogs, getProfile } from "../services/api";

const { width: screenWidth } = Dimensions.get("window");

const HomeScreen = () => {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [blogs, setBlogs] = useState([]);
  const [loadingBlogs, setLoadingBlogs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState(null);

  // Function to get dynamic greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours(); // Get current hour in local timezone (Asia/Ho_Chi_Minh)
    if (hour >= 5 && hour < 12) {
      return { text: "Chào buổi sáng", emoji: "🌞" }; // Morning: 5 AM - 11:59 AM
    } else if (hour >= 12 && hour < 18) {
      return { text: "Chào buổi chiều", emoji: "☀️" }; // Afternoon: 12 PM - 5:59 PM
    } else {
      return { text: "Chào buổi tối", emoji: "🌙" }; // Evening: 6 PM - 4:59 AM
    }
  };

  // Check login status and load user profile
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (token) {
          setIsLoggedIn(true);
          await loadUserProfile();
        } else {
          setLoadingUser(false);
        }
      } catch (err) {
        console.error("❌ Error checking login status:", err);
        setError("Không thể kiểm tra trạng thái đăng nhập");
        setLoadingUser(false);
      }
    };
    checkLoginStatus();
    loadBlogs();
  }, []);

  // Fetch user profile
  const loadUserProfile = async () => {
    try {
      setLoadingUser(true);
      setError(null);
      const response = await getProfile();
      if (response.status === 200 && response.data) {
        const userData = response.data.data?.user || response.data.user || response.data || {};
        setUser({
          userName: userData.userName || userData.name || "Khách",
        });
      } else {
        throw new Error("Định dạng phản hồi không hợp lệ");
      }
    } catch (err) {
      console.error("❌ Error loading profile:", err);
      setError(err.response?.data?.message || "Không thể tải thông tin người dùng");
      setUser({ userName: "Khách" });
    } finally {
      setLoadingUser(false);
    }
  };

  // Fetch blogs from API
  const loadBlogs = async () => {
    try {
      setLoadingBlogs(true);
      const res = await fetchBlogs();
      console.log("✅ API Response:", res.data);
      const fetchedBlogs = res.data.data?.blogs || res.data.blogs || res.data || [];
      console.log(
        "✅ Blogs with Image Fields:",
        fetchedBlogs.map((blog) => ({
          id: blog._id || blog.id,
          title: blog.title,
          image: blog.image,
          createdAt: blog.createdAt,
          slug: blog.slug,
        }))
      );
      const sortedBlogs = fetchedBlogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setBlogs(sortedBlogs);
    } catch (err) {
      console.log("❌ Lỗi tải blogs:", err);
      console.log("❌ Chi tiết lỗi:", err.response?.data);
    } finally {
      setLoadingBlogs(false);
      setRefreshing(false);
    }
  };

  // Refresh handler
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([loadBlogs(), isLoggedIn ? loadUserProfile() : Promise.resolve()]).then(() => {
      setRefreshing(false);
    });
  }, [isLoggedIn]);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

 const services = [
  { title: "Bài viết", icon: "📝", screen: "/blogs", color: "#FFB74D" },
  { title: "Lịch sử thanh toán", icon: "💳", screen: "/paymentHistory", color: "#4FC3F7" },
  { title: "Đăng ký thành viên", icon: "🧑‍💼", screen: "/membership", color: "#FFB74D" },
  { title: "Kế hoạch của tôi", icon: "🗓️", screen: "/current", color: "#FFB74D" },
  { title: "Kế hoạch", icon: "📈", screen: "/plans", color: "#FFB74D" },
  { title: "Profile", icon: "👤", screen: "/profile", color: "#FFB74D" },
];


  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} tintColor="#4CAF50" />
      }
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />

      {/* Header */}
      <LinearGradient colors={["#1B5E20", "#2E7D32"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.appTitle}>QuitSmoke</Text>
          <Text style={styles.appSubtitle}>🚭</Text>
        </View>
      </LinearGradient>

      {/* Landscape Image Card */}
      <View style={styles.imageCard}>
        <Image
          source={require("../../assets/images/nosmoke.jpg")}
          style={styles.landscapeImage}
          resizeMode="contain"
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.1)", "rgba(0,0,0,0.4)"]}
          style={styles.imageOverlay}
        />

        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          {loadingUser ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : error ? (
            <Text style={styles.greeting}>Lỗi tải thông tin</Text>
          ) : (
            <>
              <Text style={styles.greeting}>
                {getGreeting().text} {getGreeting().emoji}
              </Text>
              <Text style={styles.userName}>{user?.userName || "Khách"}</Text>
            </>
          )}
        </View>

        {/* Login Button - Only show when not logged in */}
        {!isLoggedIn && (
          <View style={styles.loginButtonContainer}>
            <TouchableOpacity style={styles.loginButton} onPress={() => router.push("/(auth)/login")}>
              <LinearGradient
                colors={["#FFB74D", "#FFA726"]}
                style={styles.loginGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.loginText}>Đăng nhập</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.faceIdButton}>
              <Text style={styles.faceIdIcon}>👤</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Services Section */}
      <View style={styles.servicesSection}>
        <View style={styles.serviceHeader}>
          <Text style={styles.sectionTitle}>Dịch vụ yêu thích</Text>
          <TouchableOpacity>
            <Text style={styles.customizeText}>Tùy chỉnh ✏️</Text>
          </TouchableOpacity>
        </View>
        <LinearGradient colors={["#1B5E20", "#2E7D32", "#388E3C"]} style={styles.servicesContainer}>
          <View style={styles.servicesGrid}>
            {services.map((service, index) => (
              <TouchableOpacity key={index} style={styles.serviceItem} onPress={() => router.push(service.screen)}>
                <View style={[styles.serviceIconContainer, { backgroundColor: service.color + "20" }]}>
                  <Text style={styles.serviceIcon}>{service.icon}</Text>
                </View>
                <Text style={styles.serviceText}>{service.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>
      </View>

      {/* Blog Posts Section */}
      <View style={styles.blogSection}>
        <View style={styles.blogHeader}>
          <Text style={styles.sectionTitle}>Bài viết mới nhất</Text>
          <TouchableOpacity onPress={() => router.push("/blogs")}>
            <Text style={styles.viewAllText}>Xem tất cả →</Text>
          </TouchableOpacity>
        </View>
        {loadingBlogs ? (
          <View style={styles.loadingBlogsContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingBlogsText}>Đang tải bài viết...</Text>
          </View>
        ) : blogs.length === 0 ? (
          <View style={styles.emptyBlogsContainer}>
            <Text style={styles.emptyBlogsText}>Chưa có bài viết nào</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.blogScrollView}>
            {blogs.slice(0, 4).map((post) => (
              <TouchableOpacity
                key={post._id || post.id || post.slug || Math.random().toString()}
                style={styles.blogCard}
                onPress={() => {
                  if (post.slug) {
                    console.log("Navigating to blog:", post.slug);
                    router.push(`/blogs/${post.slug}`);
                  } else {
                    console.log("❌ Missing slug for blog:", post.title);
                  }
                }}
              >
                <View style={styles.blogContent}>
                  <Text style={styles.blogTitle} numberOfLines={2}>
                    {post.title || "Untitled"}
                  </Text>
                  <Text style={styles.blogDate}>{post.createdAt ? formatDate(post.createdAt) : "N/A"}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  header: {
    height: 80,
    justifyContent: "flex-end",
    paddingTop: 30,
    paddingBottom: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    width: "100%",
  },
  appTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
    marginRight: 10,
  },
  appSubtitle: {
    fontSize: 24,
  },
  imageCard: {
    height: 400,
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 15,
    overflow: "hidden",
    position: "relative",
  },
  landscapeImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  greetingSection: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
  },
  greeting: {
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 5,
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  loginButtonContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  loginButton: {
    flex: 1,
    marginRight: 15,
  },
  loginGradient: {
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: "center",
  },
  loginText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  faceIdButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  faceIdIcon: {
    fontSize: 20,
  },
  servicesSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  customizeText: {
    fontSize: 14,
    color: "#2E7D32",
  },
  servicesContainer: {
    borderRadius: 20,
    padding: 20,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  serviceItem: {
    width: "30%",
    alignItems: "center",
    marginBottom: 25,
  },
  serviceIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  serviceIcon: {
    fontSize: 24,
  },
  serviceText: {
    color: "#FFFFFF",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  blogSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  blogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  viewAllText: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "600",
  },
  blogScrollView: {
    paddingVertical: 5,
  },
  blogCard: {
    width: 200,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginRight: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  blogContent: {
    padding: 15,
  },
  blogTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    lineHeight: 18,
  },
  blogDate: {
    fontSize: 12,
    color: "#666",
  },
  loadingBlogsContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingBlogsText: {
    marginTop: 10,
    fontSize: 14,
    color: "#4CAF50",
  },
  emptyBlogsContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyBlogsText: {
    fontSize: 14,
    color: "#666",
  },
});

export default HomeScreen;