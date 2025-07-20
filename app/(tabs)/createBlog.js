"use client"

import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { useState } from "react"
import {
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
import { createBlog } from "../services/api"

const { width } = Dimensions.get("window")

export default function CreateBlogScreen() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image: "",
    tags: "",
  })
  const [loading, setLoading] = useState(false)

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const validateForm = () => {
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

      console.log("📤 Đang gửi dữ liệu blog:", blogData)
      const response = await createBlog(blogData)

      console.log("✅ Tạo blog thành công:", response.data)
      Alert.alert("Thành công", "Bài viết đã được tạo thành công!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ])
    } catch (error) {
      console.error("❌ Lỗi tạo blog:", error)
      const errorMessage = error.response?.data?.message || "Không thể tạo bài viết. Vui lòng thử lại."
      Alert.alert("Lỗi", errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#2E7D32", "#4CAF50"]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Tạo Bài Viết Mới</Text>
            <Text style={styles.headerSubtitle}>Chia sẻ kinh nghiệm của bạn</Text>
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
                <Ionicons name="eye-outline" size={16} color="#4CAF50" /> Xem trước
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
              colors={loading ? ["#CCCCCC", "#AAAAAA"] : ["#4CAF50", "#2E7D32"]}
              style={styles.submitGradient}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.submitButtonText}>Đang tạo...</Text>
                </View>
              ) : (
                <View style={styles.submitContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Tạo Bài Viết</Text>
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
