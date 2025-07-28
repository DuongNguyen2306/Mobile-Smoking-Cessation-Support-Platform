import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { createPaymentUrl, getPackages } from "../services/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function MembershipScreen() {
  const router = useRouter();
  const { userId, userName, email, phone } = useLocalSearchParams();
  const user = { id: userId, userName, email, phone };
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [step, setStep] = useState(1);
  const [currentUserPlan, setCurrentUserPlan] = useState(null); // Store user's current plan

  const loadPackages = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await getPackages({ headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 200 && response.data.success) {
        setPackages(response.data.data.filter((pkg) => pkg.isActive));
        // Assume API returns user's current plan level in response.data.userPlan
        setCurrentUserPlan(response.data.userPlan || null); // Adjust based on actual API response
      } else {
        console.warn("Packages data not successfully loaded:", response.data.message);
        setPackages([]);
      }
    } catch (err) {
      console.error("Error loading packages:", err.response?.status, err.response?.data, err.message);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreatePayment = async (planId, paymentMethod) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("Không có token xác thực");
      const plan = packages.find((p) => p._id === planId);
      if (!plan) throw new Error("Không tìm thấy gói thành viên");
      const response = await createPaymentUrl({
        memberShipPlanId: planId,
        paymentMethod: paymentMethod.toLowerCase(),
        amount: plan.price,
      });
      if (response.status === 200 && response.data.paymentUrl) {
        router.push(response.data.paymentUrl);
      } else {
        Alert.alert("Lỗi", "Không thể tạo liên kết thanh toán");
      }
    } catch (err) {
      console.error("Error creating payment:", err);
      Alert.alert("Lỗi", "Không thể tạo liên kết thanh toán: " + (err.response?.data?.message || err.message));
    }
  };

  const handlePaymentSuccess = async () => {
    router.replace("/profile");
  };

  // Check if a plan can be selected (not free and not lower than current plan)
  const canSelectPlan = (plan) => {
    if (plan.price === 0) return false; // Disable free plan
    if (!currentUserPlan) return true; // No current plan, allow selection
    // Assume packages are sorted by level (higher level = higher tier)
    return plan.level > currentUserPlan.level; // Only allow higher-tier plans
  };

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((stepNumber) => (
        <View key={stepNumber} style={styles.stepContainer}>
          <View style={[styles.stepCircle, step >= stepNumber ? styles.stepCircleActive : styles.stepCircleInactive]}>
            {step > stepNumber ? (
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            ) : (
              <Text style={[styles.stepNumber, step >= stepNumber ? styles.stepNumberActive : styles.stepNumberInactive]}>
                {stepNumber}
              </Text>
            )}
          </View>
          {stepNumber < 3 && (
            <View style={[styles.stepLine, step > stepNumber ? styles.stepLineActive : styles.stepLineInactive]} />
          )}
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.loadingGradient}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Đang tải gói thành viên...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Enhanced Header */}
      <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Đăng ký gói thành viên</Text>
            <Text style={styles.headerSubtitle}>Chọn gói phù hợp với bạn</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        <View style={styles.plansContainer}>
          {packages.map((plan, index) => (
            <View
              key={plan._id}
              style={[styles.planCard, index === 1 && styles.popularPlanCard]}
            >
              <LinearGradient
                colors={index === 1 ? ["#FFF3E0", "#FFE0B2"] : ["#FFFFFF", "#F8F9FA"]}
                style={styles.planGradient}
              >
                {index === 1 && (
                  <View style={styles.popularBadge}>
                    
                  </View>
                )}
                <View style={styles.planHeader}>
                  <View style={styles.planIconContainer}>
                    <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.planIconGradient}>
                      <Ionicons name="trophy" size={28} color="#FFFFFF" />
                    </LinearGradient>
                  </View>
                  <View style={styles.planTitleContainer}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planLevel}>{plan.level}</Text>
                  </View>
                </View>
                <View style={styles.planPriceContainer}>
                  <Text style={styles.planPrice}>
                    {plan.price > 0 ? `${plan.price.toLocaleString()}` : "MIỄN PHÍ"}
                  </Text>
                  {plan.price > 0 && (
                    <Text style={styles.planCurrency}>VNĐ/{plan.duration} ngày</Text>
                  )}
                </View>
                <Text style={styles.planDescription}>{plan.description}</Text>
                <View style={styles.planFeatures}>
                  {plan.features.map((feature, featureIndex) => (
                    <View key={featureIndex} style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (canSelectPlan(plan)) {
                      setSelectedPlan(plan);
                      setShowPaymentModal(true);
                      setStep(1);
                    } else {
                      Alert.alert(
                        "Không thể chọn gói",
                        plan.price === 0
                          ? "Gói miễn phí không thể chọn để thanh toán."
                          : "Bạn không thể chọn gói thấp hơn gói hiện tại."
                      );
                    }
                  }}
                  activeOpacity={0.8}
                  disabled={!canSelectPlan(plan)}
                  style={[styles.selectPlanButton, !canSelectPlan(plan) && { opacity: 0.5 }]}
                >
                  <LinearGradient
                    colors={["#4CAF50", "#2E7D32"]}
                    style={styles.selectPlanGradient}
                  >
                    <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={false}
        visible={showPaymentModal}
        onRequestClose={() => {
          setShowPaymentModal(false);
          setStep(1);
          setPaymentMethod(null);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderRight} />
            <Text style={styles.modalTitle}>Xác nhận thanh toán</Text>
            <TouchableOpacity
              onPress={() => {
                setShowPaymentModal(false);
                setStep(1);
                setPaymentMethod(null);
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          {renderStepIndicator()}
          <ScrollView style={styles.modalContent}>
            <LinearGradient colors={["#F5F7FA", "#E8ECEF"]} style={styles.modalGradient}>
              {!selectedPlan ? (
                <View style={styles.stepCard}>
                  <View style={styles.stepHeader}>
                    <Ionicons name="list" size={24} color="#2E7D32" />
                    <Text style={styles.stepTitle}>Chọn gói thành viên</Text>
                  </View>
                  {packages.map((plan) => (
                    <TouchableOpacity
                      key={plan._id}
                      style={styles.planOption}
                      onPress={() => {
                        if (canSelectPlan(plan)) {
                          setSelectedPlan(plan);
                          setStep(1);
                        } else {
                          Alert.alert(
                            "Không thể chọn gói",
                            plan.price === 0
                              ? "Gói miễn phí không thể chọn để thanh toán."
                              : "Bạn không thể chọn gói thấp hơn gói hiện tại."
                          );
                        }
                      }}
                      disabled={!canSelectPlan(plan)}
                    >
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.selectedPlanPrice}>
                        {plan.price > 0
                          ? `${plan.price.toLocaleString()} VNĐ/${plan.duration} ngày`
                          : "Miễn phí"}
                      </Text>
                      <Text style={styles.planDescription}>{plan.description}</Text>
                      {plan.features.map((feature, index) => (
                        <Text key={index} style={styles.planFeature}>
                          • {feature}
                        </Text>
                      ))}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <>
                  {step === 1 && (
                    <View style={styles.stepCard}>
                      <View style={styles.stepHeader}>
                        <Ionicons name="person" size={24} color="#2E7D32" />
                        <Text style={styles.stepTitle}>Thông tin người dùng</Text>
                      </View>
                      <View style={styles.userInfoCard}>
                        <View style={styles.userInfoItem}>
                          <Ionicons name="person-outline" size={20} color="#666" />
                          <Text style={styles.userInfoLabel}>Họ tên:</Text>
                          <Text style={styles.userInfoValue}>{user.userName || user.email}</Text>
                        </View>
                        <View style={styles.userInfoItem}>
                          <Ionicons name="mail-outline" size={20} color="#666" />
                          <Text style={styles.userInfoLabel}>Email:</Text>
                          <Text style={styles.userInfoValue}>{user.email}</Text>
                        </View>
                        <View style={styles.userInfoItem}>
                          <Ionicons name="call-outline" size={20} color="#666" />
                          <Text style={styles.userInfoLabel}>Số điện thoại:</Text>
                          <Text style={styles.userInfoValue}>{user.phone || "Không có dữ liệu"}</Text>
                        </View>
                      </View>
                    </View>
                  )}
                  {step === 2 && selectedPlan && (
                    <View style={styles.stepCard}>
                      <View style={styles.stepHeader}>
                        <Ionicons name="card" size={24} color="#2E7D32" />
                        <Text style={styles.stepTitle}>Thông tin gói & Phương thức thanh toán</Text>
                      </View>
                      <View style={styles.selectedPlanCard}>
                        <Text style={styles.selectedPlanName}>Gói thành viên: {selectedPlan.name}</Text>
                        <Text style={styles.selectedPlanPrice}>
                          Giá: {selectedPlan.price.toLocaleString()} VNĐ
                        </Text>
                        <Text style={styles.selectedPlanDuration}>Thời gian: {selectedPlan.duration} ngày</Text>
                        <Text style={styles.featuresTitle}>Các tính năng:</Text>
                        {selectedPlan.features.map((f, i) => (
                          <View key={i} style={styles.selectedFeatureItem}>
                            <Ionicons name="checkmark" size={16} color="#4CAF50" />
                            <Text style={styles.selectedFeatureText}>{f}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={styles.paymentMethodTitle}>Chọn phương thức thanh toán:</Text>
                      <TouchableOpacity
                        style={[
                          styles.paymentMethodCard,
                          paymentMethod === "vnpay" && styles.paymentMethodSelected,
                        ]}
                        onPress={() => setPaymentMethod("vnpay")}
                      >
                        <LinearGradient
                          colors={paymentMethod === "vnpay" ? ["#4CAF50", "#2E7D32"] : ["#FFFFFF", "#F8F9FA"]}
                          style={styles.paymentMethodGradient}
                        >
                          <Ionicons
                            name="card-outline"
                            size={24}
                            color={paymentMethod === "vnpay" ? "#FFFFFF" : "#333"}
                          />
                          <Text
                            style={[
                              styles.paymentMethodText,
                              paymentMethod === "vnpay" && styles.paymentMethodTextSelected,
                            ]}
                          >
                            VNPay
                          </Text>
                          {paymentMethod === "vnpay" && (
                            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.paymentMethodCard,
                          paymentMethod === "momo" && styles.paymentMethodSelected,
                        ]}
                        onPress={() => setPaymentMethod("momo")}
                      >
                        <LinearGradient
                          colors={paymentMethod === "momo" ? ["#4CAF50", "#2E7D32"] : ["#FFFFFF", "#F8F9FA"]}
                          style={styles.paymentMethodGradient}
                        >
                          <Ionicons
                            name="wallet-outline"
                            size={24}
                            color={paymentMethod === "momo" ? "#FFFFFF" : "#333"}
                          />
                          <Text
                            style={[
                              styles.paymentMethodText,
                              paymentMethod === "momo" && styles.paymentMethodTextSelected,
                            ]}
                          >
                            MoMo
                          </Text>
                          {paymentMethod === "momo" && (
                            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  )}
                  {step === 3 && selectedPlan && paymentMethod && (
                    <View style={styles.stepCard}>
                      <Text style={styles.confirmationTitle}>Xác nhận Thanh toán</Text>
                      <View style={styles.confirmationCard}>
                        <View style={styles.confirmationSection}>
                          <Text style={styles.subTitle}>Thông tin người dùng</Text>
                          <Text style={styles.confirmationText}>
                            Họ tên: {user.userName || user.email}
                          </Text>
                          <Text style={styles.confirmationText}>Email: {user.email}</Text>
                          <Text style={styles.confirmationText}>
                            Số điện thoại: {user.phone || "Không có dữ liệu"}
                          </Text>
                        </View>
                        <View style={styles.confirmationSection}>
                          <Text style={styles.subTitle}>Thông tin gói thành viên</Text>
                          <Text style={styles.confirmationText}>Gói: {selectedPlan.name}</Text>
                          <Text style={styles.confirmationText}>Level: {selectedPlan.level}</Text>
                          <Text style={styles.confirmationText}>
                            Giá: {selectedPlan.price.toLocaleString()} VNĐ
                          </Text>
                          <Text style={styles.confirmationText}>
                            Thời gian: {selectedPlan.duration} ngày
                          </Text>
                          {selectedPlan.features.map((f, i) => (
                            <Text key={i} style={styles.confirmationFeature}>
                              ✔ {f}
                            </Text>
                          ))}
                        </View>
                        <View style={styles.confirmationSection}>
                          <Text style={styles.subTitle}>Phương thức thanh toán</Text>
                          <Text style={styles.confirmationText}>
                            Phương thức: {paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                </>
              )}
            </LinearGradient>
          </ScrollView>
          <View style={styles.navigationButtons}>
            {step > 1 && (
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => setStep(step - 1)}
              >
                <LinearGradient
                  colors={["#E0E0E0", "#B0BEC5"]}
                  style={styles.navButtonGradient}
                >
                  <Ionicons name="chevron-back" size={20} color="#666" />
                  <Text style={styles.navButtonTextSecondary}>Bước trước</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            {step < 3 ? (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonPrimary]}
                onPress={() => setStep(step + 1)}
                disabled={step === 2 && !paymentMethod}
              >
                <LinearGradient
                  colors={["#4CAF50", "#2E7D32"]}
                  style={styles.navButtonGradient}
                >
                  <Text style={styles.navButtonText}>Tiếp theo</Text>
                  <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonPrimary]}
                onPress={() => {
                  if (selectedPlan && paymentMethod) {
                    handleCreatePayment(selectedPlan._id, paymentMethod);
                    handlePaymentSuccess();
                  }
                }}
              >
                <LinearGradient
                  colors={["#4CAF50", "#2E7D32"]}
                  style={styles.navButtonGradient}
                >
                  <Text style={styles.navButtonText}>Thanh toán</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  loadingContainer: { flex: 1 },
  loadingGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingContent: { alignItems: "center" },
  loadingText: { marginTop: 20, fontSize: 18, color: "#FFFFFF", fontWeight: "600" },
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitleContainer: { alignItems: "center", flex: 1 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginTop: 4,
  },
  headerRight: { width: 44, height: 44 },
  scrollView: { flex: 1 },
  plansContainer: { padding: 20 },
  planCard: {
    marginBottom: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  popularPlanCard: {
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  planGradient: { borderRadius: 20, padding: 24, position: "relative" },
  popularBadge: {
    position: "absolute",
    top: -8,
    right: 20,
    zIndex: 10,
    borderRadius: 16,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  popularBadgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  popularBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 4,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  planIconContainer: {
    marginRight: 16,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  planIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  planTitleContainer: { flex: 1 },
  planName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  planLevel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  planPriceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 16,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2E7D32",
  },
  planCurrency: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  planDescription: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
    marginBottom: 20,
  },
  planFeatures: { marginBottom: 24 },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    color: "#333",
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  selectPlanButton: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  selectPlanGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  modalContainer: { flex: 1, backgroundColor: "#FFFFFF" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E7D32",
    textAlign: "center",
  },
  modalHeaderRight: { width: 44, height: 44 },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  stepCircleActive: { backgroundColor: "#4CAF50" },
  stepCircleInactive: { backgroundColor: "#E0E0E0" },
  stepNumber: { fontSize: 14, fontWeight: "bold" },
  stepNumberActive: { color: "#FFFFFF" },
  stepNumberInactive: { color: "#666" },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
  },
  stepLineActive: { backgroundColor: "#4CAF50" },
  stepLineInactive: { backgroundColor: "#E0E0E0" },
  modalContent: { flex: 1 },
  modalGradient: { flex: 1, paddingBottom: 20 },
  stepCard: {
    margin: 20,
    padding: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E7D32",
    marginLeft: 12,
  },
  userInfoCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
  },
  userInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  userInfoLabel: {
    fontSize: 14,
    color: "#666",
    marginLeft: 12,
    flex: 1,
  },
  userInfoValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  selectedPlanCard: {
    backgroundColor: "#E8F5E8",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  selectedPlanName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 8,
  },
  selectedPlanPrice: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
    marginBottom: 4,
  },
  selectedPlanDuration: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  selectedFeatureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  selectedFeatureText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  paymentMethodCard: {
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  paymentMethodSelected: {
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  paymentMethodGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 16,
    flex: 1,
  },
  paymentMethodTextSelected: { color: "#FFFFFF" },
  confirmationCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 20,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 20,
    textAlign: "center",
  },
  confirmationSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  subTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4CAF50",
    marginBottom: 8,
  },
  confirmationText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
    lineHeight: 20,
  },
  confirmationFeature: {
    fontSize: 14,
    color: "#4CAF50",
    marginBottom: 4,
  },
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    gap: 12,
  },
  navButton: {
    flex: 1,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  navButtonPrimary: {
    shadowColor: "#4CAF50",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  navButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  navButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
    marginHorizontal: 8,
  },
  navButtonTextSecondary: {
    color: "#666",
    fontWeight: "600",
    fontSize: 16,
    marginHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 16,
  },
  planOption: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    backgroundColor: "#FFFFFF",
  },
  planFeature: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
});