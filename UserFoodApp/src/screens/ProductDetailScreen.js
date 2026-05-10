import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
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

  const [liveProduct, setLiveProduct] = useState(product);
  const allImages = [liveProduct.hinhanh, ...(liveProduct.images || [])].filter(
    Boolean,
  );

  const [selectedSize, setSelectedSize] = useState(
    product.sizes?.length > 0 ? product.sizes[0] : null,
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [reviews, setReviews] = useState([]);

  // Realtime rating từ Firestore
  const [avgRating, setAvgRating] = useState(product.avgRating || 0);
  const [totalReviews, setTotalReviews] = useState(product.totalReviews || 0);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sanpham", product.id), (snap) => {
      if (snap.exists()) {
        const live = { id: snap.id, ...snap.data() };
        setLiveProduct(live);
      }
    });
    return unsub;
  }, [product.id]);

  useEffect(() => {
    const q = query(collection(db, "reviews"), where("productId", "==", product.id));
    const unsub = onSnapshot(q, (snap) => {
      const reviewData = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => r.isVisible !== false)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setReviews(reviewData);
    });
    return unsub;
  }, [product.id]);

  const { avgFromReviews, totalFromReviews } = useMemo(() => {
    const total = reviews.length;
    if (total === 0) return { avgFromReviews: 0, totalFromReviews: 0 };
    const sum = reviews.reduce((acc, item) => acc + Number(item.rating || 0), 0);
    return { avgFromReviews: sum / total, totalFromReviews: total };
  }, [reviews]);

  useEffect(() => {
    if (totalFromReviews > 0) {
      setAvgRating(avgFromReviews);
      setTotalReviews(totalFromReviews);
      return;
    }
    setAvgRating(Number(liveProduct.avgRating || 0));
    setTotalReviews(Number(liveProduct.totalReviews || 0));
  }, [avgFromReviews, totalFromReviews, liveProduct.avgRating, liveProduct.totalReviews]);

  const basePrice = liveProduct.gia || 0;
  const sizeExtra = selectedSize?.extraPrice || 0;
  const finalPrice = basePrice + sizeExtra;

  const formatPrice = (p) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(p);
  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "";

  const renderStars = (rating) => {
    const safe = Math.max(0, Math.min(5, Math.round(Number(rating || 0))));
    return "★".repeat(safe) + "☆".repeat(5 - safe);
  };

  // Callback khi đặt hàng thành công từ CheckoutBottomSheet
  const handleOrderSuccess = ({ qty }) => {
    Alert.alert(
      "✅ Đã thêm vào giỏ",
              `${qty}x ${liveProduct.tensp}${selectedSize ? ` (${selectedSize.label})` : ""} đã được thêm vào giỏ hàng`,
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
            <Text style={styles.badgeText}>{liveProduct.loaisp}</Text>
          </View>

          <Text style={styles.name}>{liveProduct.tensp}</Text>

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

          {liveProduct.mota ? (
            <Text style={styles.desc}>{liveProduct.mota}</Text>
          ) : (
            <Text style={styles.desc}>
              Món ăn ngon được chế biến từ nguyên liệu tươi. Giao hàng nhanh
              trong 30 phút.
            </Text>
          )}

          {liveProduct.sizes?.length > 0 && (
            <View style={styles.sizeSection}>
              <Text style={styles.sizeTitle}>Chọn size</Text>
              <View style={styles.sizeRow}>
                {liveProduct.sizes.map((s) => (
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

          {liveProduct.soluong !== undefined && (
            <Text style={styles.stockText}>
              {liveProduct.soluong > 0
                ? `🟢 Còn ${liveProduct.soluong} phần`
                : "🔴 Số lượng: 0 - đơn hàng đã hết"}
            </Text>
          )}

          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>
              Đánh giá từ khách hàng ({reviews.length})
            </Text>
            {reviews.length === 0 ? (
              <Text style={styles.noReviewText}>
                Chưa có đánh giá nào cho món này.
              </Text>
            ) : (
              reviews.map((review) => {
                const reviewImages = Array.isArray(review.images) ? review.images : [];
                return (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewTop}>
                      <View>
                        <Text style={styles.reviewUser}>
                          {review.userName || "Người dùng"}
                        </Text>
                        <Text style={styles.reviewDate}>
                          {formatDate(review.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.reviewStars}>
                        {renderStars(review.rating)}
                      </Text>
                    </View>
                    {!!review.comment && (
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    )}
                    {reviewImages.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.reviewImagesRow}
                      >
                        {reviewImages.map((img, idx) => (
                          <Image
                            key={`${review.id}-${idx}`}
                            source={{ uri: img }}
                            style={styles.reviewImage}
                          />
                        ))}
                      </ScrollView>
                    )}
                  </View>
                );
              })
            )}
          </View>
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
            liveProduct.soluong === 0 && { backgroundColor: "#ccc" },
          ]}
          onPress={() => liveProduct.soluong !== 0 && setModalVisible(true)}
        >
          <Text style={styles.addBtnText}>
            {liveProduct.soluong === 0 ? "Đơn hàng đã hết" : "+ Thêm vào giỏ"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal thanh toán — tách ra CheckoutBottomSheet */}
      <CheckoutBottomSheet
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        product={liveProduct}
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
  reviewSection: { marginTop: 22 },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 10,
  },
  noReviewText: { fontSize: 13, color: "#9ca3af" },
  reviewCard: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  reviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewUser: { fontSize: 14, fontWeight: "700", color: "#111827" },
  reviewDate: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  reviewStars: { color: "#f59e0b", fontSize: 14, letterSpacing: 1 },
  reviewComment: { fontSize: 14, color: "#4b5563", lineHeight: 20 },
  reviewImagesRow: { marginTop: 10, gap: 8 },
  reviewImage: { width: 82, height: 82, borderRadius: 10, backgroundColor: "#e5e7eb" },
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
