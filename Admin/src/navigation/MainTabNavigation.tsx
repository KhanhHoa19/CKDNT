
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { Text, View } from "react-native";

import OrderDetailScreen from "../screens/orders/OrderDetailScreen";
import OrderListScreen from "../screens/orders/OrderListScreen";
import AddCategoryScreen from "../screens/products/AddCategoryScreen"; // ← thêm import
import AddProductScreen from "../screens/products/AddProductScreen";
import EditProductScreen from "../screens/products/EditProductScreen";
import ProductDetailAdminScreen from "../screens/products/ProductDetailAdminScreen"; // ← THÊM
import ProductListScreen from "../screens/products/ProductListScreen";
import EditProfileScreen from "../screens/profile/EditProfileScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";

const Tab = createBottomTabNavigator();
const ProductStack = createNativeStackNavigator();
const OrderStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function ProductStackNav() {
  return (
    <ProductStack.Navigator screenOptions={{ headerShown: false }}>
      <ProductStack.Screen name="ProductList" component={ProductListScreen} />
      <ProductStack.Screen
        name="ProductDetailAdmin"
        component={ProductDetailAdminScreen}
      />
      <ProductStack.Screen name="AddProduct" component={AddProductScreen} />
      <ProductStack.Screen name="EditProduct" component={EditProductScreen} />
      <ProductStack.Screen name="AddCategory" component={AddCategoryScreen} />
    </ProductStack.Navigator>
  );
}

function OrderStackNav() {
  return (
    <OrderStack.Navigator screenOptions={{ headerShown: false }}>
      <OrderStack.Screen name="OrderList" component={OrderListScreen} />
      <OrderStack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </OrderStack.Navigator>
  );
}

function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    </ProfileStack.Navigator>
  );
}

const TabIcon = ({ emoji, label, focused }) => (
  <View style={{ alignItems: "center" }}>
    <Text style={{ fontSize: 22 }}>{emoji}</Text>
  </View>
);

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#2c3e50",
          height: 65,
          borderTopWidth: 0,
          elevation: 10,
        },
        tabBarLabelStyle: { fontSize: 11, marginBottom: 6 },
        tabBarActiveTintColor: "#3498db",
        tabBarInactiveTintColor: "#95a5a6",
      }}
    >
      <Tab.Screen
        name="Products"
        component={ProductStackNav}
        options={{
          tabBarLabel: "Sản phẩm",
          tabBarIcon: ({ focused }) => <TabIcon emoji="📦" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrderStackNav}
        options={{
          tabBarLabel: "Đơn hàng",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🧾" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNav}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
