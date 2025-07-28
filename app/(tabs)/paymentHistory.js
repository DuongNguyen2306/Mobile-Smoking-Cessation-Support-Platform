
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { getPayments } from "../services/api";

// Fallback for useSearchParams if not available
const useSearchParamsFallback = () => ({ status: null });

const useSearchParams = typeof window !== "undefined" && window.expo?.useSearchParams ? window.expo.useSearchParams : useSearchParamsFallback;

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const { status } = useSearchParams() || { status: "all" };
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(status || "all");

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getPayments({ status: filter !== "all" ? filter : undefined });
      if (response.data.success) {
        let filteredPayments = response.data.data.payments;
        if (filter !== "all") {
          filteredPayments = filteredPayments.filter((p) => p.payment.status === filter);
        }
        setPayments(filteredPayments);
      } else {
        throw new Error("Không tải được dữ liệu thanh toán");
      }
    } catch (err) {
      console.error("❌ Error loading payments:", err);
      setError("Không thể tải lịch sử thanh toán");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const formatDate = (dateString) => {
    if (!dateString) return "Chưa cập nhật";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Ho_Chi_Minh",
    });
  };

  const renderPaymentItem = ({ item }) => (
    <View style={styles.paymentCard}>
      <LinearGradient colors={["#FFFFFF", "#F8F9FA"]} style={styles.paymentGradient}>
        <View style={styles.paymentHeader}>
          <Text style={styles.paymentOrderCode}>{item.order.orderCode}</Text>
          <Text
            style={[
              styles.paymentStatus,
              { color: item.payment.status === "success" ? "#4CAF50" : "#FF5722" },
            ]}
          >
            {item.payment.status === "success" ? "Thành công" : "Thất bại"}
          </Text>
        </View>
        <View style={styles.paymentDetails}>
          <Text style={styles.paymentDetail}>Số tiền: {item.payment.amount.toLocaleString()} VNĐ</Text>
          <Text style={styles.paymentDetail}>Ngày thanh toán: {formatDate(item.payment.paymentDate)}</Text>
          <Text style={styles.paymentDetail}>Phương thức: {item.payment.paymentMethod}</Text>
          <Text style={styles.paymentDetail}>Mã giao dịch: {item.payment.transactionId}</Text>
        </View>
      </LinearGradient>
    </View>
  );

  const renderFilterSection = () => (
    <View style={styles.filterSection}>
      <TouchableOpacity
        style={[styles.filterButton, filter === "all" && styles.filterButtonActive]}
        onPress={() => setFilter("all")}
      >
        <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>Tất cả</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, filter === "success" && styles.filterButtonActive]}
        onPress={() => setFilter("success")}
      >
        <Text style={[styles.filterText, filter === "success" && styles.filterTextActive]}>Thành công</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, filter === "pending" && styles.filterButtonActive]}
        onPress={() => setFilter("pending")}
      >
        <Text style={[styles.filterText, filter === "pending" && styles.filterTextActive]}>Đang chờ</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, filter === "failed" && styles.filterButtonActive]}
        onPress={() => setFilter("failed")}
      >
        <Text style={[styles.filterText, filter === "failed" && styles.filterTextActive]}>Thất bại</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Đang tải lịch sử thanh toán...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorContent}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPayments}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <FlatList
        ListHeaderComponent={renderFilterSection}
        data={payments}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item.payment.id}
        contentContainerStyle={styles.paymentList}
        ListFooterComponent={
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Quay lại</Text>
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorContent: {
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#FF5722",
    marginBottom: 20,
  },
  retryButton: {
    padding: 10,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  filterSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterButtonActive: {
    backgroundColor: "#4CAF50",
  },
  filterText: {
    color: "#666",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  paymentList: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  paymentCard: {
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  paymentGradient: {
    borderRadius: 12,
    padding: 15,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  paymentOrderCode: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  paymentStatus: {
    fontSize: 14,
    fontWeight: "500",
  },
  paymentDetails: {
    marginTop: 5,
  },
  paymentDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  backButton: {
    padding: 15,
    backgroundColor: "#FF5722",
    alignItems: "center",
    margin: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
