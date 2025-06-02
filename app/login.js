import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { login } from "../api/api";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

 const handleLogin = async () => {
  try {
    const res = await login(email, password);

    console.log("RES.DATA:", res.data); // Kiểm tra lại một lần nữa

    const user = res.data?.data?.user;
    if (!user) {
      throw new Error("Dữ liệu trả về không hợp lệ từ server");
    }

    Alert.alert("Thành công", `Chào ${user.email}`); // Bạn có thể hiển thị tên khác nếu muốn
    router.replace("/(tabs)");
  } catch (err) {
    console.log("Lỗi login:", err);
    console.log("Lỗi chi tiết:", err.response?.data);
    Alert.alert("Lỗi", err.response?.data?.message || err.message || "Lỗi không xác định");
  }
};




  return (
    <View style={{ padding: 20 }}>
      <Text>Đăng nhập</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput placeholder="Mật khẩu" secureTextEntry value={password} onChangeText={setPassword} />
      <Button title="Đăng nhập" onPress={handleLogin} />
      <Button title="Chưa có tài khoản? Đăng ký" onPress={() => router.push("/register")} />
    </View>
  );
}
