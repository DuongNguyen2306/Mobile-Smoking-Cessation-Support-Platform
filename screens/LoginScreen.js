import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { login } from "../api/authApi";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await login(email, password);
      const user = res.data?.user;
      const token = res.data?.token;

      if (!user || !token) {
        throw new Error("Dữ liệu không hợp lệ từ server");
      }

      // Lưu token và user nếu cần
      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("user", JSON.stringify(user));

      Alert.alert("Đăng nhập thành công", `Xin chào ${user.username}`);
      navigation.replace("Home"); // ✅ điều hướng sau login
    } catch (err) {
      Alert.alert("Lỗi", err.response?.data?.message || err.message || "Không thể đăng nhập");
    } finally {
      setLoading(false);
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
        secureTextEntry
        style={styles.input}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <Button title="Đăng nhập" onPress={handleLogin} />
          <View style={{ marginTop: 12 }}>
            <Button
              title="Đăng ký tài khoản mới"
              onPress={() => navigation.navigate("Register")}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
});
