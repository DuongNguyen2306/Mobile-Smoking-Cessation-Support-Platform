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
    "/users/profile/me", // Profile endpoint - UPDATED
    "/users/all", // Users endpoint - UPDATED
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

// ===== AUTH ENDPOINTS =====
export const login = (email, password) => API.post("/auth/login", { email, password })
export const register = (name, email, password) => API.post("/auth/register", { name, email, password })
export const logout = () => API.post("/auth/logout")

// ===== BLOG ENDPOINTS =====
export const fetchBlogs = () => API.get("/blogs")
export const fetchBlogBySlug = (slug) => API.get(`/blogs/${slug}`)
export const likeBlog = (blogId) => API.post(`/blogs/${blogId}/like`)
export const addComment = (blogId, content) => API.post(`/blogs/${blogId}/comments`, { text: content })

// ===== CHAT ENDPOINTS =====
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

// ===== USER ENDPOINTS - UPDATED TO MATCH API DOCUMENTATION =====

// Get all users
export const getAllUsers = () => {
  console.log("📡 Getting all users from /users/all")
  return API.get("/users/all")
}

// Search users
export const searchUsers = (query) => {
  console.log(`📡 Searching users from /users/search?query=${query}`)
  return API.get("/users/search", { params: { query } })
}

// Get current user profile
export const getProfile = () => {
  console.log("📡 Getting current user profile from /users/profile/me")
  return API.get("/users/profile/me")
}

// Get user profile (for viewing other user's profile)
export const getUserProfile = (userId) => {
  console.log(`📡 Requesting user profile for userId: ${userId}`);
  return API.get(`/users/${userId}`); // Sử dụng endpoint động với userId
};

// Update user profile
export const updateProfile = (data) => {
  console.log("📡 Updating profile at /users/profile")
  return API.put("/users/profile", data)
}

// Get user by ID
export const getUserById = (id) => {
  console.log(`📡 Getting user by ID from /users/${id}`)
  return API.get(`/users/${id}`)
}

// Get user statistics
export const getUserStats = (id) => {
  console.log(`📡 Getting user stats from /users/${id}/stats`)
  return API.get(`/users/${id}/stats`)
}

// Change password
export const changePassword = (data) => {
  console.log("📡 Changing password at /users/change-password")
  return API.put("/users/change-password", data)
}

// Update avatar
export const updateAvatar = (formData) => {
  console.log("📡 Updating avatar at /users/update-avatar")
  return API.put("/users/update-avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
}

// ===== FOLLOW/UNFOLLOW ENDPOINTS - UPDATED TO MATCH API DOCUMENTATION =====

// Follow a user
export const followUser = (id) => {
  console.log(`📡 Following user /users/follow/${id}`)
  return API.put(`/users/follow/${id}`)
}

// Unfollow a user
export const unfollowUser = (id) => {
  console.log(`📡 Unfollowing user /users/unfollow/${id}`)
  return API.put(`/users/unfollow/${id}`)
}

// Get followers of a user
export const getFollowers = (id, params) => {
  console.log(`📡 Getting followers /users/followers/${id}`)
  return API.get(`/users/followers/${id}`, { params })
}

// Get users followed by a user
export const getFollowing = (id, params) => {
  console.log(`📡 Getting following /users/following/${id}`)
  return API.get(`/users/following/${id}`, { params })
}

// ===== DEPRECATED/LEGACY ENDPOINTS (for backward compatibility) =====
export const updateUserInfo = (data) => updateProfile(data) // Alias
export const getMyFollowers = () => API.get("/users/my-followers") // If this endpoint exists
export const getMyFollowing = () => API.get("/users/my-following") // If this endpoint exists
export const uploadAvatar = (formData) => updateAvatar(formData) // Alias

export default API