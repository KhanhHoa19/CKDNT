

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
import { useCategories } from "../../context/CategoryContext"; // ← THÊM

const TAB_ALL = { id: "All", label: "All", emoji: "🍽️" };

export default function SearchScreen({ navigation, route }) {
  const initFilter = route.params?.filterCategory || "All";
  const { categories } = useCategories(); // ← THÊM

  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(initFilter);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  // Xây tabs từ categories (realtime)
  const tabs = [
    TAB_ALL,
    ...categories.map((c) => ({ id: c.label, label: c.label, emoji: c.emoji })),
  ];

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "sanpham"), (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProducts(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (route.params?.filterCategory) {
      setActiveTab(route.params.filterCategory);
    }
  }, [route.params?.filterCategory]);

  useEffect(() => {
    let result = products;
    if (activeTab !== "All")
      result = result.filter((p) => p.loaisp === activeTab);
    if (search.trim())
      result = result.filter((p) =>
        p.tensp?.toLowerCase().includes(search.toLowerCase()),
      );
    setFiltered(result);
  }, [products, activeTab, search]);

  const formatPrice = (p) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(p);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("ProductDetail", { product: item })}
    >
      {/* Phần thông tin bên trên */}
      <View style={{ alignItems: 'center', width: '100%' }}>
        {item.hinhanh ? (
          <Image source={{ uri: item.hinhanh }} style={styles.cardImg} />
        ) : (
          <View style={[styles.cardImg, styles.noImg]}>
            <Text style={{ fontSize: 36 }}>🍽️</Text>
          </View>
        )}
        <Text style={styles.cardName} numberOfLines={2}>
          {item.tensp}
        </Text>
        <Text style={styles.cardPrice}>{formatPrice(item.gia)}</Text>
      </View>

      {/* Phần nút bấm luôn ở dưới cùng */}
      <TouchableOpacity onPress={() => addToCart(item)} style={{ marginTop: 'auto' }}>
        <Text style={styles.addBtnText}>+ Add to cart</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerSub}>SEARCH</Text>
        <Text style={styles.headerTitle}>Món nào cũng ngon!!!</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Lựa món ngay"
          value={search}
          onChangeText={setSearch}
        />
        <Text style={{ fontSize: 18 }}>🔍</Text>
      </View>

      {/* Tabs động */}
      <View style={styles.tabsWrap}>
        <FlatList
          data={tabs}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.tabs}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={styles.tabEmoji}>{tab.emoji}</Text>
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {!loading && (
        <Text style={styles.resultCount}>
          {filtered.length} món{activeTab !== "All" ? ` ${activeTab}` : ""}
        </Text>
      )}

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#FF6B35"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          numColumns={2}
          renderItem={renderItem}
          contentContainerStyle={styles.grid}
          ListEmptyComponent={
            <Text style={styles.empty}>Không có sản phẩm nào</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: { paddingHorizontal: 20, paddingTop: 55, paddingBottom: 10 },
  headerSub: {
    fontSize: 11,
    color: "#FF6B35",
    fontWeight: "700",
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginTop: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  searchInput: { flex: 1, fontSize: 15 },
  tabsWrap: { marginBottom: 8 },
  tabs: { paddingHorizontal: 16, gap: 8 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  tabActive: { backgroundColor: "#FF6B35" },
  tabEmoji: { fontSize: 14, marginRight: 4 },
  tabText: { fontSize: 13, color: "#888", fontWeight: "500" },
  tabTextActive: { color: "#fff", fontWeight: "700" },
  resultCount: {
    paddingHorizontal: 20,
    fontSize: 13,
    color: "#aaa",
    marginBottom: 6,
  },
  grid: { paddingHorizontal: 10, paddingBottom: 80 },
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    elevation: 3,
    justifyContent: 'space-between',
  },
  cardImg: { width: 110, height: 110, borderRadius: 55, marginBottom: 10 },
  noImg: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  cardName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 4,
    height: 40, // Khoảng 2 dòng text
    verticalAlign: 'middle', // Căn giữa nội dung theo chiều dọc
  },
  cardPrice: { fontSize: 13, color: "#888", marginBottom: 8 },
  addBtnText: { fontSize: 13, color: "#FF6B35", fontWeight: "600" },
  empty: { textAlign: "center", marginTop: 60, color: "#aaa", fontSize: 15 },
});
