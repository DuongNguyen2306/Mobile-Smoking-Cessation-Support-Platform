import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { PieChart } from "react-native-chart-kit";
import {
  cancelQuitPlan,
  createQuitProgress,
  getCurrentQuitPlan,
  getQuitPlanStages,
  getQuitProgressByStage,
} from "../services/api";

const { width } = Dimensions.get("window");

const COLORS = {
  primary: "#4CAF50",
  secondary: "#2E7D32",
  accent: "#66BB6A",
  success: "#4CAF50",
  warning: "#FF9800",
  error: "#FF5722",
  info: "#2196F3",
  text: "#2C3E50",
  lightText: "#7F8C8D",
  background: "#F8FFF8",
  lightBackground: "#E8F5E8",
  white: "#FFFFFF",
  overlay: "rgba(0,0,0,0.4)",
  shadow: "rgba(0,0,0,0.1)",
  cardShadow: "rgba(76, 175, 80, 0.15)",
};

export default function CurrentPlanScreen() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState(null);
  const [stages, setStages] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const [submittingProgress, setSubmittingProgress] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [managingPlan, setManagingPlan] = useState(false);
  const [stageProgress, setStageProgress] = useState(null);

  // Progress form state
  const [cigarettesSmoked, setCigarettesSmoked] = useState("");
  const [healthStatus, setHealthStatus] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    console.log("Current plan state:", currentPlan);
    loadCurrentPlan();
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused, reloading plan...");
      loadCurrentPlan();
    }, [])
  );

  const loadCurrentPlan = useCallback(async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      console.log("Loading current quit plan...");
      const planResponse = await getCurrentQuitPlan();
      console.log("API response for getCurrentQuitPlan:", planResponse.status, planResponse.data);

      if (planResponse.status === 200 && planResponse.data) {
        const responseData = planResponse.data.data || planResponse.data;
        const plan = responseData.plan;
        const stages = responseData.stages || [];
        const progress = responseData.progress || [];

        if (plan && plan._id) {
          setCurrentPlan(plan);
          setStages(stages);
          setProgress(progress);
          console.log(
            "Plan loaded:",
            plan.title,
            "Stages:",
            stages.length,
            "Progress:",
            progress.length
          );
          if (stages.length > 0) {
            await fetchStages(plan._id);
          }
        } else {
          setCurrentPlan(null);
          setStages([]);
          setProgress([]);
          console.log("No current plan found - Plan or _id missing");
        }
      } else if (planResponse.status === 404) {
        setCurrentPlan(null);
        setStages([]);
        setProgress([]);
        console.log("No current plan found (404)");
      } else {
        throw new Error("Unexpected API response");
      }
    } catch (error) {
      console.error("Error loading current plan:", error.response?.status, error.message);
      if (error.response?.status === 404) {
        setCurrentPlan(null);
        setStages([]);
        setProgress([]);
      } else {
        Alert.alert("Lỗi", "Không thể tải kế hoạch hiện tại. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchStages = async (quitPlanId) => {
    try {
      const response = await getQuitPlanStages(quitPlanId);
      console.log("API response for getQuitPlanStages:", response.data);
      if (response.data && response.data.stages) {
        setStages(response.data.stages);
        if (response.data.stages.length > 0) {
          await fetchStageProgress(response.data.stages[0]._id);
        }
      }
    } catch (error) {
      console.error("Error fetching stages:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách giai đoạn.");
    }
  };

  const fetchStageProgress = async (stageId) => {
    try {
      const response = await getQuitProgressByStage(stageId);
      console.log("API response for getQuitProgressByStage:", response.data);
      if (response.data) {
        setStageProgress(response.data);
      }
    } catch (error) {
      console.error("Error fetching stage progress:", error);
      Alert.alert("Lỗi", "Không thể tải tiến độ giai đoạn.");
    }
  };

  const onRefresh = useCallback(() => {
    loadCurrentPlan();
  }, []);

  const getStageProgress = (stage) => {
    const stageProgressData = progress.filter((p) => p.stageId === stage._id);
    const totalDays = stage.duration || 0;
    const completedDays = stageProgressData.length;
    return {
      completed: completedDays,
      total: totalDays,
      percentage: totalDays > 0 ? (completedDays / totalDays) * 100 : 0,
    };
  };

  // Check if the previous stage is completed
  const canRecordProgress = (stage, index) => {
    if (index === 0) return true; // First stage can always be recorded
    const previousStage = stages[index - 1];
    const previousProgress = getStageProgress(previousStage);
    return previousProgress.percentage >= 100; // Previous stage must be 100% complete
  };

  const handleAddProgress = (stage, index) => {
    if (!canRecordProgress(stage, index)) {
      Alert.alert(
        "Không thể ghi nhận",
        "Vui lòng hoàn thành giai đoạn trước để ghi nhận tiến độ cho giai đoạn này."
      );
      return;
    }
    setSelectedStage(stage);
    setCigarettesSmoked("");
    setHealthStatus("");
    setNotes("");
    setStageProgress(null);
    setShowProgressModal(true);
  };

  const submitProgress = async () => {
    if (!selectedStage || !cigarettesSmoked.trim() || !healthStatus.trim()) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin (số điếu thuốc và tình trạng sức khỏe).");
      return;
    }

    try {
      setSubmittingProgress(true);
      const progressData = {
        stageId: selectedStage._id,
        date: new Date().toISOString(),
        cigarettesSmoked: Number.parseInt(cigarettesSmoked) || 0,
        healthStatus: healthStatus.trim(),
        notes: notes.trim() || undefined,
      };

      console.log("Submitting progress:", progressData);
      const response = await createQuitProgress(progressData);

      if (response.status === 200 || response.status === 201) {
        Alert.alert("🎉 Thành công!", "Đã ghi nhận tiến độ hôm nay");
        setShowProgressModal(false);
        await fetchStageProgress(selectedStage._id);
        loadCurrentPlan();
      }
    } catch (error) {
      console.error("Error submitting progress:", error);
      let errorMessage = "Không thể ghi nhận tiến độ. Vui lòng thử lại.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = "Bạn đã ghi nhận tiến độ cho giai đoạn này hôm nay rồi.";
      }
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setSubmittingProgress(false);
    }
  };

  const getTodayProgress = (stageId) => {
    const today = new Date().toDateString();
    return progress.find((p) => p.stageId === stageId && new Date(p.date).toDateString() === today);
  };

  const handleCancelPlan = () => {
    console.log("Opening cancel modal");
    setShowCancelModal(true);
  };

  const submitCancelPlan = async () => {
    if (!currentPlan) {
      Alert.alert("Lỗi", "Không có kế hoạch nào để hủy");
      return;
    }

    try {
      setManagingPlan(true);
      console.log("🚫 Cancelling current plan with reason:", cancelReason);
      const response = await cancelQuitPlan(currentPlan._id, cancelReason.trim() || undefined);
      console.log("Cancel response:", response.status, response.data);

      if (response.status === 200 || response.status === 204) {
        Alert.alert("Đã hủy kế hoạch", "Bạn đã rời khỏi kế hoạch hiện tại. Bạn có thể chọn kế hoạch mới.", [
          {
            text: "Chọn kế hoạch mới",
            onPress: () => {
              setShowCancelModal(false);
              router.push("/plans");
            },
          },
          {
            text: "OK",
            onPress: () => {
              setShowCancelModal(false);
              setCurrentPlan(null);
              setStages([]);
              setProgress([]);
              loadCurrentPlan();
            },
          },
        ]);
      } else {
        throw new Error("Phản hồi không thành công: " + response.status);
      }
    } catch (error) {
      console.error("Error cancelling plan:", error);
      let errorMessage = "Không thể hủy kế hoạch";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status) {
        errorMessage += ` (Mã lỗi: ${error.response.status})`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setManagingPlan(false);
    }
  };

  const renderCancelModal = () => (
    <Modal
      visible={showCancelModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowCancelModal(false)}
    >
      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowCancelModal(false); }}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="warning" size={24} color={COLORS.error} />
                </View>
                <Text style={styles.modalTitle}>Hủy kế hoạch</Text>
                <Text style={styles.modalSubtitle}>
                  Bạn có chắc chắn muốn hủy kế hoạch hiện tại không?
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Lý do hủy (tuỳ chọn):</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={cancelReason}
                  onChangeText={setCancelReason}
                  placeholder="Nhập lý do hủy kế hoạch..."
                  multiline={true}
                  placeholderTextColor={COLORS.lightText}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => { Keyboard.dismiss(); setShowCancelModal(false); }}
                >
                  <Text style={styles.cancelButtonText}>Quay lại</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={submitCancelPlan}
                  disabled={managingPlan}
                >
                  <LinearGradient
                    colors={[COLORS.error, "#E53E3E"]}
                    style={styles.confirmButtonGradient}
                  >
                    {managingPlan ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <>
                        <Ionicons name="trash" size={18} color={COLORS.white} />
                        <Text style={styles.confirmButtonText}>Xác nhận hủy</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderProgressModal = () => (
    <Modal
      visible={showProgressModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => { Keyboard.dismiss(); setShowProgressModal(false); }}
    >
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.progressModalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="analytics" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.modalTitle}>Ghi nhận tiến độ</Text>
                {selectedStage && (
                  <Text style={styles.modalSubtitle}>{selectedStage.stage_name}</Text>
                )}
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedStage && (
                  <View style={styles.stageInfoCard}>
                    <Text style={styles.stageInfoTitle}>Giai đoạn hiện tại</Text>
                    <Text style={styles.stageInfoDesc}>{selectedStage.description}</Text>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    <Ionicons name="remove-circle" size={16} color={COLORS.error} />
                    Số điếu thuốc đã hút hôm nay
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={cigarettesSmoked}
                    onChangeText={setCigarettesSmoked}
                    placeholder="Nhập số điếu..."
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.lightText}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    <Ionicons name="heart" size={16} color={COLORS.info} />
                    Tình trạng sức khỏe
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={healthStatus}
                    onChangeText={setHealthStatus}
                    placeholder="Mô tả cảm giác và tình trạng sức khỏe của bạn..."
                    multiline={true}
                    placeholderTextColor={COLORS.lightText}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    <Ionicons name="document-text" size={16} color={COLORS.accent} />
                    Ghi chú thêm (tuỳ chọn)
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Thêm ghi chú về cảm xúc, khó khăn gặp phải..."
                    multiline={true}
                    placeholderTextColor={COLORS.lightText}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </View>

                {stageProgress && (
                  <View style={styles.progressSummary}>
                    <Text style={styles.progressSummaryTitle}>Tổng quan tiến độ</Text>
                    <Text>Phần trăm hoàn thành: {stageProgress.statistics?.completionPercentage || 0}%</Text>
                    <Text>Số ngày kiểm tra: {stageProgress.statistics?.checkInCount || 0}</Text>
                    <PieChart
                      data={[
                        { name: "Hoàn thành", population: stageProgress.statistics?.completionPercentage || 0, color: COLORS.success },
                        { name: "Còn lại", population: 100 - (stageProgress.statistics?.completionPercentage || 0), color: COLORS.warning },
                      ]}
                      width={width - 80}
                      height={200}
                      chartConfig={{
                        backgroundColor: COLORS.white,
                        backgroundGradientFrom: COLORS.lightBackground,
                        backgroundGradientTo: COLORS.white,
                        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        strokeWidth: 2,
                      }}
                      accessor="population"
                      backgroundColor="transparent"
                      paddingLeft="15"
                      center={[10, 0]}
                      absolute
                    />
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => { Keyboard.dismiss(); setShowProgressModal(false); }}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={submitProgress}
                  disabled={submittingProgress}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.accent]}
                    style={styles.submitButtonGradient}
                  >
                    {submittingProgress ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={18} color={COLORS.white} />
                        <Text style={styles.submitButtonText}>Ghi nhận</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent]}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={styles.loadingText}>Đang tải kế hoạch hiện tại...</Text>
        </LinearGradient>
      </View>
    );
  }

  if (!currentPlan) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={[COLORS.secondary, COLORS.primary]} style={styles.headerGradient}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Kế hoạch hiện tại</Text>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>

        <View style={styles.emptyContainer}>
          <LinearGradient
            colors={[COLORS.lightBackground, COLORS.white]}
            style={styles.emptyCard}
          >
            <View style={styles.emptyIconContainer}>
              <Ionicons name="clipboard-outline" size={64} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có kế hoạch nào</Text>
            <Text style={styles.emptySubtitle}>
              Hãy chọn một kế hoạch bỏ thuốc phù hợp để bắt đầu hành trình của bạn!
            </Text>
            <TouchableOpacity
              style={styles.browsePlansButton}
              onPress={() => router.push("/plans")}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.accent]}
                style={styles.browsePlansGradient}
              >
                <Ionicons name="search" size={20} color={COLORS.white} />
                <Text style={styles.browsePlansButtonText}>Khám phá kế hoạch</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.secondary, COLORS.primary]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kế hoạch hiện tại</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.planOverview}>
          <View style={styles.planImageContainer}>
            <Image
              source={{ uri: currentPlan.image }}
              style={styles.planImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.3)"]}
              style={styles.imageOverlay}
            />
          </View>

          <View style={styles.planInfo}>
            <Text style={styles.planTitle}>{currentPlan.title}</Text>
            <Text style={styles.planReason}>{currentPlan.reason}</Text>

            <View style={styles.planStatsContainer}>
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="calendar" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>Ngày bắt đầu</Text>
                  <Text style={styles.statValue}>
                    {new Date(currentPlan.startDate).toLocaleDateString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="time" size={20} color={COLORS.accent} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>Thời gian</Text>
                  <Text style={styles.statValue}>{currentPlan.duration} ngày</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.cancelPlanButton}
            onPress={handleCancelPlan}
            disabled={managingPlan}
          >
            <LinearGradient
              colors={[COLORS.error, "#E53E3E"]}
              style={styles.cancelPlanGradient}
            >
              {managingPlan ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="exit" size={20} color={COLORS.white} />
                  <Text style={styles.cancelPlanText}>Hủy kế hoạch</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.stagesSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="list" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.sectionTitle}>Tiến độ các giai đoạn</Text>
          </View>

          {stages.map((stage, index) => {
            const stageProgressData = getStageProgress(stage);
            const todayProgress = getTodayProgress(stage._id);
            const isCompleted = stage.completed || stageProgressData.percentage >= 100;
            const canRecord = canRecordProgress(stage, index);

            return (
              <View key={stage._id} style={styles.stageCard}>
                <View style={styles.stageHeader}>
                  <View
                    style={[
                      styles.stageNumber,
                      isCompleted && styles.stageNumberCompleted,
                    ]}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={18} color={COLORS.white} />
                    ) : (
                      <Text style={styles.stageNumberText}>{index + 1}</Text>
                    )}
                  </View>

                  <View style={styles.stageContent}>
                    <Text style={styles.stageName}>{stage.stage_name}</Text>
                    <Text style={styles.stageDescription}>{stage.description}</Text>

                    <View style={styles.progressContainer}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Tiến độ</Text>
                        <Text style={styles.progressText}>
                          {stageProgressData.completed}/{stageProgressData.total} ngày
                        </Text>
                      </View>
                      <View style={styles.progressBar}>
                        <LinearGradient
                          colors={[COLORS.primary, COLORS.accent]}
                          style={[
                            styles.progressFill,
                            { width: `${Math.min(stageProgressData.percentage, 100)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressPercentage}>
                        {Math.round(stageProgressData.percentage)}%
                      </Text>
                    </View>

                    {todayProgress ? (
                      <View style={styles.todayProgress}>
                        <View style={styles.todayProgressIcon}>
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={COLORS.success}
                          />
                        </View>
                        <View style={styles.todayProgressContent}>
                          <Text style={styles.todayProgressTitle}>
                            Đã ghi nhận hôm nay
                          </Text>
                          <Text style={styles.todayProgressText}>
                            {todayProgress.cigarettesSmoked} điếu •{" "}
                            {todayProgress.healthStatus}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      !isCompleted && (
                        <TouchableOpacity
                          style={[styles.addProgressButton, !canRecord && { opacity: 0.5 }]}
                          onPress={() => handleAddProgress(stage, index)}
                          disabled={!canRecord}
                        >
                          <LinearGradient
                            colors={[COLORS.primary + "15", COLORS.accent + "15"]}
                            style={styles.addProgressGradient}
                          >
                            <Ionicons
                              name="add-circle"
                              size={20}
                              color={COLORS.primary}
                            />
                            <Text style={styles.addProgressText}>
                              Ghi nhận tiến độ hôm nay
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {renderCancelModal()}
      {renderProgressModal()}
    </SafeAreaView>
  );
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
  loadingGradient: {
    padding: 40,
    borderRadius: 20,
    alignItems: "center",
    margin: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.white,
    fontWeight: "600",
  },
  headerGradient: {
    paddingTop: 10,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.white,
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyCard: {
    padding: 40,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    width: "100%",
    maxWidth: 350,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.lightBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.lightText,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  browsePlansButton: {
    borderRadius: 16,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  browsePlansGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  browsePlansButtonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
  },
  planOverview: {
    margin: 20,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  planImageContainer: {
    position: "relative",
  },
  planImage: {
    width: "100%",
    height: 220,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  planInfo: {
    padding: 24,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 8,
  },
  planReason: {
    fontSize: 16,
    color: COLORS.lightText,
    lineHeight: 24,
    marginBottom: 24,
  },
  planStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.lightBackground,
    padding: 16,
    borderRadius: 12,
    flex: 0.48,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.lightText,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  actionSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  cancelPlanButton: {
    borderRadius: 16,
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cancelPlanGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  cancelPlanText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
  },
  stagesSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.lightBackground,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
  },
  stageCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  stageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stageNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  stageNumberCompleted: {
    backgroundColor: COLORS.success,
  },
  stageNumberText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.white,
  },
  stageContent: {
    flex: 1,
  },
  stageName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  stageDescription: {
    fontSize: 14,
    color: COLORS.lightText,
    lineHeight: 20,
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.lightText,
    fontWeight: "500",
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.lightBackground,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
    textAlign: "right",
  },
  todayProgress: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.success + "15",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  todayProgressIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  todayProgressContent: {
    flex: 1,
  },
  todayProgressTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.success,
    marginBottom: 4,
  },
  todayProgressText: {
    fontSize: 13,
    color: COLORS.success,
    opacity: 0.8,
  },
  addProgressButton: {
    borderRadius: 12,
  },
  addProgressGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + "30",
  },
  addProgressText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 8,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  progressModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.lightBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.lightText,
    textAlign: "center",
    lineHeight: 20,
  },
  stageInfoCard: {
    backgroundColor: COLORS.lightBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  stageInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 8,
  },
  stageInfoDesc: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
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
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  cancelButton: {
    flex: 0.45,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: COLORS.lightBackground,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: COLORS.lightText,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 0.45,
    borderRadius: 12,
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  confirmButtonText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
  },
  submitButton: {
    flex: 0.45,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  submitButtonText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
  },
  progressSummary: {
    marginTop: 20,
    padding: 16,
    backgroundColor: COLORS.lightBackground,
    borderRadius: 12,
  },
  progressSummaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 8,
  },
});