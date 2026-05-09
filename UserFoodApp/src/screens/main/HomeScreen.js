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

const defaultBannerImage = require("../../../assets/images/combo.jpg");

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
        <View style={styles.bannerImageWrap}>
          <Image
            source={
              featured?.[0]?.image
                ? { uri: featured[0].image }
                : defaultBannerImage
            }
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlay} />
        </View>
        <View style={styles.bannerLeft}>
          <Text style={styles.bannerTag}>SUMMER</Text>
          <Text style={styles.bannerTitle}>SUMMER{"\n"}COMBO</Text>
          <Text style={styles.bannerPrice}>$10.88</Text>
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
              <View style={styles.categoryMedia}>
                {cat.image ? (
                  <Image
                    source={{ uri: cat.image }}
                    style={styles.categoryImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.categoryEmojiLarge}>{cat.emoji}</Text>
                )}
              </View>
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
    justifyContent: "center",
    paddingHorizontal: 20,
    marginBottom: 14,
    overflow: "hidden",
    height: 160,
  },
  bannerImageWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(36, 18, 6, 0.38)",
  },
  bannerLeft: {
    justifyContent: "center",
    width: "58%",
    zIndex: 2,
    paddingRight: 10,
  },
  bannerTag: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "serif",
    opacity: 0.8,
    marginBottom: 4,
    letterSpacing: 1.2,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "700",
    fontFamily: "serif",
    fontStyle: "italic",
    lineHeight: 33,
    textShadowColor: "rgba(0,0,0,0.28)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  bannerPrice: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "serif",
    marginTop: 8,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },

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
    width: "52%",
    zIndex: 2,
    paddingRight: 8,
  },
  categoryEmojiSmall: { fontSize: 24, marginBottom: 4 }, // ← emoji nhỏ trên tên
  categoryLabel: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },
  categoryMedia: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: "50%",
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryEmojiLarge: {
    alignSelf: "center",
    marginTop: 12,
    fontSize: 72,
  },
});
