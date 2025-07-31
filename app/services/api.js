import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API = axios.create({
  baseURL: "https://be-smoking-cessation-support-platform-w1tg.onrender.com",
  withCredentials: true,
  timeout: 15000,
});

API.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      console.log(`🔑 Token: ${token ? "✅ Present" : "❌ Missing"}`);
    } catch (error) {
      console.log("❌ Error getting token:", error);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

API.interceptors.response.use(
  (response) => {
    console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    console.log(`📦 Response data:`, response.data);
    return response;
  },
  async (error) => {
    console.log(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
    console.log(`❌ Status: ${error.response?.status || "Network Error"}`);
    console.log(`❌ Message: ${error.message}`);
    console.log(`❌ Response:`, error.response?.data);

    if (error.response?.status === 401) {
      console.log("🔐 Token expired, logging out...");
      try {
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("user");
      } catch (storageError) {
        console.log("❌ Error clearing storage:", storageError);
      }
    }
    return Promise.reject(error);
  },
);

// Test connection với endpoint có sẵn
export const testConnection = async () => {
  console.log("🔍 Testing API connection...");

  const testEndpoints = [
    "/chat/users",
    "/users/profile/me",
    "/users/all",
    "/blogs",
  ];

  for (const endpoint of testEndpoints) {
    try {
      console.log(`🔍 Testing endpoint: ${endpoint}`);
      const response = await API.get(endpoint);
      console.log(`✅ Connection test successful with ${endpoint}:`, response.status);
      return true;
    } catch (error) {
      console.log(`❌ ${endpoint} failed:`, error.response?.status, error.message);

      if (error.response?.status === 401) {
        console.log("✅ Server is running (401 = auth issue, not connection issue)");
        return true;
      }

      if (error.response?.status && error.response.status < 500) {
        console.log("✅ Server is responding (HTTP error but connection OK)");
        return true;
      }
    }
  }

  console.log("❌ All connection tests failed");
  return false;
};

// ===== AUTH ENDPOINTS =====
export const login = (email, password) => API.post("/auth/login", { email, password });

// Updated register function to match backend API requirements
export const register = (userName, email, password, confirmPassword) => {
  console.log("📤 Register payload:", { userName, email, password, confirmPassword });
  return API.post("/auth/register", {
    userName,
    email,
    password,
    confirmPassword,
  });
};

export const logout = () => API.post("/auth/logout");

// ===== BLOG ENDPOINTS =====
export const fetchBlogs = () => API.get("/blogs");
export const fetchBlogBySlug = (slug) => API.get(`/blogs/${slug}`);
export const likeBlog = (blogId) => API.post(`/blogs/${blogId}/like`);
export const addComment = (blogId, content) => API.post(`/blogs/${blogId}/comments`, { text: content });
export const createBlog = (data) => {
  console.log("📡 Creating blog at /blogs");
  console.log("📤 Blog data:", data);
  return API.post("/blogs", data);
};

export const updateBlog = (blogId, data) => {
  console.log(`📡 Updating blog at /blogs/${blogId}`);
  console.log("📤 Update data:", data);
  return API.put(`/blogs/${blogId}`, data);
};

export const deleteBlog = (blogId) => {
  console.log(`📡 Deleting blog /blogs/${blogId}`);
  return API.delete(`/blogs/${blogId}`);
};

export const getBlogById = (blogId) => {
  console.log(`📡 Getting blog by ID /blogs/${blogId}`);
  return API.get(`/blogs/${blogId}`);
};

export const getBlogByIdOrSlug = async (identifier) => {
  console.log(`📡 Getting blog by identifier: ${identifier}`);

  try {
    const response = await API.get(`/blogs/${identifier}`);
    console.log("✅ Found blog by ID:", response.data);
    return response;
  } catch (error) {
    console.log("❌ Not found by ID, trying slug...");
    try {
      const response = await fetchBlogBySlug(identifier);
      console.log("✅ Found blog by slug:", response.data);
      return response;
    } catch (slugError) {
      console.log("❌ Not found by slug either");
      throw slugError;
    }
  }
};

// ===== CHAT ENDPOINTS =====
export const fetchUsers = () => {
  console.log("📡 Fetching users from /chat/users");
  return API.get("/chat/users");
};

export const fetchConversations = () => {
  console.log("📡 Fetching conversations from /chat/conversations");
  return API.get("/chat/conversations");
};

export const getUnreadCount = () => {
  console.log("📡 Fetching unread count from /chat/unread-count");
  return API.get("/chat/unread-count");
};

export const fetchMessages = (receiverId) => {
  console.log(`📡 Fetching messages from /chat/messages/${receiverId}`);
  return API.get(`/chat/messages/${receiverId}`);
};

export const sendMessage = (receiverId, data) => {
  console.log(`📤 Sending message to /chat/messages/${receiverId}`);
  console.log(`📤 Payload:`, data);
  return API.post(`/chat/messages/${receiverId}`, data);
};

export const markRead = (senderId) => {
  console.log(`📖 Marking messages as read from /chat/mark-read/${senderId}`);
  return API.put(`/chat/mark-read/${senderId}`);
};

export const deleteMessage = (messageId) => {
  console.log(`🗑️ Deleting message /chat/messages/${messageId}`);
  return API.delete(`/chat/messages/${messageId}`);
};

// ===== USER ENDPOINTS =====
export const getAllUsers = () => {
  console.log("📡 Getting all users from /users/all");
  return API.get("/users/all");
};

export const searchUsers = (query) => {
  console.log(`📡 Searching users from /users/search?query=${query}`);
  return API.get("/users/search", { params: { query } });
};

export const getProfile = () => {
  console.log("📡 Getting current user profile from /users/profile/me");
  return API.get("/users/profile/me");
};

export const getUserProfile = (userId) => {
  console.log(`📡 Requesting user profile for userId: ${userId}`);
  return API.get(`/users/${userId}`);
};

export const updateProfile = (data) => {
  console.log("📡 Updating profile at /users/profile");
  return API.put("/users/profile", data);
};

export const getUserById = (id) => {
  console.log(`📡 Getting user by ID from /users/${id}`);
  return API.get(`/users/${id}`);
};

export const getUserStats = (id) => {
  console.log(`📡 Getting user stats from /users/${id}/stats`);
  return API.get(`/users/${id}/stats`);
};

export const changePassword = (data) => {
  console.log("📡 Changing password at /users/change-password");
  return API.put("/users/change-password", data);
};

export const updateAvatar = (formData) => {
  console.log("📡 Updating avatar at /users/update-avatar");
  return API.put("/users/update-avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ===== FOLLOW/UNFOLLOW ENDPOINTS =====
export const followUser = (id) => {
  console.log(`📡 Following user /users/follow/${id}`);
  return API.put(`/users/follow/${id}`);
};

export const unfollowUser = (id) => {
  console.log(`📡 Unfollowing user /users/unfollow/${id}`);
  return API.put(`/users/unfollow/${id}`);
};

export const getFollowers = (id, params) => {
  console.log(`📡 Getting followers /users/followers/${id}`);
  return API.get(`/users/followers/${id}`, { params });
};

export const getFollowing = (id, params) => {
  console.log(`📡 Getting following /users/following/${id}`);
  return API.get(`/users/following/${id}`, { params });
};

// ===== QUIT PLANS ENDPOINTS =====
export const getQuitPlans = (params = {}) => {
  console.log("📡 Getting quit plans from /plans/quitplans");
  console.log("📤 Query params:", params);
  return API.get("/plans/quitplans", { params });
};

export const getQuitPlanById = (planId) => {
  console.log(`📡 Getting quit plan by ID from /plans/quitplans/${planId}`);
  return API.get(`/plans/quitplans/${planId}`);
};

export const createQuitPlan = (data) => {
  console.log("📡 Creating quit plan at /plans/quitplans");
  console.log("📤 Plan data:", data);
  return API.post("/plans/quitplans", data);
};

export const updateQuitPlan = (planId, data) => {
  console.log(`📡 Updating quit plan at /plans/quitplans/${planId}`);
  console.log("📤 Update data:", data);
  return API.put(`/plans/quitplans/${planId}`, data);
};

export const deleteQuitPlan = (planId) => {
  console.log(`📡 Deleting quit plan /plans/quitplans/${planId}`);
  return API.delete(`/plans/quitplans/${planId}`);
};

export const updateQuitPlanStatus = (planId, status) => {
  console.log(`📡 Updating quit plan status /plans/quitplans/${planId}/status`);
  console.log("📤 New status:", status);
  return API.patch(`/plans/quitplans/${planId}/status`, { status });
};

export const getQuitPlanTemplates = (params = {}) => {
  console.log("📡 Getting quit plan templates");
  return API.get("/plans/quitplans", { params: { ...params, status: "template" } });
};

export const getUserQuitPlans = (userId, params = {}) => {
  console.log(`📡 Getting quit plans for user ${userId}`);
  return API.get("/plans/quitplans", { params: { ...params, userId } });
};

export const getCoachQuitPlans = (coachId, params = {}) => {
  console.log(`📡 Getting quit plans for coach ${coachId}`);
  return API.get("/plans/quitplans", { params: { ...params, coachId } });
};

export const selectQuitPlan = (quitPlanId) => {
  console.log(`📡 Selecting quit plan template /plans/quitplans/select`);
  console.log(`📤 Plan ID:`, quitPlanId);
  return API.post("/plans/quitplans/select", { quitPlanId });
};

export const getCurrentQuitPlan = () => {
  console.log("📡 Getting current quit plan from /plans/quitplans/current");
  return API.get("/plans/quitplans/current");
};

export const cancelQuitPlan = (reason) => {
  console.log(`📡 Cancelling current quit plan`);
  console.log("📤 Cancellation reason:", reason);
  return API.post("/plans/quitplans/cancel", { reason });
};

export const completeQuitPlan = (planId) => {
  console.log(`📡 Completing quit plan ${planId}`);
  return API.patch(`/plans/quitplans/${planId}/complete`);
};

// ===== QUIT PLAN HISTORY ENDPOINTS =====
export const getQuitPlanHistory = () => {
  console.log("📡 Lấy lịch sử kế hoạch từ /plans/quitplans/history");
  return API.get("/plans/quitplans/history");
};

// ===== QUIT PLAN STAGES ENDPOINTS =====
export const getQuitPlanStages = (quitPlanId, params = {}) => {
  console.log(`📡 Lấy các giai đoạn cho kế hoạch ${quitPlanId} từ /plans/quitplans/${quitPlanId}/stages`);
  return API.get(`/plans/quitplans/${quitPlanId}/stages`, { params });
};

// ===== QUIT PROGRESS ENDPOINTS =====
export const createQuitProgress = (data) => {
  console.log("📡 Creating quit progress at /quitprogress");
  console.log("📤 Progress data:", data);
  return API.post("/quitprogress", data);
};

export const getQuitProgress = (planId, params = {}) => {
  console.log(`📡 Getting quit progress for plan ${planId}`);
  return API.get("/quitprogress", { params: { ...params, planId } });
};

export const getQuitProgressByStage = (stageId) => {
  console.log(`📡 Lấy tiến độ cho giai đoạn ${stageId} từ /quitprogress/by-stage/${stageId}`);
  return API.get(`/quitprogress/by-stage/${stageId}`);
};

// ===== QUIT PLAN STAGES ENDPOINTS (CONTINUED) =====
export const createQuitPlanStage = (quitPlanId, data) => {
  console.log(`📡 Creating stage for quit plan ${quitPlanId}`);
  console.log("📤 Stage data:", data);
  return API.post(`/plans/quitplans/${quitPlanId}/stages`, data);
};

export const updateQuitPlanStage = (quitPlanId, stageId, data) => {
  console.log(`📡 Updating stage ${stageId} for quit plan ${quitPlanId}`);
  return API.put(`/plans/quitplans/${quitPlanId}/stages/${stageId}`, data);
};

export const deleteQuitPlanStage = (quitPlanId, stageId) => {
  console.log(`📡 Deleting stage ${stageId} for quit plan ${quitPlanId}`);
  return API.delete(`/plans/quitplans/${quitPlanId}/stages/${stageId}`);
};

// ===== BADGES ENDPOINTS =====
export const awardBadge = (quitPlanId, data) => {
  console.log(`📡 Awarding badge to quit plan ${quitPlanId}`);
  console.log("📤 Badge data:", data);
  return API.post(`/plans/quitplans/${quitPlanId}/badges`, data);
};

export const getQuitPlanBadges = (quitPlanId) => {
  console.log(`📡 Getting badges for quit plan ${quitPlanId}`);
  return API.get(`/plans/quitplans/${quitPlanId}/badges`);
};

// ===== MY BADGES ENDPOINT =====
export const getMyBadges = () => {
  console.log("📡 Getting user's badges from /badges/my");
  return API.get("/badges/my");
};


// ===== CUSTOM QUIT PLAN ENDPOINTS =====
export const createCustomQuitPlanRequest = (data) => {
  console.log("📡 Creating custom quit plan request");
  console.log("📤 Request data:", data);
  return API.post("/plans/quitplans/custom", data);
};

export const getCustomQuitPlanRequests = (params = {}) => {
  console.log("📡 Getting custom quit plan requests");
  console.log("📤 Params:", params);
  return API.get("/plans/quitplans/custom", { params });
};

export const getApprovedCustomQuitPlans = (params = {}) => {
  console.log("📡 Getting approved custom quit plans");
  console.log("📤 Params:", params);
  return API.get("/plans/quitplans/custom/approved", { params });
};

export const approveCustomQuitPlanRequest = (requestId, data) => {
  console.log(`📡 Approving custom quit plan request ${requestId}`);
  console.log("📤 Approval data:", data);
  return API.post(`/plans/quitplans/custom/${requestId}/approve`, data);
};

export const rejectCustomQuitPlanRequest = (requestId, reason) => {
  console.log(`📡 Rejecting custom quit plan request ${requestId}`);
  console.log("📤 Rejection reason:", reason);
  return API.post(`/plans/quitplans/custom/${requestId}/reject`, { reason });
};

API.createCustomQuitPlanRequest = createCustomQuitPlanRequest;
API.getCustomQuitPlanRequests = getCustomQuitPlanRequests;
API.getApprovedCustomQuitPlans = getApprovedCustomQuitPlans;
API.approveCustomQuitPlanRequest = approveCustomQuitPlanRequest;
API.rejectCustomQuitPlanRequest = rejectCustomQuitPlanRequest;

// ===== DEPRECATED/LEGACY ENDPOINTS =====
export const updateUserInfo = (data) => updateProfile(data);
export const getMyFollowers = () => API.get("/users/my-followers");
export const getMyFollowing = () => API.get("/users/my-following");
export const uploadAvatar = (formData) => updateAvatar(formData);

// ===== PAYMENT ENDPOINTS =====
export const getPayments = (params = {}) => {
  console.log("📡 Getting payment history from /payments");
  console.log("📤 Query params:", params);
  return API.get("/payment/history", { params });
};

// Trong services/api.js
export const getMembership = (userId, config = {}) => {
  return API.get(`/memberships/details/${userId}`, config);
};

export const getPackages = (config = {}) => {
  console.log("📡 Getting membership packages from /packages");
  return API.get("/packages", config);
};

export const createPaymentUrl = (data) => {
  console.log("📡 Creating payment URL at /payment/create-payment-url");
  console.log("📤 Payment request data:", data);
  return API.post("/payment/create-payment-url", data);
};

export const registerMembership = (data) => {
  console.log("📡 Registering membership at /memberships/register");
  console.log("📤 Membership registration data:", data);
  return API.post("/memberships/register", data);
};

export default API;