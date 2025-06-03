import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import { login } from "../services/api"; // Sửa từ "../../services/api"

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await login(email, password);
      const { token, user } = res.data.data;
      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("user", JSON.stringify(user));
      Alert.alert("Thành công", `Chào ${user.email}`, [
        { text: "OK", onPress: () => router.push("/(tabs)/blogs") },
      ]);
    } catch (err) {
      console.log("Lỗi đăng nhập:", err);
      Alert.alert("Lỗi", err.response?.data?.message || "Đăng nhập thất bại");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng nhập</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />
      <Button title="Đăng nhập" onPress={handleLogin} />
      <View style={styles.registerButton}>
        <Button title="Chưa có tài khoản? Đăng ký" onPress={() => router.push("/(auth)/register")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, marginBottom: 12, borderRadius: 6 },
  registerButton: { marginTop: 10 },
});