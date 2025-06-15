import AsyncStorage from "@react-native-async-storage/async-storage"
import axios from "axios"

const API = axios.create({
  baseURL: "http://192.168.0.197:5000", // Đảm bảo IP này đúng
  withCredentials: true,
  timeout: 15000,
})

API.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("token")
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
      console.log(`🔑 Token: ${token ? "✅ Present" : "❌ Missing"}`)
    } catch (error) {
      console.log("❌ Error getting token:", error)
    }
    return config
  },
  (error) => Promise.reject(error),
)

API.interceptors.response.use(
  (response) => {
    console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`)
    console.log(`📦 Response data:`, response.data)
    return response
  },
  async (error) => {
    console.log(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`)
    console.log(`❌ Status: ${error.response?.status || "Network Error"}`)
    console.log(`❌ Message: ${error.message}`)
    console.log(`❌ Response:`, error.response?.data)

    if (error.response?.status === 401) {
      console.log("🔐 Token expired, logging out...")
      try {
        await AsyncStorage.removeItem("token")
        await AsyncStorage.removeItem("user")
      } catch (storageError) {
        console.log("❌ Error clearing storage:", storageError)
      }
    }
    return Promise.reject(error)
  },
)

// Test connection với endpoint có sẵn
export const testConnection = async () => {
  console.log("🔍 Testing API connection...")

  const testEndpoints = [
    "/chat/users", // Chat users endpoint
    "/users/profile", // Profile endpoint
    "/users", // Users endpoint
    "/blogs", // Blogs endpoint
  ]

  for (const endpoint of testEndpoints) {
    try {
      console.log(`🔍 Testing endpoint: ${endpoint}`)
      const response = await API.get(endpoint)
      console.log(`✅ Connection test successful with ${endpoint}:`, response.status)
      return true
    } catch (error) {
      console.log(`❌ ${endpoint} failed:`, error.response?.status, error.message)

      if (error.response?.status === 401) {
        console.log("✅ Server is running (401 = auth issue, not connection issue)")
        return true
      }

      if (error.response?.status && error.response.status < 500) {
        console.log("✅ Server is responding (HTTP error but connection OK)")
        return true
      }
    }
  }

  console.log("❌ All connection tests failed")
  return false
}

// Auth endpoints
export const login = (email, password) => API.post("/auth/login", { email, password })
export const register = (name, email, password) => API.post("/auth/register", { name, email, password })
export const logout = () => API.post("/auth/logout")

// Blog endpoints
export const fetchBlogs = () => API.get("/blogs")
export const fetchBlogBySlug = (slug) => API.get(`/blogs/${slug}`)
export const likeBlog = (blogId) => API.post(`/blogs/${blogId}/like`)
export const addComment = (blogId, content) => API.post(`/blogs/${blogId}/comments`, { text: content })

// Chat endpoints - Sử dụng đúng API từ documentation
export const fetchUsers = () => {
  console.log("📡 Fetching users from /chat/users")
  return API.get("/chat/users")
}

export const fetchConversations = () => {
  console.log("📡 Fetching conversations from /chat/conversations")
  return API.get("/chat/conversations")
}

export const getUnreadCount = () => {
  console.log("📡 Fetching unread count from /chat/unread-count")
  return API.get("/chat/unread-count")
}

export const fetchMessages = (receiverId) => {
  console.log(`📡 Fetching messages from /chat/messages/${receiverId}`)
  return API.get(`/chat/messages/${receiverId}`)
}

export const sendMessage = (receiverId, data) => {
  console.log(`📤 Sending message to /chat/messages/${receiverId}`)
  console.log(`📤 Payload:`, data)
  return API.post(`/chat/messages/${receiverId}`, data)
}

export const markRead = (senderId) => {
  console.log(`📖 Marking messages as read from /chat/mark-read/${senderId}`)
  return API.put(`/chat/mark-read/${senderId}`)
}

export const deleteMessage = (messageId) => {
  console.log(`🗑️ Deleting message /chat/messages/${messageId}`)
  return API.delete(`/chat/messages/${messageId}`)
}

// User endpoints
export const getProfile = () => API.get("/users/profile")
export const getUserProfile = (userId) => API.get(`/users/${userId}`)
export const getAllUsers = () => API.get("/users/all")
export const searchUsers = (query) => API.get("/users/search", { params: { query } })
export const getUserById = (id) => API.get(`/users/${id}`)
export const getUserStats = (id) => API.get(`/users/${id}/stats`)
export const updateProfile = (data) => API.put("/users/update-profile", data)
export const updateUserInfo = (data) => API.put("/users/update-profile", data)
export const changePassword = (data) => API.put("/users/change-password", data)
export const updateAvatar = (data) => API.put("/users/update-avatar", data)
export const uploadAvatar = (formData) =>
  API.put("/users/upload-avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })

// Follow/Unfollow endpoints
export const followUser = (id) => API.post(`/users/${id}/follow`)
export const unfollowUser = (id) => API.post(`/users/${id}/unfollow`)
export const getFollowers = (id, params) => API.get(`/users/${id}/followers`, { params })
export const getFollowing = (id, params) => API.get(`/users/${id}/following`, { params })
export const getMyFollowers = () => API.get("/users/my-followers")
export const getMyFollowing = () => API.get("/users/my-following")

export default API
