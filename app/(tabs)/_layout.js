"use client"

import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Tabs, usePathname } from "expo-router"
import { useEffect, useState } from "react"
import { Platform } from "react-native"

export default function TabLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(null)
  const pathname = usePathname()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("token")

        // Cho phép truy cập blogs mà không cần đăng nhập
        if (!token && !pathname?.includes("blogs")) {
          setIsAuthenticated(false)
          return
        }

        setIsAuthenticated(token ? true : false)
      } catch (error) {
        console.error("Lỗi kiểm tra xác thực:", error)
        setIsAuthenticated(false)
      }
    }

    checkAuth()
  }, [pathname])

  // Hiển thị loading trong khi kiểm tra xác thực
  if (isAuthenticated === null) {
    return null
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          marginTop: 4,
        },
        tabBarStyle: {
          height: Platform.OS === "ios" ? 85 : 65,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 25 : 8,
          backgroundColor: "#ffffff",
          borderTopWidth: 0.5,
          borderTopColor: "rgba(0, 0, 0, 0.1)",
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="blogs"
        options={{
          title: "Blog",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "newspaper" : "newspaper-outline"} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          href: isAuthenticated ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Cá nhân",
          href: isAuthenticated ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat/[receiverId]"
        options={{
          href: null,
        }}
      />

      {/* Ẩn các route không mong muốn */}
      <Tabs.Screen
        name="followList"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="[id]"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="blogs/[slug]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  )
}
