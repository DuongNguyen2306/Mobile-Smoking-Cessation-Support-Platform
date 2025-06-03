import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Button, StyleSheet, Text, View } from "react-native";
import { logout } from "../services/api";

export default function ProfileScreen() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const userData = await AsyncStorage.getItem("user");
      if (userData) setUserEmail(JSON.parse(userData).email);
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    Alert.alert("Xác nhận", "Bạn có chắc chắn muốn đăng xuất?", [
      {
        text: "Hủy",
        style: "cancel",
      },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("user");
            router.replace("/(auth)/login");
          } catch (err) {
            console.error("Lỗi đăng xuất:", err);
            Alert.alert("Lỗi", "Không thể đăng xuất");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trang cá nhân</Text>
      <Text style={styles.email}>Email: {userEmail || "Chưa đăng nhập"}</Text>
      <Button title="Đăng xuất" color="red" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  email: { fontSize: 16, marginBottom: 24 },
});