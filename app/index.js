import { useRouter } from "expo-router";
import { Button, Text, View } from "react-native";

export default function TabHome() {
  const router = useRouter();

  return (
    <View style={{ padding: 20 }}>
      <Text>🟢 Đây là tab chính sau khi đăng nhập</Text>
      <Button title="Đăng xuất" onPress={() => router.replace("/login")} />
    </View>
  );
}
