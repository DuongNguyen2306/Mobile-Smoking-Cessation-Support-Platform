"use client"

import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"
import { fetchBlogBySlug, fetchBlogs, getBlogById, updateBlog } from "../services/api"

const { width } = Dimensions.get("window")

export default function EditBlogScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()

  console.log("🔍 All params received:", params)
  console.log("🔍 blogId from params:", params.blogId)
  console.log("🔍 slug from params:", params.slug)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image: "",
    tags: "",
  })
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [originalData, setOriginalData] = useState(null)

  useEffect(() => {
    if (params.blogId || params.slug) {
      loadBlogData()
    } else {
      console.log("❌ Không có blogId hoặc slug trong params")
      Alert.alert("Lỗi", "Không tìm thấy ID bài viết", [{ text: "OK", onPress: () => router.back() }])
    }
  }, [params.blogId, params.slug])

  const loadBlogData = async () => {
    try {
      console.log("📡 Bắt đầu tải dữ liệu blog...")
      console.log("🔍 Sử dụng blogId:", params.blogId)
      console.log("🔍 Sử dụng slug:", params.slug)

      let blog = null

      // Phương pháp 1: Thử lấy bằng ID trực tiếp
      if (params.blogId) {
        try {
          console.log("📡 Thử method 1: getBlogById")
          const response = await getBlogById(params.blogId)
          console.log("✅ Response từ getBlogById:", response.data)

          if (response.data.success && response.data.data) {
            blog = response.data.data
            console.log("✅ Tìm thấy blog bằng ID:", blog)
          } else {
            console.log("❌ API trả về success nhưng data null")
          }
        } catch (idError) {
          console.log("❌ Lỗi khi lấy bằng ID:", idError.response?.data || idError.message)
        }
      }

      // Phương pháp 2: Nếu chưa có blog, thử lấy bằng slug
      if (!blog && params.slug) {
        try {
          console.log("📡 Thử method 2: fetchBlogBySlug")
          const response = await fetchBlogBySlug(params.slug)
          console.log("✅ Response từ fetchBlogBySlug:", response.data)

          if (response.data.success && response.data.data) {
            blog = response.data.data
            console.log("✅ Tìm thấy blog bằng slug:", blog)
          }
        } catch (slugError) {
          console.log("❌ Lỗi khi lấy bằng slug:", slugError.response?.data || slugError.message)
        }
      }

      // Phương pháp 3: Lấy tất cả blogs và tìm blog cần thiết
      if (!blog) {
        try {
          console.log("📡 Thử method 3: fetchBlogs và tìm blog")
          const response = await fetchBlogs()
          console.log("✅ Response từ fetchBlogs:", response.data)

          const allBlogs = response.data.data?.blogs || response.data.blogs || response.data || []
          console.log("📝 Tổng số blogs:", allBlogs.length)

          // Tìm blog theo ID hoặc slug
          if (params.blogId) {
            blog = allBlogs.find((b) => b._id === params.blogId || b.id === params.blogId)
            console.log("🔍 Tìm blog theo ID trong danh sách:", blog ? "✅ Tìm thấy" : "❌ Không tìm thấy")
          }

          if (!blog && params.slug) {
            blog = allBlogs.find((b) => b.slug === params.slug)
            console.log("🔍 Tìm blog theo slug trong danh sách:", blog ? "✅ Tìm thấy" : "❌ Không tìm thấy")
          }
        } catch (allBlogsError) {
          console.log("❌ Lỗi khi lấy tất cả blogs:", allBlogsError.response?.data || allBlogsError.message)
        }
      }

      if (blog && blog.title) {
        console.log("✅ Tìm thấy blog, đang set form data...")
        console.log("📝 Blog data:", blog)

        // Lưu dữ liệu gốc
        setOriginalData(blog)

        // Xử lý tags
        let tagsString = ""
        if (blog.tags) {
          if (Array.isArray(blog.tags)) {
            tagsString = blog.tags.join(", ")
          } else if (typeof blog.tags === "string") {
            tagsString = blog.tags
          }
        }

        // Set form data
        const blogData = {
          title: blog.title || "",
          description: blog.description || blog.content || "",
          image: blog.image || "",
          tags: tagsString,
        }

        console.log("📝 Setting form data:", blogData)
        setFormData(blogData)
      } else {
        console.log("❌ Không tìm thấy blog hoặc blog không có title")
        console.log("❌ Blog object:", blog)

        Alert.alert(
          "Không tìm thấy bài viết",
          `Không thể tìm thấy bài viết với:\n- ID: ${params.blogId || "N/A"}\n- Slug: ${params.slug || "N/A"}\n\nCó thể bài viết đã bị xóa hoặc bạn không có quyền truy cập.`,
          [{ text: "OK", onPress: () => router.back() }],
        )
      }
    } catch (error) {
      console.error("❌ Lỗi tải blog:", error)
      console.error("❌ Error response:", error.response?.data)
      console.error("❌ Error message:", error.message)

      Alert.alert("Lỗi", `Không thể tải dữ liệu bài viết.\nLỗi: ${error.response?.data?.message || error.message}`, [
        { text: "OK", onPress: () => router.back() },
      ])
    } finally {
      setInitialLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    console.log(`📝 Changing ${field} to:`, value)
    setFormData((prev) => {
      const newData = { ...prev, [field]: value }
      console.log("📝 New form data:", newData)
      return newData
    })
  }

  const validateForm = () => {
    console.log("🔍 Validating form:", formData)
    if (!formData.title.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tiêu đề bài viết")
      return false
    }
    if (!formData.description.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập nội dung bài viết")
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      const tagsArray = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      const blogData = {
        title: formData.title,
        description: formData.description,
        image: formData.image || "https://example.com/images/quit-smoking.jpg",
        tags: tagsArray.length > 0 ? tagsArray : ["quit-smoking"],
      }

      const updateId = originalData?._id || originalData?.id || params.blogId
      console.log("📤 Đang cập nhật blog với ID:", updateId)
      console.log("📤 Dữ liệu cập nhật:", blogData)

      const response = await updateBlog(updateId, blogData)

      console.log("✅ Cập nhật blog thành công:", response.data)
      Alert.alert("Thành công", "Bài viết đã được cập nhật thành công!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ])
    } catch (error) {
      console.error("❌ Lỗi cập nhật blog:", error)
      const errorMessage = error.response?.data?.message || "Không thể cập nhật bài viết. Vui lòng thử lại."
      Alert.alert("Lỗi", errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Debug render
  console.log("🎨 Rendering with formData:", formData)
  console.log("🎨 Initial loading:", initialLoading)

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={["#E8F5E8", "#F1F8E9"]} style={styles.loadingGradient}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Đang tải dữ liệu bài viết...</Text>
          <Text style={styles.debugText}>ID: {params.blogId}</Text>
          <Text style={styles.debugText}>Slug: {params.slug}</Text>
        </LinearGradient>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#2E7D32", "#4CAF50"]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Chỉnh Sửa Bài Viết</Text>
            <Text style={styles.headerSubtitle}>
              {originalData?.title ? `"${originalData.title}"` : "Cập nhật nội dung của bạn"}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            {/* Thông tin blog gốc */}
            {originalData && (
              <View style={styles.originalInfo}>
                <Text style={styles.originalInfoTitle}>
                  <Ionicons name="information-circle" size={16} color="#2196F3" /> Thông tin gốc
                </Text>
                <Text style={styles.originalInfoText}>Đang chỉnh sửa: "{originalData.title}"</Text>
                <Text style={styles.originalInfoDate}>
                  Tạo lúc: {originalData.createdAt ? new Date(originalData.createdAt).toLocaleString("vi-VN") : "N/A"}
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="create-outline" size={16} color="#4CAF50" /> Tiêu đề bài viết *
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập tiêu đề bài viết..."
                value={formData.title}
                onChangeText={(value) => handleInputChange("title", value)}
                maxLength={100}
              />
              <Text style={styles.charCount}>{formData.title.length}/100</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="document-text-outline" size={16} color="#4CAF50" /> Nội dung bài viết *
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Chia sẻ kinh nghiệm, câu chuyện của bạn về hành trình bỏ thuốc lá..."
                value={formData.description}
                onChangeText={(value) => handleInputChange("description", value)}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.charCount}>{formData.description.length}/1000</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="image-outline" size={16} color="#4CAF50" /> Hình ảnh (URL)
              </Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com/image.jpg"
                value={formData.image}
                onChangeText={(value) => handleInputChange("image", value)}
                keyboardType="url"
              />
              <Text style={styles.hint}>Để trống để sử dụng hình ảnh mặc định</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Ionicons name="pricetags-outline" size={16} color="#4CAF50" /> Thẻ tag
              </Text>
              <TextInput
                style={styles.input}
                placeholder="quit-smoking, health, motivation (phân cách bằng dấu phẩy)"
                value={formData.tags}
                onChangeText={(value) => handleInputChange("tags", value)}
              />
              <Text style={styles.hint}>Phân cách các tag bằng dấu phẩy</Text>
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.previewTitle}>
                <Ionicons name="eye-outline" size={16} color="#4CAF50" /> Xem trước thay đổi
              </Text>
              <View style={styles.previewCard}>
                <LinearGradient colors={["#FFFFFF", "#F8FFF8"]} style={styles.previewGradient}>
                  <View style={styles.previewHeader}>
                    <View style={styles.categoryBadge}>
                      <Ionicons name="leaf" size={12} color="#4CAF50" />
                      <Text style={styles.categoryText}>Sức khỏe</Text>
                    </View>
                  </View>
                  <Text style={styles.previewCardTitle} numberOfLines={2}>
                    {formData.title || "Tiêu đề bài viết sẽ hiển thị ở đây"}
                  </Text>
                  <Text style={styles.previewCardDescription} numberOfLines={3}>
                    {formData.description || "Nội dung bài viết sẽ hiển thị ở đây..."}
                  </Text>
                </LinearGradient>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={loading ? ["#CCCCCC", "#AAAAAA"] : ["#FF9800", "#F57C00"]}
              style={styles.submitGradient}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.submitButtonText}>Đang cập nhật...</Text>
                </View>
              ) : (
                <View style={styles.submitContainer}>
                  <Ionicons name="save" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Lưu Thay Đổi</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FFF8",
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "500",
  },
  debugText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  headerGradient: {
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  form: {
    padding: 20,
  },
  originalInfo: {
    backgroundColor: "rgba(33, 150, 243, 0.1)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  originalInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2196F3",
    marginBottom: 8,
  },
  originalInfoText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    marginBottom: 4,
  },
  originalInfoDate: {
    fontSize: 12,
    color: "#666",
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E7D32",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    color: "#333",
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: "#888",
    textAlign: "right",
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
    fontStyle: "italic",
  },
  previewSection: {
    marginTop: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E7D32",
    marginBottom: 12,
  },
  previewCard: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewGradient: {
    borderRadius: 16,
    padding: 16,
  },
  previewHeader: {
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  categoryText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
    marginLeft: 4,
  },
  previewCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 8,
    lineHeight: 22,
  },
  previewCardDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#F8FFF8",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  submitButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  submitContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginLeft: 8,
  },
})
