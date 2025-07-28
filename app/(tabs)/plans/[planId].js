"use client"

import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { getCurrentQuitPlan, getQuitPlanById, selectQuitPlan } from "../../services/api"

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

const STATUS_CONFIG = {
  ongoing: {
    color: COLORS.success,
    label: "Đang thực hiện",
    icon: "play-circle",
    gradient: ["#4CAF50", "#66BB6A"],
  },
  completed: {
    color: COLORS.info,
    label: "Hoàn thành",
    icon: "checkmark-circle",
    gradient: ["#2196F3", "#42A5F5"],
  },
  failed: {
    color: COLORS.error,
    label: "Thất bại",
    icon: "close-circle",
    gradient: ["#FF5722", "#FF7043"],
  },
  template: {
    color: COLORS.warning,
    label: "Mẫu kế hoạch",
    icon: "document-text",
    gradient: ["#FF9800", "#FFB74D"],
  },
}

export default function QuitPlanDetailScreen() {
  const router = useRouter()
  const { planId } = useLocalSearchParams()
  const [plan, setPlan] = useState(null)
  const [stages, setStages] = useState([])
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [hasCurrentPlan, setHasCurrentPlan] = useState(false)

  const [statusConfig, setStatusConfig] = useState(STATUS_CONFIG.template)
  const [isTemplate, setIsTemplate] = useState(false)

  useEffect(() => {
    if (planId) {
      loadPlanDetail()
      checkCurrentPlan()
    }
  }, [planId])

  const loadPlanDetail = useCallback(async () => {
    try {
      setLoading(true)
      console.log("Loading plan detail for ID:", planId)
      const response = await getQuitPlanById(planId)

      if (response.status === 200 && response.data) {
        const data = response.data
        console.log("Loaded plan detail:", data)

        // Set plan data
        setPlan(data.plan || data.data?.quitPlan || data.data || data)

        // Set stages if available
        if (data.stages && Array.isArray(data.stages)) {
          setStages(data.stages)
        }

        // Set progress if available
        if (data.progress && Array.isArray(data.progress)) {
          setProgress(data.progress)
        }
      }
    } catch (error) {
      console.error("Error loading plan detail:", error)
      Alert.alert("Lỗi", "Không thể tải chi tiết kế hoạch")
    } finally {
      setLoading(false)
    }
  }, [planId])

  const checkCurrentPlan = useCallback(async () => {
    try {
      const response = await getCurrentQuitPlan()
      if (response.status === 200 && response.data) {
        setHasCurrentPlan(true)
        console.log("User has current plan:", response.data)
      }
    } catch (error) {
      // No current plan or error - user can register for new plan
      console.log("No current plan found:", error.response?.status)
      setHasCurrentPlan(false)
    }
  }, [])

  const handleRegisterPlan = async () => {
    // Kiểm tra xem có phải template không
    if (!isTemplate || plan.status !== "template") {
      Alert.alert(
        "Không thể đăng ký",
        "Chỉ có thể đăng ký các kế hoạch mẫu (template). Kế hoạch này có trạng thái: " + statusConfig.label,
        [{ text: "OK" }],
      )
      return
    }

    if (hasCurrentPlan) {
      Alert.alert("Thông báo", "Bạn đã có kế hoạch đang thực hiện. Bạn có muốn thay thế bằng kế hoạch này không?", [
        { text: "Hủy", style: "cancel" },
        { text: "Thay thế", onPress: () => proceedWithRegistration() },
      ])
    } else {
      proceedWithRegistration()
    }
  }

  const proceedWithRegistration = async () => {
    try {
      setRegistering(true)
      console.log("Registering for template plan:", planId)
      console.log("Plan status:", plan.status)

      // Đảm bảo chỉ gọi API với template plans
      if (plan.status !== "template") {
        throw new Error("Chỉ có thể đăng ký kế hoạch mẫu")
      }

      const response = await selectQuitPlan(planId)

      if (response.status === 200 || response.status === 201) {
        Alert.alert(
          "🎉 Đăng ký thành công!",
          "Kế hoạch bỏ thuốc của bạn đã được kích hoạt. Hệ thống đã tự động thiết lập ngày bắt đầu (hôm nay) và các giai đoạn dựa trên template.",
          [
            {
              text: "Xem kế hoạch của tôi",
              onPress: () => {
                router.push("/current")
              },
            },
            {
              text: "Ở lại trang này",
              style: "cancel",
            },
          ],
        )

        // Update plan status locally
        setPlan((prev) => ({ ...prev, status: "ongoing" }))
        setHasCurrentPlan(true)
      }
    } catch (error) {
      console.error("Error registering plan:", error)

      let errorMessage = "Không thể đăng ký kế hoạch. Vui lòng thử lại."

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message

        // Xử lý lỗi template đặc biệt
        if (errorMessage.includes("template")) {
          errorMessage = "Chỉ có thể đăng ký các kế hoạch mẫu (template). Vui lòng chọn kế hoạch khác."
        }
      } else if (error.response?.status === 400) {
        errorMessage = "Chỉ có thể đăng ký kế hoạch mẫu. Vui lòng kiểm tra lại."
      } else if (error.response?.status === 401) {
        errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
      } else if (error.response?.status === 409) {
        errorMessage = "Bạn đã có kế hoạch đang thực hiện. Vui lòng hoàn thành kế hoạch hiện tại trước."
      }

      Alert.alert("Lỗi đăng ký", errorMessage)
    } finally {
      setRegistering(false)
    }
  }

  const renderStages = () => {
    if (!stages || stages.length === 0) return null

    return (
      <View style={styles.stagesSection}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="list" size={20} color={COLORS.primary} /> Các giai đoạn ({stages.length})
        </Text>

        {stages.map((stage, index) => (
          <View key={stage._id} style={styles.stageCard}>
            <View style={styles.stageHeader}>
              <View style={styles.stageNumber}>
                <Text style={styles.stageNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.stageInfo}>
                <Text style={styles.stageName}>{stage.stage_name}</Text>
                <Text style={styles.stageDescription}>{stage.description}</Text>
                <Text style={styles.stageDuration}>Thời gian: {stage.duration} ngày</Text>
              </View>
              {stage.completed && <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />}
            </View>
          </View>
        ))}
      </View>
    )
  }

  const renderProgress = () => {
    if (!progress || progress.length === 0) return null

    return (
      <View style={styles.progressSection}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="trending-up" size={20} color={COLORS.primary} /> Tiến độ gần đây
        </Text>

        {progress.slice(0, 3).map((item) => (
          <View key={item._id} style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressDate}>{new Date(item.date).toLocaleDateString("vi-VN")}</Text>
              <Text style={styles.cigarettesCount}>{item.cigarettesSmoked} điếu</Text>
            </View>
            <Text style={styles.healthStatus}>{item.healthStatus}</Text>
            {item.notes && <Text style={styles.progressNotes}>{item.notes}</Text>}
          </View>
        ))}
      </View>
    )
  }

  const renderActionButtons = () => {
    if (isTemplate) {
      // Chỉ hiển thị nút đăng ký cho template plans
      return (
        <TouchableOpacity style={styles.registerButton} onPress={handleRegisterPlan} disabled={registering}>
          <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.registerButtonGradient}>
            {registering ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="add-circle" size={24} color={COLORS.white} />
                <Text style={styles.registerButtonText}>
                  {hasCurrentPlan ? "Thay thế kế hoạch hiện tại" : "Đăng ký kế hoạch này"}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      )
    }

    // Hiển thị thông tin trạng thái cho các kế hoạch không phải template
    return (
      <View style={styles.statusInfo}>
        <Ionicons name={statusConfig.icon} size={24} color={statusConfig.color} />
        <View style={styles.statusInfoContent}>
          <Text style={[styles.statusInfoTitle, { color: statusConfig.color }]}>Trạng thái: {statusConfig.label}</Text>
          {plan.status === "ongoing" && (
            <Text style={styles.statusInfoDescription}>
              Kế hoạch này đang được thực hiện. Bạn có thể theo dõi tiến độ trong phần "Kế hoạch hiện tại".
            </Text>
          )}
          {plan.status === "completed" && (
            <Text style={styles.statusInfoDescription}>Kế hoạch này đã hoàn thành thành công! 🎉</Text>
          )}
          {plan.status === "failed" && (
            <Text style={styles.statusInfoDescription}>
              Kế hoạch này đã kết thúc. Bạn có thể chọn kế hoạch mẫu khác để bắt đầu lại.
            </Text>
          )}
        </View>
      </View>
    )
  }

  useEffect(() => {
    if (plan) {
      const config = STATUS_CONFIG[plan.status] || STATUS_CONFIG.template
      setStatusConfig(config)
      setIsTemplate(plan.status === "template")
      console.log("Plan status:", plan.status)
      console.log("Is template:", plan.status === "template")
      console.log("Plan data:", plan)
    }
  }, [plan])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải chi tiết kế hoạch...</Text>
      </View>
    )
  }

  if (!plan) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>Không tìm thấy kế hoạch</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadPlanDetail}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={statusConfig.gradient} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết kế hoạch</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Plan Image */}
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri: plan.image || "https://via.placeholder.com/400x200?text=Kế+hoạch+bỏ+thuốc",
              }}
              style={styles.planImage}
              resizeMode="cover"
            />

            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
              <Ionicons name={statusConfig.icon} size={16} color={COLORS.white} />
              <Text style={styles.statusText}>{statusConfig.label}</Text>
            </View>
          </View>

          {/* Plan Info */}
          <View style={styles.infoSection}>
            <Text style={styles.planTitle}>{plan.title || "Kế hoạch bỏ thuốc"}</Text>
            <Text style={styles.planReason}>{plan.reason || "Không có mô tả"}</Text>

            {/* Template Info for templates */}
            {isTemplate && (
              <View style={styles.templateInfo}>
                <View style={styles.templateInfoCard}>
                  <Ionicons name="information-circle" size={24} color={COLORS.info} />
                  <View style={styles.templateInfoText}>
                    <Text style={styles.templateInfoTitle}>Kế hoạch mẫu</Text>
                    <Text style={styles.templateInfoDescription}>
                      Khi đăng ký, hệ thống sẽ tự động thiết lập ngày bắt đầu (hôm nay) và các giai đoạn dựa trên thời
                      gian của template.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Coach Info */}
            {plan.coachId && (
              <View style={styles.coachSection}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="person" size={20} color={COLORS.primary} /> Huấn luyện viên
                </Text>
                <View style={styles.coachCard}>
                  <View style={styles.coachAvatar}>
                    <Ionicons name="school" size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.coachInfo}>
                    <Text style={styles.coachName}>{plan.coachId.userName}</Text>
                    <Text style={styles.coachEmail}>{plan.coachId.email}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Plan Details */}
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="information-circle" size={20} color={COLORS.primary} /> Thông tin chi tiết
              </Text>

              <View style={styles.detailCard}>
                <View style={styles.detailItem}>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Thời gian thực hiện</Text>
                    <Text style={styles.detailValue}>{plan.duration || 0} ngày</Text>
                  </View>
                </View>

                {plan.startDate && (
                  <View style={styles.detailItem}>
                    <Ionicons name="play-outline" size={20} color={COLORS.success} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Ngày bắt đầu</Text>
                      <Text style={styles.detailValue}>{new Date(plan.startDate).toLocaleDateString("vi-VN")}</Text>
                    </View>
                  </View>
                )}

                {plan.endDate && (
                  <View style={styles.detailItem}>
                    <Ionicons name="flag-outline" size={20} color={COLORS.error} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Ngày kết thúc</Text>
                      <Text style={styles.detailValue}>{new Date(plan.endDate).toLocaleDateString("vi-VN")}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Stages */}
            {renderStages()}

            {/* Progress */}
            {renderProgress()}

            {/* Action Buttons */}
            <View style={styles.actionSection}>{renderActionButtons()}</View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.error,
    fontWeight: "500",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: "500",
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
    flex: 1,
  },
  imageContainer: {
    position: "relative",
    height: 250,
  },
  planImage: {
    width: "100%",
    height: "100%",
  },
  statusBadge: {
    position: "absolute",
    top: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: "600",
    marginLeft: 6,
  },
  infoSection: {
    padding: 20,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 12,
  },
  planReason: {
    fontSize: 16,
    color: COLORS.lightText,
    lineHeight: 24,
    marginBottom: 24,
  },
  templateInfo: {
    marginBottom: 24,
  },
  templateInfoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.info + "10",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
  },
  templateInfoText: {
    flex: 1,
    marginLeft: 12,
  },
  templateInfoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.info,
    marginBottom: 4,
  },
  templateInfoDescription: {
    fontSize: 14,
    color: COLORS.lightText,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.secondary,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  coachSection: {
    marginBottom: 24,
  },
  coachCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  coachAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.lightBackground,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  coachEmail: {
    fontSize: 14,
    color: COLORS.lightText,
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBackground,
  },
  detailContent: {
    flex: 1,
    marginLeft: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.lightText,
    marginBottom: 4,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "600",
  },
  stagesSection: {
    marginBottom: 24,
  },
  stageCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stageNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stageNumberText: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.white,
  },
  stageInfo: {
    flex: 1,
  },
  stageName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  stageDescription: {
    fontSize: 14,
    color: COLORS.lightText,
    marginBottom: 8,
  },
  stageDuration: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "500",
  },
  progressSection: {
    marginBottom: 24,
  },
  progressCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressDate: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  cigarettesCount: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.error,
  },
  healthStatus: {
    fontSize: 14,
    color: COLORS.success,
    marginBottom: 4,
  },
  progressNotes: {
    fontSize: 12,
    color: COLORS.lightText,
    fontStyle: "italic",
  },
  actionSection: {
    marginBottom: 40,
  },
  registerButton: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  registerButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  registerButtonText: {
    fontSize: 18,
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 12,
  },
  statusInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  statusInfoTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  statusInfoDescription: {
    fontSize: 14,
    color: COLORS.lightText,
    lineHeight: 20,
  },
})
