import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { useState } from "react"
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"
// Import toàn bộ API module
import API from "../services/api"

const COLORS = {
  primary: "#4CAF50",
  secondary: "#2E7D32",
  accent: "#66BB6A",
  success: "#4CAF50",
  warning: "#FF9800",
  error: "#FF5722",
  info: "#2196F3",
  text: "#333",
  lightText: "#666",
  background: "#F8FFF8",
  lightBackground: "#F1F8E9",
  white: "#FFFFFF",
  overlay: "rgba(0,0,0,0.3)",
}

const RULE_TYPES = [
  { key: "daily", label: "Giảm hàng ngày", description: "Số điếu giảm mỗi ngày", unit: "điếu/ngày" },
  { key: "duration", label: "Thời gian", description: "Tổng thời gian thực hiện", unit: "ngày" },
  { key: "specificGoal", label: "Mục tiêu cụ thể", description: "Mục tiêu đặc biệt", unit: "" },
]

export default function CustomRequestScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    rules: [],
  })

  const [currentRule, setCurrentRule] = useState({
    rule: "daily",
    value: "",
    description: "",
  })

  const handleAddRule = () => {
    if (!currentRule.value.trim() || !currentRule.description.trim()) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin quy tắc")
      return
    }

    const ruleType = RULE_TYPES.find((r) => r.key === currentRule.rule)
    const newRule = {
      rule: currentRule.rule,
      value: currentRule.rule === "specificGoal" ? currentRule.value : Number.parseInt(currentRule.value) || 0,
      description: currentRule.description.trim(),
    }

    setFormData((prev) => ({
      ...prev,
      rules: [...prev.rules, newRule],
    }))

    setCurrentRule({
      rule: "daily",
      value: "",
      description: "",
    })
  }

  const handleRemoveRule = (index) => {
    setFormData((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      Alert.alert("Lỗi", "Vui lòng điền tiêu đề và mô tả")
      return
    }

    if (formData.rules.length === 0) {
      Alert.alert("Lỗi", "Vui lòng thêm ít nhất một quy tắc")
      return
    }

    try {
      setLoading(true)
      console.log("Submitting custom quit plan request:", formData)

      const response = await API.createCustomQuitPlanRequest({
        title: formData.title.trim(),
        description: formData.description.trim(),
        rules: formData.rules,
      })

      if (response.status === 200 || response.status === 201) {
        Alert.alert(
          "🎉 Yêu cầu đã được gửi!",
          "Kế hoạch tùy chỉnh của bạn đã được gửi đến coach. Bạn sẽ nhận được thông báo khi có phản hồi.",
          [
            {
              text: "Xem kế hoạch có sẵn",
              onPress: () => router.push("/plans"),
            },
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ],
        )
      }
    } catch (error) {
      console.error("Error creating custom request:", error)
      let errorMessage = "Không thể gửi yêu cầu. Vui lòng thử lại."

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.status === 401) {
        errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
      } else if (error.response?.status === 400) {
        errorMessage = "Thông tin yêu cầu không hợp lệ. Vui lòng kiểm tra lại."
      } else if (error instanceof TypeError && error.message.includes("is not a function")) {
        errorMessage = "Lỗi hệ thống: Hàm API không được định nghĩa. Vui lòng kiểm tra với nhà phát triển."
      }

      Alert.alert("Lỗi", errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getRuleTypeInfo = (ruleKey) => {
    return RULE_TYPES.find((r) => r.key === ruleKey) || RULE_TYPES[0]
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[COLORS.secondary, COLORS.primary]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Yêu cầu kế hoạch tùy chỉnh</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <LinearGradient colors={[COLORS.info + "10", COLORS.white]} style={styles.infoGradient}>
              <Ionicons name="information-circle" size={24} color={COLORS.info} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Kế hoạch cá nhân hóa</Text>
                <Text style={styles.infoText}>
                  Tạo yêu cầu kế hoạch bỏ thuốc phù hợp với hoàn cảnh cá nhân. Coach sẽ xem xét và tạo kế hoạch chi tiết
                  cho bạn.
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tiêu đề kế hoạch *</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, title: text }))}
                placeholder="Ví dụ: Kế hoạch cá nhân cho công việc"
                placeholderTextColor={COLORS.lightText}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mô tả chi tiết *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, description: text }))}
                placeholder="Mô tả hoàn cảnh, lý do cần kế hoạch tùy chỉnh..."
                placeholderTextColor={COLORS.lightText}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          {/* Rules Section */}
          <View style={styles.rulesSection}>
            <Text style={styles.sectionTitle}>Quy tắc và yêu cầu</Text>

            {/* Current Rules */}
            {formData.rules.length > 0 && (
              <View style={styles.currentRules}>
                <Text style={styles.subTitle}>Quy tắc đã thêm ({formData.rules.length})</Text>
                {formData.rules.map((rule, index) => {
                  const ruleInfo = getRuleTypeInfo(rule.rule)
                  return (
                    <View key={index} style={styles.ruleCard}>
                      <View style={styles.ruleHeader}>
                        <View style={styles.ruleIcon}>
                          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                        </View>
                        <View style={styles.ruleContent}>
                          <Text style={styles.ruleName}>{ruleInfo.label}</Text>
                          <Text style={styles.ruleValue}>
                            {rule.value} {ruleInfo.unit}
                          </Text>
                          <Text style={styles.ruleDescription}>{rule.description}</Text>
                        </View>
                        <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveRule(index)}>
                          <Ionicons name="close-circle" size={20} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}

            {/* Add New Rule */}
            <View style={styles.addRuleSection}>
              <Text style={styles.subTitle}>Thêm quy tắc mới</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Loại quy tắc</Text>
                <View style={styles.ruleTypeContainer}>
                  {RULE_TYPES.map((ruleType) => (
                    <TouchableOpacity
                      key={ruleType.key}
                      style={[styles.ruleTypeButton, currentRule.rule === ruleType.key && styles.ruleTypeActive]}
                      onPress={() => setCurrentRule((prev) => ({ ...prev, rule: ruleType.key }))}
                    >
                      <Text
                        style={[styles.ruleTypeText, currentRule.rule === ruleType.key && styles.ruleTypeTextActive]}
                      >
                        {ruleType.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Giá trị {getRuleTypeInfo(currentRule.rule).unit && `(${getRuleTypeInfo(currentRule.rule).unit})`}
                </Text>
                <TextInput
                  style={styles.input}
                  value={currentRule.value}
                  onChangeText={(text) => setCurrentRule((prev) => ({ ...prev, value: text }))}
                  placeholder={`Nhập ${getRuleTypeInfo(currentRule.rule).description.toLowerCase()}`}
                  placeholderTextColor={COLORS.lightText}
                  keyboardType={currentRule.rule === "specificGoal" ? "default" : "numeric"}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Mô tả quy tắc</Text>
                <TextInput
                  style={styles.input}
                  value={currentRule.description}
                  onChangeText={(text) => setCurrentRule((prev) => ({ ...prev, description: text }))}
                  placeholder="Mô tả chi tiết về quy tắc này..."
                  placeholderTextColor={COLORS.lightText}
                />
              </View>

              <TouchableOpacity style={styles.addRuleButton} onPress={handleAddRule}>
                <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                <Text style={styles.addRuleText}>Thêm quy tắc</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
              <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.submitGradient}>
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color={COLORS.white} />
                    <Text style={styles.submitText}>Gửi yêu cầu</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerGradient: {
    paddingTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.white,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  infoCard: {
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoGradient: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.info,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.lightText,
    lineHeight: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.secondary,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  rulesSection: {
    marginBottom: 24,
  },
  currentRules: {
    marginBottom: 20,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  ruleCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ruleHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  ruleIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  ruleContent: {
    flex: 1,
  },
  ruleName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  ruleValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 4,
  },
  ruleDescription: {
    fontSize: 12,
    color: COLORS.lightText,
  },
  removeButton: {
    padding: 4,
  },
  addRuleSection: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ruleTypeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ruleTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.lightBackground,
    backgroundColor: COLORS.white,
  },
  ruleTypeActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  ruleTypeText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  ruleTypeTextActive: {
    color: COLORS.white,
  },
  addRuleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary + "10",
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  addRuleText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
    marginLeft: 8,
  },
  submitSection: {
    marginBottom: 40,
  },
  submitButton: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  submitText: {
    fontSize: 18,
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 12,
  },
})