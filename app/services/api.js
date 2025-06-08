import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API = axios.create({
  baseURL: "http://192.168.0.198:5000",
  withCredentials: true,
});

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

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log("Token không hợp lệ hoặc đã hết hạn, đăng xuất...");
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const login = (email, password) => API.post("/auth/login", { email, password });
export const register = (name, email, password) => API.post("/auth/register", { name, email, password });
export const logout = () => API.post("/auth/logout");

// Blog endpoints
export const fetchBlogs = () => API.get("/blogs");
export const fetchBlogBySlug = (slug) => API.get(`/blogs/${slug}`);
export const likeBlog = (blogId) => API.post(`/blogs/${blogId}/like`);
export const addComment = (blogId, content) => API.post(`/blogs/${blogId}/comments`, { content });

// Chat endpoints
export const fetchUsers = () => API.get("/chat/users");
export const fetchConversations = () => API.get("/chat/conversations");
export const fetchMessages = (receiverId) => API.get(`/chat/messages/${receiverId}`);
export const sendMessage = (receiverId, data) => API.post(`/chat/messages/${receiverId}`, data); // Cập nhật để khớp với API
export const markRead = (senderId) => API.put(`/chat/mark-read/${senderId}`);
export const deleteMessage = (messageId) => API.delete(`/chat/messages/${messageId}`);

// User endpoints
export const getProfile = () => API.get("/users/profile/me");
export const getUserProfile = (userId) => API.get(`/users/${userId}`);
export const getAllUsers = () => API.get("/users/all");
export const searchUsers = (query) => API.get("/users/search", { params: { query } });
export const getUserById = (id) => API.get(`/users/${id}`);
export const getUserStats = (id) => API.get(`/users/${id}/stats`);
export const updateProfile = (data) => API.put("/users/update-profile", data);
export const updateUserInfo = (data) => API.put("/users/update-profile", data);
export const changePassword = (data) => API.put("/users/change-password", data);
export const updateAvatar = (data) => API.put("/users/update-avatar", data);
export const uploadAvatar = (formData) => API.put("/users/upload-avatar", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});
export const uploadAvatarManual = (formData) => API.put("/users/upload-avatar-manual", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});
export const followUser = (id) => API.put(`/users/follow/${id}`);
export const unfollowUser = (id) => API.put(`/users/unfollow/${id}`);
export const getFollowers = (id) => API.get(`/users/followers/${id}`);
export const getFollowing = (id) => API.get(`/users/following/${id}`);
export const getMyFollowers = () => API.get("/users/my-followers");
export const getMyFollowing = () => API.get("/users/my-following");

export default API; // Export instance axios mặc định