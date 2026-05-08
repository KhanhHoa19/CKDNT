import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import CheckoutBottomSheet from "../screens/components/CheckoutBottomSheet";
import ImageSlider from "../screens/components/ImageSlider";

const { width: SCREEN_W } = Dimensions.get("window");

export default function ProductDetailScreen({ navigation, route }) {
  const { product } = route.params;
  const { userProfile } = useAuth();

  const allImages = [product.hinhanh, ...(product.images || [])].filter(
    Boolean,
  );

  const [selectedSize, setSelectedSize] = useState(
    product.sizes?.length > 0 ? product.sizes[0] : null,
  );
  const [modalVisible, setModalVisible] = useState(false);

  // Realtime rating từ Firestore
  const [avgRating, setAvgRating] = useState(product.avgRating || 0);
  const [totalReviews, setTotalReviews] = useState(product.totalReviews || 0);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sanpham", product.id), (snap) => {
      if (snap.exists()) {
        setAvgRating(snap.data().avgRating || 0);
        setTotalReviews(snap.data().totalReviews || 0);
      }
    });
    return unsub;
  }, [product.id]);

  const basePrice = product.gia || 0;
  const sizeExtra = selectedSize?.extraPrice || 0;
  const finalPrice = basePrice + sizeExtra;

  const formatPrice = (p) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(p);

  // Callback khi đặt hàng thành công từ CheckoutBottomSheet
  const handleOrderSuccess = ({ qty }) => {
    Alert.alert(
      "✅ Đã thêm vào giỏ",
      `${qty}x ${product.tensp}${selectedSize ? ` (${selectedSize.label})` : ""} đã được thêm vào giỏ hàng`,
      [
        { text: "Tiếp tục mua", style: "cancel" },
        {
          text: "Xem giỏ hàng",
          onPress: () => navigation.getParent()?.navigate("Cart"),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Slider ảnh */}
        {allImages.length > 0 ? (
          <ImageSlider images={allImages} />
        ) : (
          <View style={styles.noImg}>
            <Text style={{ fontSize: 80 }}>🍽️</Text>
          </View>
        )}

        {/* Back button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ fontSize: 20 }}>←</Text>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{product.loaisp}</Text>
          </View>

          <Text style={styles.name}>{product.tensp}</Text>

          {totalReviews > 0 && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingStar}>★</Text>
              <Text style={styles.ratingScore}>{avgRating.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({totalReviews} đánh giá)</Text>
            </View>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(finalPrice)}</Text>
            {sizeExtra > 0 && (
              <Text style={styles.priceBase}>Gốc {formatPrice(basePrice)}</Text>
            )}
          </View>

          {product.mota ? (
            <Text style={styles.desc}>{product.mota}</Text>
          ) : (
            <Text style={styles.desc}>
              Món ăn ngon được chế biến từ nguyên liệu tươi. Giao hàng nhanh
              trong 30 phút.
            </Text>
          )}

          {product.sizes?.length > 0 && (
            <View style={styles.sizeSection}>
              <Text style={styles.sizeTitle}>Chọn size</Text>
              <View style={styles.sizeRow}>
                {product.sizes.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.sizeBtn,
                      selectedSize?.id === s.id && styles.sizeBtnActive,
                    ]}
                    onPress={() => setSelectedSize(s)}
                  >
                    <Text
                      style={[
                        styles.sizeBtnId,
                        selectedSize?.id === s.id && { color: "#fff" },
                      ]}
                    >
                      {s.id}
                    </Text>
                    <Text
                      style={[
                        styles.sizeBtnLabel,
                        selectedSize?.id === s.id && { color: "#fff" },
                      ]}
                    >
                      {s.label}
                    </Text>
                    <Text
                      style={[
                        styles.sizeBtnExtra,
                        selectedSize?.id === s.id && { color: "#ffd" },
                      ]}
                    >
                      {s.extraPrice > 0
                        ? `+${formatPrice(s.extraPrice)}`
                        : "Gốc"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {product.soluong !== undefined && (
            <Text style={styles.stockText}>
              {product.soluong > 0
                ? `🟢 Còn ${product.soluong} phần`
                : "🔴 Hết hàng"}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>
            {selectedSize ? `Size ${selectedSize.label}` : "Giá"}
          </Text>
          <Text style={styles.footerPrice}>{formatPrice(finalPrice)}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.addBtn,
            product.soluong === 0 && { backgroundColor: "#ccc" },
          ]}
          onPress={() => product.soluong !== 0 && setModalVisible(true)}
        >
          <Text style={styles.addBtnText}>
            {product.soluong === 0 ? "Hết hàng" : "+ Thêm vào giỏ"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal thanh toán — tách ra CheckoutBottomSheet */}
      <CheckoutBottomSheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        product={product}
        selectedSize={selectedSize}
        finalPrice={finalPrice}
        formatPrice={formatPrice}
        defaultAddress={userProfile?.address1 || ""}
        onSuccess={handleOrderSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  noImg: {
    height: 300,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  backBtn: {
    position: "absolute",
    top: 50,
    left: 16,
    backgroundColor: "#fff",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  info: { padding: 20 },
  badge: {
    backgroundColor: "#FFF0E8",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  badgeText: { color: "#FF6B35", fontWeight: "700", fontSize: 13 },
  name: { fontSize: 24, fontWeight: "800", color: "#1a1a1a", marginBottom: 6 },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
  },
  ratingStar: { fontSize: 16, color: "#f39c12" },
  ratingScore: { fontSize: 15, fontWeight: "700", color: "#f39c12" },
  ratingCount: { fontSize: 13, color: "#aaa" },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 12,
  },
  price: { fontSize: 22, fontWeight: "700", color: "#FF6B35" },
  priceBase: {
    fontSize: 14,
    color: "#aaa",
    textDecorationLine: "line-through",
  },
  desc: { fontSize: 14, color: "#888", lineHeight: 22, marginBottom: 16 },
  stockText: { fontSize: 13, marginTop: 12 },
  sizeSection: { marginTop: 4 },
  sizeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 10,
  },
  sizeRow: { flexDirection: "row", gap: 10 },
  sizeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderWidth: 2,
    borderColor: "#eee",
  },
  sizeBtnActive: { backgroundColor: "#FF6B35", borderColor: "#FF6B35" },
  sizeBtnId: { fontSize: 16, fontWeight: "900", color: "#555" },
  sizeBtnLabel: { fontSize: 11, color: "#888", marginTop: 2 },
  sizeBtnExtra: { fontSize: 11, color: "#aaa", marginTop: 2 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  footerLabel: { fontSize: 13, color: "#aaa" },
  footerPrice: { fontSize: 20, fontWeight: "800", color: "#1a1a1a" },
  addBtn: {
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
