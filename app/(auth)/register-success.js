"use client"

import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useRef, useState } from "react"
import { Animated, Dimensions, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native"

const { width, height } = Dimensions.get("window")

// Color constants
const COLORS = {
  primary: "#4CAF50",
  secondary: "#2E7D32",
  accent: "#66BB6A",
  success: "#4CAF50",
  white: "#FFFFFF",
  lightGreen: "#E8F5E8",
  darkGreen: "#1B5E20",
}

export default function RegisterSuccessScreen() {
  const router = useRouter()
  const { userName, userEmail } = useLocalSearchParams()

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.3)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const confettiAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Confetti particles
  const [confettiParticles] = useState(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      y: -50,
      rotation: Math.random() * 360,
      color: i % 2 === 0 ? COLORS.primary : COLORS.accent,
    })),
  )

  useEffect(() => {
    // Start animations sequence
    const animationSequence = Animated.sequence([
      // Fade in background
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Scale up success icon
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      // Slide up content
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ])

    // Confetti animation
    const confettiAnimation = Animated.timing(confettiAnim, {
      toValue: height + 100,
      duration: 3000,
      useNativeDriver: true,
    })

    // Pulse animation for success icon
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    )

    // Start all animations
    animationSequence.start()
    confettiAnimation.start()
    pulseAnimation.start()

    // Auto redirect after 5 seconds
    const autoRedirect = setTimeout(() => {
      handleContinue()
    }, 5000)

    return () => {
      clearTimeout(autoRedirect)
      pulseAnimation.stop()
    }
  }, [])

  const handleContinue = () => {
    router.replace("/(auth)/login")
  }

  const handleGoHome = () => {
    router.replace("/")
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.darkGreen, COLORS.secondary, COLORS.primary, COLORS.accent]}
        style={styles.gradient}
      >
        {/* Confetti Particles */}
        {confettiParticles.map((particle) => (
          <Animated.View
            key={particle.id}
            style={[
              styles.confettiParticle,
              {
                left: particle.x,
                backgroundColor: particle.color,
                transform: [
                  {
                    translateY: confettiAnim.interpolate({
                      inputRange: [0, height + 100],
                      outputRange: [particle.y, height + 100],
                    }),
                  },
                  {
                    rotate: confettiAnim.interpolate({
                      inputRange: [0, height + 100],
                      outputRange: [`${particle.rotation}deg`, `${particle.rotation + 720}deg`],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Success Icon */}
          <Animated.View
            style={[
              styles.successIconContainer,
              {
                transform: [{ scale: Animated.multiply(scaleAnim, pulseAnim) }],
              },
            ]}
          >
            <LinearGradient colors={[COLORS.white, COLORS.lightGreen]} style={styles.successIconGradient}>
              <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
            </LinearGradient>
          </Animated.View>

          {/* Success Content */}
          <Animated.View
            style={[
              styles.textContent,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.successTitle}>🎉 Chúc mừng!</Text>
            <Text style={styles.successSubtitle}>Tài khoản đã được tạo thành công</Text>

            <View style={styles.userInfoContainer}>
              <View style={styles.userInfoItem}>
                <Ionicons name="person" size={20} color={COLORS.white} />
                <Text style={styles.userInfoText}>
                  Xin chào, <Text style={styles.userInfoBold}>{userName || "Bạn"}!</Text>
                </Text>
              </View>

              <View style={styles.userInfoItem}>
                <Ionicons name="mail" size={20} color={COLORS.white} />
                <Text style={styles.userInfoText}>{userEmail || "Email của bạn"}</Text>
              </View>
            </View>

            <Text style={styles.welcomeMessage}>
              Chào mừng bạn đến với cộng đồng bỏ thuốc lá! Hành trình khỏe mạnh của bạn bắt đầu từ đây.
            </Text>

            {/* Features Preview */}
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>Những gì bạn sẽ có:</Text>

              <View style={styles.featureItem}>
                <Ionicons name="trending-up" size={16} color={COLORS.white} />
                <Text style={styles.featureText}>Theo dõi tiến trình hàng ngày</Text>
              </View>

              <View style={styles.featureItem}>
                <Ionicons name="people" size={16} color={COLORS.white} />
                <Text style={styles.featureText}>Kết nối với cộng đồng</Text>
              </View>

              <View style={styles.featureItem}>
                <Ionicons name="heart" size={16} color={COLORS.white} />
                <Text style={styles.featureText}>Hỗ trợ sức khỏe 24/7</Text>
              </View>
            </View>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View
            style={[
              styles.buttonContainer,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity style={styles.primaryButton} onPress={handleContinue}>
              <LinearGradient colors={[COLORS.white, "#F8FFF8"]} style={styles.primaryButtonGradient}>
                <Text style={styles.primaryButtonText}>Đăng nhập ngay</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.primary} />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
              <Text style={styles.secondaryButtonText}>Khám phá ứng dụng</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Auto redirect countdown */}
          <Animated.View
            style={[
              styles.countdownContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={styles.countdownText}>Tự động chuyển đến đăng nhập sau 5 giây...</Text>
          </Animated.View>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  confettiParticle: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  successIconContainer: {
    marginBottom: 32,
  },
  successIconGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  textContent: {
    alignItems: "center",
    marginBottom: 40,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.white,
    textAlign: "center",
    marginBottom: 12,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  successSubtitle: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 24,
  },
  userInfoContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    width: "100%",
  },
  userInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfoText: {
    fontSize: 16,
    color: COLORS.white,
    marginLeft: 12,
  },
  userInfoBold: {
    fontWeight: "bold",
  },
  welcomeMessage: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  featuresContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 20,
    width: "100%",
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 16,
    textAlign: "center",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginLeft: 12,
  },
  buttonContainer: {
    width: "100%",
    marginBottom: 20,
  },
  primaryButton: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
    marginRight: 8,
  },
  secondaryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: "600",
  },
  countdownContainer: {
    alignItems: "center",
  },
  countdownText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
  },
})
