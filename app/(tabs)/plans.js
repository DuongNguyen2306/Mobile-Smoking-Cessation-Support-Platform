"use client"

import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { getQuitPlans } from "../services/api"

const { width } = Dimensions.get("window")

// Color constants
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
  placeholder: "#999",
  background: "#F8FFF8",
  lightBackground: "#F1F8E9",
  white: "#FFFFFF",
  overlay: "rgba(0,0,0,0.3)",
}

// Status configuration
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

export default function QuitPlansScreen() {
  const router = useRouter()
  const [allPlans, setAllPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")

  // Filter plans locally for instant search
  const filteredPlans = useMemo(() => {
    let filtered = allPlans

    if (selectedStatus !== "all") {
      filtered = filtered.filter((plan) => plan.status === selectedStatus)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        (plan) =>
          plan.title?.toLowerCase().includes(query) ||
          plan.reason?.toLowerCase().includes(query) ||
          plan.coachId?.userName?.toLowerCase().includes(query),
      )
    }

    return filtered
  }, [allPlans, searchQuery, selectedStatus])

  useEffect(() => {
    loadQuitPlans()
  }, [])

  const loadQuitPlans = useCallback(async () => {
    try {
      setLoading(true)
      console.log("Loading quit plans...")
      const response = await getQuitPlans({ limit: 50 })

      if (response.status === 200 && response.data) {
        const plans = Array.isArray(response.data.data) ? response.data.data : response.data
        console.log("Loaded plans:", plans.length)
        setAllPlans(plans)
      }
    } catch (error) {
      console.error("Error loading quit plans:", error)
      Alert.alert("Lỗi", "Không thể tải danh sách kế hoạch")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadQuitPlans()
  }, [loadQuitPlans])

  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
  }, [])

  const handleStatusFilter = useCallback((status) => {
    setSelectedStatus(status)
  }, [])

  const handlePlanPress = (plan) => {
    router.push(`/plans/${plan._id}`)
  }

  const renderPlanCard = ({ item: plan }) => {
    const statusConfig = STATUS_CONFIG[plan.status] || STATUS_CONFIG.template

    return (
      <TouchableOpacity style={styles.planCard} onPress={() => handlePlanPress(plan)} activeOpacity={0.8}>
        <LinearGradient colors={[COLORS.white, COLORS.lightBackground]} style={styles.planCardGradient}>
          {/* Plan Image */}
          <View style={styles.planImageContainer}>
            <Image
              source={{
                uri: plan.image || "https://via.placeholder.com/300x150?text=Kế+hoạch+bỏ+thuốc",
              }}
              style={styles.planImage}
              resizeMode="cover"
            />

            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
              <Ionicons name={statusConfig.icon} size={12} color={COLORS.white} />
              <Text style={styles.statusText}>{statusConfig.label}</Text>
            </View>
          </View>

          {/* Plan Content */}
          <View style={styles.planContent}>
            <Text style={styles.planTitle} numberOfLines={2}>
              {plan.title || "Kế hoạch bỏ thuốc"}
            </Text>

            <Text style={styles.planReason} numberOfLines={2}>
              {plan.reason || "Không có mô tả"}
            </Text>

            {/* Coach Info */}
            {plan.coachId && (
              <View style={styles.coachInfo}>
                <Ionicons name="person" size={14} color={COLORS.primary} />
                <Text style={styles.coachName}>HLV: {plan.coachId.userName}</Text>
              </View>
            )}

            {/* Plan Stats */}
            <View style={styles.planStats}>
              <View style={styles.statItem}>
                <Ionicons name="calendar" size={14} color={COLORS.lightText} />
                <Text style={styles.statText}>{plan.duration || 0} ngày</Text>
              </View>

              <View style={styles.statItem}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.lightText} />
                <Text style={styles.statText}>
                  {plan.startDate ? new Date(plan.startDate).toLocaleDateString("vi-VN") : "Chưa bắt đầu"}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  const renderStatusFilter = () => {
    const statuses = [
      { key: "all", label: "Tất cả", icon: "apps" },
      { key: "ongoing", label: "Đang thực hiện", icon: "play-circle" },
      { key: "completed", label: "Hoàn thành", icon: "checkmark-circle" },
      { key: "failed", label: "Thất bại", icon: "close-circle" },
      { key: "template", label: "Mẫu", icon: "document-text" },
    ]

    return (
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statuses}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterButton, selectedStatus === item.key && styles.filterButtonActive]}
              onPress={() => handleStatusFilter(item.key)}
            >
              <Ionicons
                name={item.icon}
                size={16}
                color={selectedStatus === item.key ? COLORS.white : COLORS.primary}
              />
              <Text style={[styles.filterButtonText, selectedStatus === item.key && styles.filterButtonTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Đang tải kế hoạch...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[COLORS.secondary, COLORS.primary]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kế hoạch bỏ thuốc</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => router.push("/custom-request")}>
            <Ionicons name="add" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={COLORS.placeholder} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm kế hoạch..."
              placeholderTextColor={COLORS.placeholder}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <Ionicons name="close-circle" size={20} color={COLORS.placeholder} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Status Filter */}
      {renderStatusFilter()}

      {/* Plans List */}
      <FlatList
        data={filteredPlans}
        keyExtractor={(item) => item._id}
        renderItem={renderPlanCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.placeholder} />
            <Text style={styles.emptyTitle}>Chưa có kế hoạch nào</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? "Không tìm thấy kế hoạch phù hợp" : "Hãy tạo kế hoạch bỏ thuốc đầu tiên của bạn!"}
            </Text>
          </View>
        )}
      />
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
  headerGradient: {
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  filterContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBackground,
  },
  filterList: {
    paddingHorizontal: 20,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.lightBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 6,
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  planCard: {
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  planCardGradient: {
    borderRadius: 16,
    overflow: "hidden",
  },
  planImageContainer: {
    position: "relative",
    height: 150,
  },
  planImage: {
    width: "100%",
    height: "100%",
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: "600",
    marginLeft: 4,
  },
  planContent: {
    padding: 16,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 8,
  },
  planReason: {
    fontSize: 14,
    color: COLORS.lightText,
    lineHeight: 20,
    marginBottom: 12,
  },
  coachInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  coachName: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
    marginLeft: 6,
  },
  planStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: 12,
    color: COLORS.lightText,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.lightText,
    textAlign: "center",
    lineHeight: 20,
  },
})