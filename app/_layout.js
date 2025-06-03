import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (token) {
          router.replace("/(tabs)/blogs"); // Đã đăng nhập -> chuyển đến blogs
        } else {
          router.replace("/(auth)/login"); // Chưa đăng nhập -> chuyển đến login
        }
      } catch (error) {
        console.error("Lỗi kiểm tra token:", error);
        router.replace("/(auth)/login");
      }
    };
    checkAuth();
  }, [router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}