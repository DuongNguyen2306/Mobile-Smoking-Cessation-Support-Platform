"use client"

import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { useState } from "react"
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { register } from "../services/api"

export default function RegisterScreen() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên của bạn")
      return false
    }
    if (!email.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập email")
      return false
    }
    if (password.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 6 ký tự")
      return false
    }
    if (password !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp")
      return false
    }
    return true
  }

  const handleRegister = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      // Updated to pass confirmPassword as 4th parameter
      const res = await register(name, email, password, confirmPassword)
      // Navigate to success screen instead of showing alert
      router.push({
        pathname: "/register-success",
        params: {
          userName: name,
          userEmail: email,
        },
      })
    } catch (err) {
      console.log("Lỗi đăng ký:", err)
      Alert.alert("Lỗi", err.response?.data?.message || "Đăng ký thất bại")
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <LinearGradient colors={["#1B5E20", "#2E7D32", "#4CAF50"]} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header Section */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.iconContainer}>
              <Ionicons name="person-add" size={50} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Tạo Tài Khoản</Text>
            <Text style={styles.subtitle}>Bắt đầu hành trình khỏe mạnh của bạn</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#4CAF50" style={styles.inputIcon} />
              <TextInput
                placeholder="Tên đầy đủ"
                placeholderTextColor="#A5A5A5"
                value={name}
                onChangeText={setName}
                style={styles.input}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#4CAF50" style={styles.inputIcon} />
              <TextInput
                placeholder="Email của bạn"
                placeholderTextColor="#A5A5A5"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#4CAF50" style={styles.inputIcon} />
              <TextInput
                placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                placeholderTextColor="#A5A5A5"
                value={password}
                onChangeText={setPassword}
                style={[styles.input, styles.passwordInput]}
                secureTextEntry={!showPassword}
                autoComplete="password-new"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#4CAF50" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#4CAF50" style={styles.inputIcon} />
              <TextInput
                placeholder="Xác nhận mật khẩu"
                placeholderTextColor="#A5A5A5"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={[styles.input, styles.passwordInput]}
                secureTextEntry={!showConfirmPassword}
                autoComplete="password-new"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#4CAF50" />
              </TouchableOpacity>
            </View>

            {/* Password Strength Indicator */}
            <View style={styles.passwordStrength}>
              <View style={styles.strengthIndicator}>
                <View style={[styles.strengthBar, password.length >= 6 && styles.strengthBarActive]} />
                <View
                  style={[
                    styles.strengthBar,
                    password.length >= 8 && /[A-Z]/.test(password) && styles.strengthBarActive,
                  ]}
                />
                <View
                  style={[
                    styles.strengthBar,
                    password.length >= 8 &&
                      /[A-Z]/.test(password) &&
                      /[0-9]/.test(password) &&
                      styles.strengthBarActive,
                  ]}
                />
              </View>
              <Text style={styles.strengthText}>
                {password.length === 0 ? "" : password.length < 6 ? "Yếu" : password.length < 8 ? "Trung bình" : "Mạnh"}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.registerButtonText}>Tạo Tài Khoản</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.loginButton} onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.loginButtonText}>
                Đã có tài khoản? <Text style={styles.loginButtonTextBold}>Đăng nhập</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Benefits Section */}
          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>Tại sao chọn chúng tôi?</Text>
            <View style={styles.benefitItem}>
              <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.benefitText}>Hỗ trợ 24/7 từ chuyên gia</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="trending-up" size={16} color="#FFFFFF" />
              <Text style={styles.benefitText}>Theo dõi tiến trình chi tiết</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="people" size={16} color="#FFFFFF" />
              <Text style={styles.benefitText}>Cộng đồng hỗ trợ tích cực</Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 0,
    top: 0,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E8F5E8",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#333333",
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    padding: 4,
  },
  passwordStrength: {
    marginBottom: 20,
  },
  strengthIndicator: {
    flexDirection: "row",
    marginBottom: 8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#E0E0E0",
    marginRight: 4,
    borderRadius: 2,
  },
  strengthBarActive: {
    backgroundColor: "#4CAF50",
  },
  strengthText: {
    fontSize: 12,
    color: "#666666",
    textAlign: "right",
  },
  registerButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#666666",
    fontSize: 14,
  },
  loginButton: {
    alignItems: "center",
  },
  loginButtonText: {
    color: "#666666",
    fontSize: 14,
    textAlign: "center",
  },
  loginButtonTextBold: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
  benefitsContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 20,
  },
  benefitsTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  benefitText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    marginLeft: 8,
  },
})
