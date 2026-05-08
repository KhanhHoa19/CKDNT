
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";

import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import MainTabNavigator from "./MainTabNavigation";

const Stack = createNativeStackNavigator();

function UnauthorizedScreen() {
  const { logout } = useAuth();
  return (
    <View style={styles.center}>
      <Text style={styles.icon}>🚫</Text>
      <Text style={styles.title}>Không có quyền truy cập</Text>
      <Text style={styles.sub}>
        Tài khoản này không phải Admin.{"\n"}
        Vui lòng đăng nhập bằng tài khoản Admin.
      </Text>
      <TouchableOpacity style={styles.btn} onPress={logout}>
        <Text style={styles.btnText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AppNavigator() {
  const { user, isAdmin, loading } = useAuth();

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={{ marginTop: 12, color: "#7f8c8d" }}>
          Đang kiểm tra quyền truy cập...
        </Text>
      </View>
    );

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Chưa đăng nhập → Login + Register
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : isAdmin ? (
          // Đã đăng nhập + là admin → vào Main
          <Stack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          // Đã đăng nhập nhưng KHÔNG phải admin
          <Stack.Screen name="Unauthorized" component={UnauthorizedScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f5f5f5",
  },
  icon: { fontSize: 60, marginBottom: 16 },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: "#7f8c8d",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  btn: {
    backgroundColor: "#e74c3c",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
