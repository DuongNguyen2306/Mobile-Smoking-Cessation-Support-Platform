import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { getQuitPlanHistory } from '../services/api'; // Điều chỉnh đường dẫn nếu cần

const PlanHistoryScreen = () => {
  const [planHistory, setPlanHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          setError('Chưa đăng nhập, vui lòng đăng nhập trước.');
          setLoading(false);
          return;
        }
        const response = await getQuitPlanHistory();
        console.log('Phản hồi từ API:', response.data);
        if (response.data && response.data.data && response.data.data.planHistory) {
          setPlanHistory(response.data.data.planHistory);
        } else {
          setPlanHistory([]);
          console.log('Không tìm thấy planHistory trong phản hồi:', response.data);
        }
      } catch (error) {
        console.log('Lỗi khi tải lịch sử kế hoạch:', error);
        setError(error.message || 'Đã xảy ra lỗi');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const chartConfig = {
    backgroundGradientFrom: '#1E2923',
    backgroundGradientTo: '#08130D',
    color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
    strokeWidth: 2,
  };

  if (loading) return <Text>Đang tải...</Text>;
  if (error) return <Text>Lỗi: {error}</Text>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Lịch Sử Kế Hoạch</Text>
      {planHistory.length === 0 ? (
        <Text>Không có kế hoạch nào để hiển thị.</Text>
      ) : (
        planHistory.map((planItem, index) => {
          const { plan, completedStages, totalStages, completionPercentage, badgeCount } = planItem;
          const chartData = [
            { name: 'Hoàn thành', population: completionPercentage, color: '#4CAF50' },
            { name: 'Còn lại', population: 100 - completionPercentage, color: '#F44336' },
          ];

          return (
            <View key={index} style={styles.planCard}>
              <Image source={{ uri: plan.image }} style={styles.planImage} />
              <Text style={styles.planTitle}>Kế hoạch: {plan.title}</Text>
              <Text>Trạng thái: {plan.status === 'ongoing' ? 'Đang thực hiện' : 'Đã hủy'}</Text>
              {plan.cancelReason && <Text>Lý do hủy: {plan.cancelReason}</Text>}
              <Text>Ngày bắt đầu: {new Date(plan.startDate).toLocaleDateString('vi-VN')}</Text>
              <Text>Ngày kết thúc: {new Date(plan.endDate).toLocaleDateString('vi-VN')}</Text>
              <Text>Giai đoạn hoàn thành: {completedStages}/{totalStages}</Text>
              <Text>Phần trăm hoàn thành: {completionPercentage}%</Text>
              <Text>Số huy hiệu: {badgeCount}</Text>
              <PieChart
                data={chartData}
                width={300}
                height={200}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  planCard: { marginBottom: 20, padding: 10, borderWidth: 1, borderColor: '#ccc' },
  planTitle: { fontSize: 18, fontWeight: 'bold' },
  planImage: { width: 200, height: 100, resizeMode: 'contain', marginBottom: 10 },
});

export default PlanHistoryScreen;