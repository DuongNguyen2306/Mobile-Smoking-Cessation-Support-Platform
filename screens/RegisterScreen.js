import { useState } from "react";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { register } from "../api/authApi";

export default function RegisterScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const handleRegister = async () => {
    try {
      await register(email, password, username);
      Alert.alert("Đăng ký thành công", "Bạn có thể đăng nhập ngay bây giờ!");
      navigation.navigate("Login");
    } catch (err) {
      Alert.alert("Lỗi", err.response?.data?.message || "Không thể đăng ký");
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 20 }}>Đăng ký</Text>
      <TextInput placeholder="Username" value={username} onChangeText={setUsername} style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />
      <TextInput placeholder="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry style={{ borderWidth: 1, marginBottom: 10, padding: 8 }} />
      <Button title="Đăng ký" onPress={handleRegister} />
    </View>
  );
}
