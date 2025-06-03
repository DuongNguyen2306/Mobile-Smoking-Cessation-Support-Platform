import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API = axios.create({
  baseURL: "http://192.168.0.198:5000",
  withCredentials: true,
});

// Thêm interceptor để tự động gắn token vào header
API.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Thêm interceptor để xử lý lỗi 401
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log("Token không hợp lệ hoặc đã hết hạn, đăng xuất...");
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      // Điều hướng về màn hình đăng nhập
      // Lưu ý: Bạn cần một cách để điều hướng từ đây, ví dụ sử dụng useRouter trong một context
    }
    return Promise.reject(error);
  }
);

export const login = (email, password) => API.post("/auth/login", { email, password });
export const register = (name, email, password) => API.post("/auth/register", { name, email, password });
export const fetchBlogs = () => API.get("/blogs");
export const fetchBlogBySlug = (slug) => API.get(`/blogs/${slug}`);
export const logout = () => API.post("/auth/logout");
export const fetchUsers = () => API.get("/chat/users");
export const fetchConversations = () => API.get("/chat/conversations");
export const fetchMessages = (receiverId) => API.get(`/chat/messages/${receiverId}`);
export const sendMessage = (receiverId, data) => API.post(`/chat/messages/${receiverId}`, data);
export const markRead = (senderId) => API.put(`/chat/mark-read/${senderId}`);
export const deleteMessage = (messageId) => API.delete(`/chat/messages/${messageId}`);