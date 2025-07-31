"use client"

import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import { Animated, Dimensions, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native"

const { width } = Dimensions.get("window")

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
  gold: "#FFD700",
  lightGold: "#FFF8DC",
}

export default function SuccessScreen() {
  const router = useRouter()
  const [celebrationAnim] = useState(new Animated.Value(0))
  const [scaleAnim] = useState(new Animated.Value(0))

  useEffect(() => {
    // Animation for celebration
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(celebrationAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const handleBackToHome = () => {
    router.push("/")
  }

  const handleNewPlan = () => {
    router.push("/plans")
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.success, COLORS.primary, COLORS.accent]} style={styles.backgroundGradient}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Success Icon with Animation */}
          <Animated.View
            style={[
              styles.successIconContainer,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <LinearGradient colors={[COLORS.gold, "#FFA500"]} style={styles.successIconGradient}>
              <Ionicons name="trophy" size={80} color={COLORS.white} />
            </LinearGradient>
          </Animated.View>

          {/* Celebration Elements */}
          <Animated.View
            style={[
              styles.celebrationContainer,
              {
                opacity: celebrationAnim,
                transform: [
                  {
                    translateY: celebrationAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.congratsText}>🎉 CHÚC MỪNG! 🎉</Text>
            <Text style={styles.successTitle}>Bạn đã hoàn thành kế hoạch!</Text>
            <Text style={styles.successSubtitle}>
              Bạn đã vượt qua tất cả các giai đoạn và chính thức bỏ thuốc thành công!
            </Text>
          </Animated.View>

          {/* Achievement Cards */}
          <View style={styles.achievementsContainer}>
            <View style={styles.achievementCard}>
              <LinearGradient colors={[COLORS.white, COLORS.lightGold]} style={styles.achievementGradient}>
                <View style={styles.achievementIcon}>
                  <Ionicons name="checkmark-circle" size={32} color={COLORS.success} />
                </View>
                <Text style={styles.achievementTitle}>Kế hoạch hoàn thành</Text>
                <Text style={styles.achievementDesc}>Bạn đã vượt qua tất cả các giai đoạn một cách xuất sắc</Text>
              </LinearGradient>
            </View>

            <View style={styles.achievementCard}>
              <LinearGradient colors={[COLORS.white, COLORS.lightBackground]} style={styles.achievementGradient}>
                <View style={styles.achievementIcon}>
                  <Ionicons name="heart" size={32} color={COLORS.error} />
                </View>
                <Text style={styles.achievementTitle}>Sức khỏe cải thiện</Text>
                <Text style={styles.achievementDesc}>Cơ thể bạn đang phục hồi và trở nên khỏe mạnh hơn</Text>
              </LinearGradient>
            </View>

            <View style={styles.achievementCard}>
              <LinearGradient colors={[COLORS.white, "#E3F2FD"]} style={styles.achievementGradient}>
                <View style={styles.achievementIcon}>
                  <Ionicons name="wallet" size={32} color={COLORS.info} />
                </View>
                <Text style={styles.achievementTitle}>Tiết kiệm tiền</Text>
                <Text style={styles.achievementDesc}>Bạn đã tiết kiệm được một khoản tiền đáng kể</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Motivational Message */}
          <View style={styles.messageCard}>
            <LinearGradient colors={[COLORS.white, COLORS.lightBackground]} style={styles.messageGradient}>
              <View style={styles.messageIcon}>
                <Ionicons name="star" size={24} color={COLORS.gold} />
              </View>
              <Text style={styles.messageTitle}>Bạn thật tuyệt vời!</Text>
              <Text style={styles.messageText}>
                Việc bỏ thuốc không hề dễ dàng, nhưng bạn đã làm được! Hãy tiếp tục duy trì lối sống lành mạnh này và tự
                hào về thành tựu của mình.
              </Text>
            </LinearGradient>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleBackToHome}>
              <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.buttonGradient}>
                <Ionicons name="home" size={20} color={COLORS.white} />
                <Text style={styles.primaryButtonText}>Về trang chủ</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleNewPlan}>
              <View style={styles.secondaryButtonContent}>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                <Text style={styles.secondaryButtonText}>Kế hoạch mới</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer Message */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              "Thành công không phải là đích đến, mà là hành trình. Bạn đã hoàn thành một hành trình tuyệt vời!"
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    alignItems: "center",
  },
  successIconContainer: {
    marginTop: 40,
    marginBottom: 30,
  },
  successIconGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  celebrationContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  congratsText: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 16,
    textAlign: "center",
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.white,
    textAlign: "center",
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    color: COLORS.white,
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.9,
    paddingHorizontal: 20,
  },
  achievementsContainer: {
    width: "100%",
    marginBottom: 30,
  },
  achievementCard: {
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  achievementGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
  },
  achievementIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
    flex: 1,
  },
  achievementDesc: {
    fontSize: 14,
    color: COLORS.lightText,
    lineHeight: 20,
    flex: 1,
  },
  messageCard: {
    width: "100%",
    marginBottom: 30,
    borderRadius: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  messageGradient: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  messageIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.lightGold,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 12,
    textAlign: "center",
  },
  messageText: {
    fontSize: 14,
    color: COLORS.lightText,
    textAlign: "center",
    lineHeight: 22,
  },
  actionContainer: {
    width: "100%",
    marginBottom: 30,
  },
  primaryButton: {
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.white,
    marginLeft: 8,
  },
  secondaryButton: {
    borderRadius: 16,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
    marginLeft: 8,
  },
  footerContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.white,
    textAlign: "center",
    fontStyle: "italic",
    opacity: 0.8,
    lineHeight: 20,
  },
})
