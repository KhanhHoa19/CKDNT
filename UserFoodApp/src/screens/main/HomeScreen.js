import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { useCategories } from "../../context/CategoryContext";

export default function HomeScreen({ navigation }) {
  const { userProfile } = useAuth();
  const { categories, loading: catLoading } = useCategories();
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sanpham"), (snap) => {
      setFeatured(
        snap.docs.map((d) => ({ id: d.id, ...d.data() })).slice(0, 4),
      );
    });
    return unsub;
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.deliverTo}>DELIVER TO</Text>
          <TouchableOpacity style={styles.locationRow}>
            <Text style={styles.location}>
              {userProfile?.address1 || "Chọn địa chỉ"} ▼
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.cartBtn}
          onPress={() => navigation.getParent()?.navigate("Cart")}
        >
          <Text style={{ fontSize: 22 }}>🛒</Text>
        </TouchableOpacity>
      </View>

      {/* BANNER */}
      <View style={styles.banner}>
        <View style={styles.bannerLeft}>
          <Text style={styles.bannerTag}>SUMMER</Text>
          <Text style={styles.bannerTitle}>SUMMER{"\n"}COMBO</Text>
          <Text style={styles.bannerPrice}>$10.88</Text>
        </View>
        <View style={styles.bannerRight}>
          <Text style={{ fontSize: 80 }}>🍔</Text>
        </View>
      </View>

      {/* DANH MỤC ĐỘNG */}
      {catLoading ? (
        <ActivityIndicator
          size="small"
          color="#FF6B35"
          style={{ marginVertical: 20 }}
        />
      ) : (
        categories
          .filter((cat) => cat.label !== "Khác")
          .map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryCard, { backgroundColor: cat.color }]}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate("CategoryScreen", { category: cat.label })
              }
            >
              {/* Emoji nhỏ góc trên, rồi tên bên dưới */}
              <View style={styles.categoryTextBlock}>
                <Text style={styles.categoryEmojiSmall}>{cat.emoji}</Text>
                <Text style={styles.categoryLabel} numberOfLines={2}>
                  {cat.label.toUpperCase()}
                </Text>
              </View>

              {/* Ảnh hoặc emoji lớn góc phải */}
              {cat.image ? (
                <Image
                  source={{ uri: cat.image }}
                  style={styles.categoryImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.categoryEmojiLarge}>{cat.emoji}</Text>
              )}
            </TouchableOpacity>
          ))
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 16,
  },
  deliverTo: {
    fontSize: 11,
    color: "#FF6B35",
    fontWeight: "700",
    letterSpacing: 1,
  },
  locationRow: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
  },
  location: { fontSize: 14, fontWeight: "600", color: "#222" },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },

  banner: {
    marginHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#D2691E",
    flexDirection: "row",
    padding: 20,
    marginBottom: 14,
    overflow: "hidden",
    height: 160,
  },
  bannerLeft: { flex: 1, justifyContent: "center" },
  bannerTag: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.8,
    marginBottom: 4,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 30,
  },
  bannerPrice: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
  },
  bannerRight: { justifyContent: "flex-end" },

  categoryCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    height: 110,
    marginBottom: 14,
    justifyContent: "center",
    paddingLeft: 24,
    overflow: "hidden",
  },
  categoryTextBlock: {
    flexDirection: "column",
    alignItems: "flex-start",
    maxWidth: "65%",
  },
  categoryEmojiSmall: { fontSize: 24, marginBottom: 4 }, // ← emoji nhỏ trên tên
  categoryLabel: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },
  categoryImage: {
    position: "absolute",
    right: -10,
    bottom: -5,
    width: 140,
    height: 140,
  },
  categoryEmojiLarge: {
    position: "absolute",
    right: 10,
    bottom: -8,
    fontSize: 80,
  },
});
