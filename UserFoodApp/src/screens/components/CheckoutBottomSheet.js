import { useState } from "react";
import {
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useCart } from "../../context/CartContext";

/**
 * CheckoutBottomSheet
 * Props:
 *   visible        — boolean, hiển thị modal
 *   onClose        — function, đóng modal
 *   product        — object, sản phẩm đang xem
 *   selectedSize   — object | null
 *   finalPrice     — number, giá sau khi tính size
 *   formatPrice    — function(number) => string
 *   defaultAddress — string, địa chỉ mặc định từ userProfile
 *   onSuccess      — function({ qty, paymentMethod, address, note, stripePaymentId? })
 *                    callback khi đặt hàng thành công
 */
export default function CheckoutBottomSheet({
  visible,
  onClose,
  product,
  selectedSize,
  finalPrice,
  formatPrice,
  defaultAddress = "",
  onSuccess,
}) {
  const { addToCart } = useCart();

  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);

  const allImages = [product.hinhanh, ...(product.images || [])].filter(
    Boolean,
  );

  // ── Xử lý thêm vào giỏ ──
  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      addToCart({
        ...product,
        gia: finalPrice,
        selectedSize: selectedSize?.id || null,
        note,
      });
    }
    onClose();
    onSuccess?.({ qty, note });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {/* Overlay bấm ra ngoài để đóng */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header: ảnh + tên + size + giá */}
          <View style={styles.sheetHeader}>
            {allImages[0] ? (
              <Image source={{ uri: allImages[0] }} style={styles.sheetImg} />
            ) : (
              <View style={[styles.sheetImg, styles.sheetImgPlaceholder]}>
                <Text style={{ fontSize: 28 }}>🍽️</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetName}>{product.tensp}</Text>
              {selectedSize && (
                <Text style={styles.sheetSize}>Size: {selectedSize.label}</Text>
              )}
              <Text style={styles.sheetPrice}>
                {formatPrice(finalPrice * qty)}
              </Text>
            </View>
          </View>

          {/* Số lượng */}
          <Text style={styles.sectionLabel}>Số lượng</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQty((v) => Math.max(1, v - 1))}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{qty}</Text>
            <TouchableOpacity
              style={[
                styles.qtyBtn,
                qty >= (product.soluong ?? Infinity) && styles.qtyBtnDisabled,
              ]}
              onPress={() => {
                if (qty < (product.soluong ?? Infinity)) setQty((v) => v + 1);
              }}
              disabled={qty >= (product.soluong ?? Infinity)}
            >
              <Text
                style={[
                  styles.qtyBtnText,
                  qty >= (product.soluong ?? Infinity) && { color: "#ccc" },
                ]}
              >
                +
              </Text>
            </TouchableOpacity>
          </View>

          {/* Lời nhắn */}
          <Text style={styles.sectionLabel}>Lời nhắn cho quán</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.inputIcon}>💬</Text>
            <TextInput
              style={[styles.input, { minHeight: 60 }]}
              value={note}
              onChangeText={setNote}
              multiline
            />
          </View>

          {/* Tổng cộng */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>
              {formatPrice(finalPrice * qty)}
            </Text>
          </View>

          {/* Nút xác nhận */}
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleAddToCart}
          >
            <Text style={styles.confirmBtnText}>
              🛒 Thêm vào giỏ hàng
            </Text>
          </TouchableOpacity>
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "88%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 14,
  },
  sheetImg: { width: 64, height: 64, borderRadius: 14 },
  sheetImgPlaceholder: {
    backgroundColor: "#FFF0E8",
    justifyContent: "center",
    alignItems: "center",
  },
  sheetName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  sheetSize: { fontSize: 12, color: "#aaa", marginBottom: 2 },
  sheetPrice: { fontSize: 18, fontWeight: "800", color: "#FF6B35" },

  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 10,
    marginTop: 16,
  },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBtnDisabled: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8f8f8",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  qtyBtnText: { fontSize: 20, color: "#333", fontWeight: "bold" },
  qtyValue: { marginHorizontal: 20, fontSize: 18, fontWeight: "700" },

  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#eee",
    marginBottom: 8,
  },
  paymentRowActive: { borderColor: "#FF6B35", backgroundColor: "#FFF5F0" },
  paymentIcon: { fontSize: 22, marginRight: 12 },
  paymentLabel: { flex: 1, fontSize: 14, color: "#555" },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: { borderColor: "#FF6B35" },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF6B35",
  },

  cardFieldWrap: {
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: "#FFF5F0",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#FF6B35",
  },
  cardFieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF6B35",
    marginBottom: 10,
  },
  cardField: { width: "100%", height: 50 },
  cardHint: { fontSize: 11, color: "#aaa", marginTop: 8, textAlign: "center" },

  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f9f9f9",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#eee",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputIcon: { fontSize: 18, marginRight: 8, marginTop: 2 },
  input: { flex: 1, fontSize: 14, color: "#1a1a1a", lineHeight: 20 },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF5F0",
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
  },
  totalLabel: { fontSize: 15, fontWeight: "600", color: "#555" },
  totalValue: { fontSize: 20, fontWeight: "800", color: "#FF6B35" },

  confirmBtn: {
    backgroundColor: "#FF6B35",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginTop: 12,
  },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
