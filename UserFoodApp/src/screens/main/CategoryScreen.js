import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { db } from "../../config/firebase";
import { useCart } from "../../context/CartContext";

const CATEGORY_CONFIG = {
  Burger: { color: "#FFA500", emoji: "🍔", bg: "#FFF5E6" },
  Pizza: { color: "#2C5F4E", emoji: "🍕", bg: "#E8F5F0" },
  Burrito: { color: "#D2691E", emoji: "🌯", bg: "#FBF0E8" },
};

export default function CategoryScreen({ navigation, route }) {
  const { category } = route.params;
  const config = CATEGORY_CONFIG[category] || {
    color: "#FF6B35",
    emoji: "🍽️",
    bg: "#FFF0E8",
  };

  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sanpham"), (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const data = all.filter((p) => p.loaisp === category);
      setProducts(data);
      setFiltered(data);
      setLoading(false);
    });
    return unsub;
  }, [category]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(products);
    } else {
      setFiltered(
        products.filter((p) =>
          p.tensp?.toLowerCase().includes(search.toLowerCase()),
        ),
      );
    }
  }, [search, products]);

  const formatPrice = (p) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(p);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate("ProductDetail", { product: item })}
    >
      {/* Ảnh sản phẩm */}
      {item.hinhanh ? (
        <Image source={{ uri: item.hinhanh }} style={styles.cardImg} />
      ) : (
        <View
          style={[styles.cardImg, styles.noImg, { backgroundColor: config.bg }]}
        >
          <Text style={{ fontSize: 40 }}>{config.emoji}</Text>
        </View>
      )}

      {/* Thông tin */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.tensp}
        </Text>
        <Text style={styles.cardCategory}>{item.loaisp}</Text>
        <View style={styles.cardBottom}>
          <Text style={styles.cardPrice}>{formatPrice(item.gia)}</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: config.color }]}
            onPress={() => {
              addToCart(item);
            }}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: config.color }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>{config.emoji}</Text>
          <Text style={styles.headerTitle}>{category}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={`Tìm món ${category}...`}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text style={{ color: "#aaa", fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Số lượng */}
      {!loading && (
        <Text style={styles.resultCount}>
          {filtered.length} món {category}
        </Text>
      )}

      {/* Danh sách */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={config.color}
          style={{ marginTop: 60 }}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 60, marginBottom: 12 }}>
                {config.emoji}
              </Text>
              <Text style={styles.emptyText}>
                {search
                  ? `Không tìm thấy "${search}"`
                  : `Chưa có món ${category} nào`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },

  // Header
  header: {
    paddingTop: 55,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  backText: { fontSize: 20, color: "#fff", fontWeight: "bold" },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  headerEmoji: { fontSize: 28, marginRight: 8 },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#fff" },

  // Search
  searchWrap: { paddingHorizontal: 16, paddingVertical: 14 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#1a1a1a" },

  // Result count
  resultCount: {
    paddingHorizontal: 20,
    fontSize: 13,
    color: "#aaa",
    marginBottom: 8,
  },

  // List
  list: { paddingHorizontal: 16, paddingBottom: 100 },

  // Card — layout ngang (list style)
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    flexDirection: "row",
    marginBottom: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    elevation: 3,
  },
  cardImg: {
    width: 90,
    height: 90,
    borderRadius: 14,
    marginRight: 14,
  },
  noImg: { justifyContent: "center", alignItems: "center" },
  cardInfo: { flex: 1 },
  cardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  cardCategory: { fontSize: 12, color: "#aaa", marginBottom: 10 },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardPrice: { fontSize: 16, fontWeight: "800", color: "#1a1a1a" },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginTop: -2,
  },

  // Empty
  emptyWrap: { alignItems: "center", marginTop: 80 },
  emptyText: { fontSize: 15, color: "#aaa", textAlign: "center" },
});
