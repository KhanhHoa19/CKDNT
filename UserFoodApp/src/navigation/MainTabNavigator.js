import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text, View, Image } from "react-native";
import { useCart } from "../context/CartContext";

import CartScreen from "../screens/main/CartScreen";
import CategoryScreen from "../screens/main/CategoryScreen";
import EditProfileScreen from "../screens/main/EditProfileScreen";
import AdminScreen from "../screens/main/AdminScreen";
import HomeScreen from "../screens/main/HomeScreen";
import OrderHistoryScreen from "../screens/main/OrderHistoryScreen";
import ProfileScreen from "../screens/main/ProfileScreen";
import SearchScreen from "../screens/main/SearchScreen";
import WriteReviewScreen from "../screens/main/WriteReviewScreen";
import ChatScreen from "../screens/main/ChatScreen"; // ← MỚI
import ProductDetailScreen from "../screens/ProductDetailScreen";

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const SearchStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const CartStack = createNativeStackNavigator();
const ChatStack = createNativeStackNavigator(); // ← MỚI

function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="CategoryScreen" component={CategoryScreen} />
      <HomeStack.Screen name="ProductDetail" component={ProductDetailScreen} />
    </HomeStack.Navigator>
  );
}

function SearchStackNav() {
  return (
    <SearchStack.Navigator screenOptions={{ headerShown: false }}>
      <SearchStack.Screen name="SearchMain" component={SearchScreen} />
      <SearchStack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
      />
    </SearchStack.Navigator>
  );
}

// ✅ Cart có thêm màn hình OrderHistory
function CartStackNav() {
  return (
    <CartStack.Navigator screenOptions={{ headerShown: false }}>
      <CartStack.Screen name="CartMain" component={CartScreen} />
      <CartStack.Screen name="OrderHistory" component={OrderHistoryScreen} />
      <CartStack.Screen name="WriteReview" component={WriteReviewScreen} />
    </CartStack.Navigator>
  );
}

function ChatStackNav() {
  return (
    <ChatStack.Navigator screenOptions={{ headerShown: false }}>
      <ChatStack.Screen name="ChatMain" component={ChatScreen} />
    </ChatStack.Navigator>
  );
}

function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="AdminScreen" component={AdminScreen} />
    </ProfileStack.Navigator>
  );
}

const TabIcon = ({ emoji, image, focused, badge }) => (
  <View style={{ alignItems: "center" }}>
    {image ? (
      <Image source={image} style={{ width: 24, height: 24, borderRadius: 12, resizeMode: "cover" }} />
    ) : (
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
    )}
    {badge > 0 && (
      <View
        style={{
          position: "absolute",
          top: -4,
          right: -8,
          backgroundColor: "#FF6B35",
          borderRadius: 10,
          minWidth: 18,
          height: 18,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>
          {badge}
        </Text>
      </View>
    )}
  </View>
);

export default function MainTabNavigator() {
  const { totalItems } = useCart();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          height: 65,
          borderTopWidth: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          elevation: 10,
        },
        tabBarLabelStyle: { fontSize: 11, marginBottom: 6 },
        tabBarActiveTintColor: "#FF6B35",
        tabBarInactiveTintColor: "#aaa",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNav}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchStackNav}
        options={{
          tabBarLabel: "Search",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} />,
        }}
      />
      {/* ✅ Cart dùng CartStackNav thay vì CartScreen trực tiếp */}
      <Tab.Screen
        name="Cart"
        component={CartStackNav}
        options={{
          tabBarLabel: "Cart",
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🛒" focused={focused} badge={totalItems} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStackNav}
        options={{
          tabBarLabel: "Tư vấn",
          tabBarIcon: ({ focused }) => <TabIcon image={require('../../assets/images/tuvan.jpg')} focused={focused} />,
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
