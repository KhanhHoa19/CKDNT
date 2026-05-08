/**
 * ProductListScreen.tsx  (Admin app)  — ĐÃ CẬP NHẬT
 * ─────────────────────────────────────────────────────────────
 * Thay đổi so với bản cũ:
 *   • FAB "+" mở ra 2 nút mini pop-up:
 *       ① Thêm sản phẩm  → navigate("AddProduct")
 *       ② Thêm hạng mục → navigate("AddCategory")
 *   • Nhấn ra ngoài / nhấn FAB lần 2 → đóng pop-up
 * ─────────────────────────────────────────────────────────────
 */

import { signOut } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { auth, db } from "../../config/firebase";

export default function ProductListScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ── FAB state ──────────────────────────────────────────────
  const [fabOpen, setFabOpen] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const toggleFab = () => {
    if (fabOpen) closeFab();
    else openFab();
  };

  const openFab = () => {
    setFabOpen(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeFab = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => setFabOpen(false));
  };

  // ── Firestore ──────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "sanpham"), orderBy("tensp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProducts(data);
      setFiltered(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(products);
      return;
    }
    const kw = search.toLowerCase();
    setFiltered(
      products.filter(
        (p) =>
          p.tensp?.toLowerCase().includes(kw) ||
          p.loaisp?.toLowerCase().includes(kw),
      ),
    );
  }, [search, products]);

  // ── Handlers ───────────────────────────────────────────────
  const handleDelete = (item) => {
    Alert.alert("Xác nhận xóa", `Xóa "${item.tensp}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "sanpham", item.id));
          } catch {
            Alert.alert("Lỗi", "Không thể xóa sản phẩm");
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      { text: "Đăng xuất", onPress: () => signOut(auth) },
    ]);
  };

  const formatPrice = (p) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(p);

  // ── Render item ────────────────────────────────────────────
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() =>
        navigation.navigate("ProductDetailAdmin", { product: item })
      }
    >
      {item.hinhanh ? (
        <Image source={{ uri: item.hinhanh }} style={styles.img} />
      ) : (
        <View style={[styles.img, styles.noImg]}>
          <Text style={{ fontSize: 28 }}>📦</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.tensp}
        </Text>
        <Text style={styles.category}>🏷️ {item.loaisp}</Text>
        <Text style={styles.price}>{formatPrice(item.gia)}</Text>
        <View style={styles.badgeRow}>
          {item.soluong !== undefined && (
            <View
              style={[
                styles.badge,
                { backgroundColor: item.soluong > 0 ? "#EAFAF1" : "#FDEDEC" },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: item.soluong > 0 ? "#27ae60" : "#e74c3c" },
                ]}
              >
                {item.soluong > 0 ? `🟢 ${item.soluong}` : "🔴 Hết"}
              </Text>
            </View>
          )}
          {item.sizes?.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.sizes.map((s) => s.id).join(" · ")}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => navigation.navigate("EditProduct", { product: item })}
        >
          <Text>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDelete(item)}
        >
          <Text>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            🛍️ Sản Phẩm ({filtered.length})
          </Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.search}
          placeholder="🔍 Tìm theo tên, loại sản phẩm..."
          value={search}
          onChangeText={setSearch}
        />

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={styles.empty}>Chưa có sản phẩm nào</Text>
          }
        />
      </View>

      {/* ── OVERLAY ĐỂ ĐÓNG FAB KHI NHẤN RA NGOÀI ── */}
      {fabOpen && (
        <TouchableWithoutFeedback onPress={closeFab}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      )}

      {/* ── FAB POP-UP BUTTONS ── */}
      {fabOpen && (
        <Animated.View
          style={[
            styles.fabMenu,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Nút 1: Thêm hạng mục */}
          <TouchableOpacity
            style={[styles.fabMenuItem, styles.fabMenuItemCategory]}
            onPress={() => {
              closeFab();
              navigation.navigate("AddCategory");
            }}
          >
            <View style={styles.fabMenuIcon}>
              <Text style={{ fontSize: 18 }}>🏷️</Text>
            </View>
            <Text style={styles.fabMenuLabel}>Thêm hạng mục</Text>
          </TouchableOpacity>

          {/* Nút 2: Thêm sản phẩm */}
          <TouchableOpacity
            style={[styles.fabMenuItem, styles.fabMenuItemProduct]}
            onPress={() => {
              closeFab();
              navigation.navigate("AddProduct");
            }}
          >
            <View style={styles.fabMenuIcon}>
              <Text style={{ fontSize: 18 }}>🍽️</Text>
            </View>
            <Text style={styles.fabMenuLabel}>Thêm sản phẩm</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── FAB CHÍNH ── */}
      <TouchableOpacity
        style={[styles.fab, fabOpen && styles.fabOpen]}
        onPress={toggleFab}
      >
        <Text style={[styles.fabText, fabOpen && styles.fabTextOpen]}>
          {fabOpen ? "✕" : "+"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const FAB_BOTTOM = 24;
const FAB_RIGHT = 24;
const FAB_SIZE = 60;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#2c3e50",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  logoutBtn: {
    backgroundColor: "#e74c3c",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: { color: "#fff", fontWeight: "bold" },
  search: {
    margin: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 12,
    flexDirection: "row",
    padding: 12,
    elevation: 3,
  },
  img: { width: 80, height: 80, borderRadius: 8 },
  noImg: {
    backgroundColor: "#ecf0f1",
    justifyContent: "center",
    alignItems: "center",
  },
  info: { flex: 1, paddingHorizontal: 12, justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "bold", color: "#2c3e50", marginBottom: 3 },
  category: { fontSize: 12, color: "#7f8c8d", marginBottom: 3 },
  price: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#e74c3c",
    marginBottom: 6,
  },
  badgeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: { fontSize: 11, color: "#555", fontWeight: "600" },
  actions: { justifyContent: "space-around" },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  editBtn: { backgroundColor: "#d6eaf8", marginBottom: 6 },
  deleteBtn: { backgroundColor: "#fadbd8" },
  empty: { textAlign: "center", marginTop: 60, fontSize: 16, color: "#95a5a6" },

  // ── FAB ──────────────────────────────────────────────────────
  fab: {
    position: "absolute",
    bottom: FAB_BOTTOM,
    right: FAB_RIGHT,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: "#3498db",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabOpen: { backgroundColor: "#e74c3c" },
  fabText: { color: "#fff", fontSize: 32, fontWeight: "bold", marginTop: -2 },
  fabTextOpen: { fontSize: 24, marginTop: 0 },

  // ── FAB MENU ─────────────────────────────────────────────────
  fabMenu: {
    position: "absolute",
    bottom: FAB_BOTTOM + FAB_SIZE + 12,
    right: FAB_RIGHT,
    alignItems: "flex-end",
    gap: 10,
  },
  fabMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    gap: 10,
  },
  fabMenuItemProduct: { backgroundColor: "#3498db" },
  fabMenuItemCategory: { backgroundColor: "#27ae60" },
  fabMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  fabMenuLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginRight: 4,
  },
});
