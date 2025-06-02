import { useState } from "react";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { login } from "../api/authApi";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await login(email, password);
      Alert.alert("Đăng nhập thành công", `Xin chào ${res.data.user.username}`);
    } catch (err) {
      Alert.alert("Lỗi", err.response?.data?.message || "Không thể đăng nhập");
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20 }}>Đăng nhập</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />
      <TextInput placeholder="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />
      <Button title="Đăng nhập" onPress={handleLogin} />
      <Button title="Đăng ký tài khoản mới" onPress={() => navigation.navigate("Register")} />
    </View>
  );
}
