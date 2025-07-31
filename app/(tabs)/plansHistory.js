"use client"

import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { LinearGradient } from "expo-linear-gradient"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { PieChart } from "react-native-chart-kit"
import { getQuitPlanHistory } from "../services/api"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

const PlanHistoryScreen = () => {
  const [planHistory, setPlanHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem("token")
        if (!token) {
          setError("Chưa đăng nhập, vui lòng đăng nhập trước.")
          setLoading(false)
          return
        }
        const response = await getQuitPlanHistory()
        console.log("Phản hồi từ API:", response.data)
        if (response.data && response.data.data && response.data.data.planHistory) {
          setPlanHistory(response.data.data.planHistory)
        } else {
          setPlanHistory([])
          console.log("Không tìm thấy planHistory trong phản hồi:", response.data)
        }
      } catch (error) {
        console.log("Lỗi khi tải lịch sử kế hoạch:", error)
        setError(error.message || "Đã xảy ra lỗi")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const chartConfig = {
    backgroundGradientFrom: "#FFFFFF",
    backgroundGradientTo: "#F8F9FA",
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    strokeWidth: 3,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />
        <LinearGradient colors={["#1B5E20", "#2E7D32", "#4CAF50"]} style={styles.loadingGradient}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Đang tải lịch sử kế hoạch...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />
        <LinearGradient colors={["#FFCDD2", "#FFEBEE"]} style={styles.errorGradient}>
          <View style={styles.errorContent}>
            <Ionicons name="warning-outline" size={80} color="#F44336" />
            <Text style={styles.errorTitle}>Đã có lỗi xảy ra</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => window.location.reload()}>
              <LinearGradient colors={["#4CAF50", "#66BB6A"]} style={styles.retryGradient}>
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Thử lại</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />

      {/* Header */}
      <LinearGradient colors={["#1B5E20", "#2E7D32", "#4CAF50"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="time-outline" size={28} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Lịch Sử Kế Hoạch</Text>
          <Text style={styles.headerSubtitle}>Theo dõi tiến trình của bạn</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {planHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient colors={["#FFFFFF", "#F8F9FA"]} style={styles.emptyGradient}>
              <Ionicons name="document-outline" size={80} color="#BDBDBD" />
              <Text style={styles.emptyTitle}>Chưa có lịch sử</Text>
              <Text style={styles.emptyText}>Không có kế hoạch nào để hiển thị.</Text>
              <TouchableOpacity style={styles.emptyButton}>
                <LinearGradient colors={["#4CAF50", "#66BB6A"]} style={styles.emptyButtonGradient}>
                  <Ionicons name="add-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.emptyButtonText}>Tạo kế hoạch mới</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : (
          planHistory.map((planItem, index) => {
            const { plan, completedStages, totalStages, completionPercentage, badgeCount } = planItem
            const chartData = [
              {
                name: "Hoàn thành",
                population: completionPercentage,
                color: "#4CAF50",
                legendFontColor: "#333",
                legendFontSize: 14,
              },
              {
                name: "Còn lại",
                population: 100 - completionPercentage,
                color: "#E0E0E0",
                legendFontColor: "#666",
                legendFontSize: 14,
              },
            ]

            return (
              <View key={index} style={styles.planCard}>
                <LinearGradient colors={["#FFFFFF", "#F8F9FA"]} style={styles.planGradient} start={[0, 0]} end={[1, 1]}>
                  {/* Status Badge */}
                  <View style={styles.statusBadge}>
                    <LinearGradient
                      colors={plan.status === "ongoing" ? ["#4CAF50", "#66BB6A"] : ["#F44336", "#E57373"]}
                      style={styles.statusBadgeGradient}
                    >
                      <Ionicons
                        name={plan.status === "ongoing" ? "play-circle" : "stop-circle"}
                        size={16}
                        color="#FFFFFF"
                      />
                      <Text style={styles.statusBadgeText}>
                        {plan.status === "ongoing" ? "Đang thực hiện" : "Đã hủy"}
                      </Text>
                    </LinearGradient>
                  </View>

                  {/* Plan Image */}
                  <View style={styles.planImageContainer}>
                    <Image source={{ uri: plan.image }} style={styles.planImage} />
                    <LinearGradient colors={["transparent", "rgba(0,0,0,0.3)"]} style={styles.imageOverlay} />
                  </View>

                  {/* Plan Info */}
                  <View style={styles.planInfo}>
                    <Text style={styles.planTitle}>{plan.title}</Text>

                    <View style={styles.planDetails}>
                      <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={16} color="#666" />
                        <Text style={styles.detailLabel}>Ngày bắt đầu:</Text>
                        <Text style={styles.detailValue}>{new Date(plan.startDate).toLocaleDateString("vi-VN")}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={16} color="#666" />
                        <Text style={styles.detailLabel}>Ngày kết thúc:</Text>
                        <Text style={styles.detailValue}>{new Date(plan.endDate).toLocaleDateString("vi-VN")}</Text>
                      </View>

                      {plan.cancelReason && (
                        <View style={styles.detailRow}>
                          <Ionicons name="information-circle-outline" size={16} color="#F44336" />
                          <Text style={styles.detailLabel}>Lý do hủy:</Text>
                          <Text style={[styles.detailValue, { color: "#F44336" }]}>{plan.cancelReason}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Progress Stats */}
                  <View style={styles.progressStats}>
                    <View style={styles.statItem}>
                      <View style={styles.statIconContainer}>
                        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                      </View>
                      <Text style={styles.statNumber}>{completedStages}</Text>
                      <Text style={styles.statLabel}>Hoàn thành</Text>
                    </View>

                    <View style={styles.statItem}>
                      <View style={styles.statIconContainer}>
                        <Ionicons name="list-outline" size={24} color="#2196F3" />
                      </View>
                      <Text style={styles.statNumber}>{totalStages}</Text>
                      <Text style={styles.statLabel}>Tổng giai đoạn</Text>
                    </View>

                    <View style={styles.statItem}>
                      <View style={styles.statIconContainer}>
                        <Ionicons name="trophy" size={24} color="#FF9800" />
                      </View>
                      <Text style={styles.statNumber}>{badgeCount}</Text>
                      <Text style={styles.statLabel}>Huy hiệu</Text>
                    </View>
                  </View>

                  {/* Progress Chart */}
                  <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Tiến độ hoàn thành</Text>
                    <View style={styles.chartWrapper}>
                      <PieChart
                        data={chartData}
                        width={SCREEN_WIDTH - 80}
                        height={200}
                        chartConfig={chartConfig}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        center={[10, 0]}
                        absolute
                        hasLegend={true}
                      />
                    </View>
                  </View>
                </LinearGradient>
              </View>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
  },
  errorGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorContent: {
    alignItems: "center",
    maxWidth: 300,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  retryButton: {
    borderRadius: 25,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 12,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    borderRadius: 20,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  emptyButton: {
    borderRadius: 25,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  planCard: {
    marginBottom: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  planGradient: {
    borderRadius: 20,
    padding: 24,
    position: "relative",
  },
  statusBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  statusBadgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  planImageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  planImage: {
    width: "100%",
    height: 160,
    resizeMode: "cover",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  planInfo: {
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 16,
  },
  planDetails: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    paddingVertical: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  chartContainer: {
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2E7D32",
    marginBottom: 16,
  },
  chartWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
})

export default PlanHistoryScreen
