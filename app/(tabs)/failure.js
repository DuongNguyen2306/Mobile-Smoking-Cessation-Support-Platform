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
  lightError: "#FFEBEE",
  lightWarning: "#FFF3E0",
}

export default function FailureScreen() {
  const router = useRouter()
  const [fadeAnim] = useState(new Animated.Value(0))
  const [slideAnim] = useState(new Animated.Value(50))

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const handleTryAgain = () => {
    router.push("/plans")
  }

  const handleBackToHome = () => {
    router.push("/")
  }

  const handleGetSupport = () => {
    // Navigate to support or counseling section
    router.push("/support")
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.lightError, COLORS.white, COLORS.lightBackground]}
        style={styles.backgroundGradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Failure Icon with Animation */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.iconBackground}>
              <Ionicons name="heart-dislike" size={64} color={COLORS.error} />
            </View>
          </Animated.View>

          {/* Main Message */}
          <Animated.View
            style={[
              styles.messageContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.failureTitle}>Đừng nản lòng!</Text>
            <Text style={styles.failureSubtitle}>
              Bỏ thuốc là một hành trình khó khăn và thất bại là một phần của quá trình học hỏi.
            </Text>
          </Animated.View>

          {/* Encouragement Cards */}
          <View style={styles.encouragementContainer}>
            <View style={styles.encouragementCard}>
              <LinearGradient colors={[COLORS.white, COLORS.lightWarning]} style={styles.cardGradient}>
                <View style={styles.cardIcon}>
                  <Ionicons name="refresh" size={28} color={COLORS.warning} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Thử lại là bình thường</Text>
                  <Text style={styles.cardDesc}>
                    Nhiều người cần thử nhiều lần mới thành công. Điều quan trọng là không bỏ cuộc.
                  </Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.encouragementCard}>
              <LinearGradient colors={[COLORS.white, "#E3F2FD"]} style={styles.cardGradient}>
                <View style={styles.cardIcon}>
                  <Ionicons name="school" size={28} color={COLORS.info} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Học hỏi từ kinh nghiệm</Text>
                  <Text style={styles.cardDesc}>
                    Hãy xem xét những gì đã xảy ra và chuẩn bị tốt hơn cho lần tiếp theo.
                  </Text>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.encouragementCard}>
              <LinearGradient colors={[COLORS.white, COLORS.lightBackground]} style={styles.cardGradient}>
                <View style={styles.cardIcon}>
                  <Ionicons name="people" size={28} color={COLORS.primary} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Tìm kiếm hỗ trợ</Text>
                  <Text style={styles.cardDesc}>
                    Đừng ngại tìm kiếm sự giúp đỡ từ gia đình, bạn bè hoặc chuyên gia.
                  </Text>
                </View>
              </LinearGradient>
            </View>
          </View>

          {/* Motivational Quote */}
          <View style={styles.quoteCard}>
            <LinearGradient colors={[COLORS.primary + "10", COLORS.white]} style={styles.quoteGradient}>
              <View style={styles.quoteIcon}>
                <Ionicons name="quote" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.quoteText}>
                "Thất bại không phải là ngã xuống, mà là không đứng dậy sau khi ngã."
              </Text>
              <Text style={styles.quoteAuthor}>- Vince Lombardi</Text>
            </LinearGradient>
          </View>

          {/* Statistics Card */}
          <View style={styles.statsCard}>
            <LinearGradient colors={[COLORS.white, COLORS.lightBackground]} style={styles.statsGradient}>
              <Text style={styles.statsTitle}>Bạn có biết?</Text>
              <View style={styles.statItem}>
                <Ionicons name="information-circle" size={20} color={COLORS.info} />
                <Text style={styles.statText}>Trung bình một người cần thử 6-7 lần mới bỏ thuốc thành công</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="trending-up" size={20} color={COLORS.success} />
                <Text style={styles.statText}>Mỗi lần thử đều tăng khả năng thành công trong tương lai</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleTryAgain}>
              <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.buttonGradient}>
                <Ionicons name="refresh-circle" size={20} color={COLORS.white} />
                <Text style={styles.primaryButtonText}>Thử lại</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.supportButton} onPress={handleGetSupport}>
              <LinearGradient colors={[COLORS.info, "#1976D2"]} style={styles.buttonGradient}>
                <Ionicons name="help-circle" size={20} color={COLORS.white} />
                <Text style={styles.supportButtonText}>Tìm hỗ trợ</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleBackToHome}>
              <View style={styles.secondaryButtonContent}>
                <Ionicons name="home-outline" size={20} color={COLORS.lightText} />
                <Text style={styles.secondaryButtonText}>Về trang chủ</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer Message */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              Hãy nhớ rằng mỗi bước đi, dù nhỏ, cũng là tiến bộ. Bạn mạnh mẽ hơn bạn nghĩ! 💪
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
  iconContainer: {
    marginTop: 40,
    marginBottom: 30,
  },
  iconBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.lightError,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  messageContainer: {
    alignItems: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  failureTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 12,
  },
  failureSubtitle: {
    fontSize: 16,
    color: COLORS.lightText,
    textAlign: "center",
    lineHeight: 24,
  },
  encouragementContainer: {
    width: "100%",
    marginBottom: 30,
  },
  encouragementCard: {
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardGradient: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 20,
    borderRadius: 16,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: COLORS.lightText,
    lineHeight: 20,
  },
  quoteCard: {
    width: "100%",
    marginBottom: 30,
    borderRadius: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quoteGradient: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  quoteIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.lightBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  quoteText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 24,
    marginBottom: 12,
  },
  quoteAuthor: {
    fontSize: 14,
    color: COLORS.lightText,
    fontWeight: "600",
  },
  statsCard: {
    width: "100%",
    marginBottom: 30,
    borderRadius: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statsGradient: {
    padding: 20,
    borderRadius: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 16,
    textAlign: "center",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  statText: {
    fontSize: 14,
    color: COLORS.lightText,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
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
  supportButton: {
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: COLORS.info,
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
  supportButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.white,
    marginLeft: 8,
  },
  secondaryButton: {
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightBackground,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    color: COLORS.lightText,
    marginLeft: 8,
  },
  footerContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.lightText,
    textAlign: "center",
    lineHeight: 20,
  },
})
