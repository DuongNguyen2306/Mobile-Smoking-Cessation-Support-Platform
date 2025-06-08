import AsyncStorage from "@react-native-async-storage/async-storage";
import { Tabs, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

export default function TabLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          if (!pathname?.includes("blogs")) {
            throw new Error("Không có token");
          }
        }
        setIsAuthenticated(!!token);
      } catch (error) {
        console.error("Lỗi kiểm tra token:", error);
      }
    };
    checkAuth();
  }, [pathname]);

  if (isAuthenticated === null) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...Platform.select({ ios: { position: "absolute" }, default: {} }),
          height: 60,
          paddingBottom: 5,
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#ccc",
          display: ({ route }) => (route.name === "chat/[receiverId]" ? "none" : "flex"), // Ẩn tab bar trên chat/[receiverId]
        },
        tabBarHideOnKeyboard: true, // Ẩn tab bar khi bàn phím hiện lên
      }}
    >
      <Tabs.Screen
        name="blogs"
        options={{ title: "Blogs", tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Cá nhân", tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: "Chat", tabBarIcon: () => null }}
      />
      <Tabs.Screen
        name="chat/[receiverId]"
        options={{ title: "Chat", tabBarIcon: () => null }}
      />
    </Tabs>
  );
}