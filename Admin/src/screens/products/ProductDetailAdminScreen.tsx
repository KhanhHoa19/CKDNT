import { doc, updateDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { db } from "../../config/firebase";

const { width: SCREEN_W } = Dimensions.get("window");

export default function ProductDetailAdminScreen({ navigation, route }) {
  const { product } = route.params;

  // Các trường có thể chỉnh nhanh
  const [gia, setGia] = useState(String(product.gia || ""));
  const [mota, setMota] = useState(product.mota || "");
  const [soluong, setSoluong] = useState(product.soluong || 0);
  const [loading, setLoading] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  // Ghép ảnh chính + ảnh phụ
  const allImages = [product.hinhanh, ...(product.images || [])].filter(
    Boolean,
  );

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(p);

  const handleQuickSave = async () => {
    if (isNaN(Number(gia)) || Number(gia) <= 0) {
      Alert.alert("Lỗi", "Giá không hợp lệ");
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, "sanpham", product.id), {
        gia: Number(gia),
        mota: mota.trim(),
        soluong,
      });
      Alert.alert(
        "✅ Cập nhật thành công",
        "Thay đổi đã được lưu và hiển thị ngay cho user.",
      );
    } catch {
      Alert.alert("Lỗi", "Không thể cập nhật. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* ── SLIDER ẢNH ── */}
        {allImages.length > 0 ? (
          <View>
            <FlatList
              data={allImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(
                  e.nativeEvent.contentOffset.x / SCREEN_W,
                );
                setActiveImg(idx);
              }}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.sliderImg} />
              )}
            />
            {/* Thumbnails */}
            {allImages.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbRow}
              >
                {allImages.map((img, i) => (
                  <Image
                    key={i}
                    source={{ uri: img }}
                    style={[
                      styles.thumb,
                      i === activeImg && styles.thumbActive,
                    ]}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        ) : (
          <View style={styles.noImg}>
            <Text style={{ fontSize: 80 }}>📦</Text>
          </View>
        )}

        {/* ── BACK + EDIT FULL ── */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editFullBtn}
          onPress={() => navigation.navigate("EditProduct", { product })}
        >
          <Text style={styles.editFullText}>✏️ Sửa đầy đủ</Text>
        </TouchableOpacity>

        <View style={styles.body}>
          {/* Badge loại */}
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{product.loaisp}</Text>
            </View>
            <Text style={styles.idText}>
              ID: {product.idsanpham?.slice(0, 8)}...
            </Text>
          </View>

          {/* Tên */}
          <Text style={styles.name}>{product.tensp}</Text>

          {/* Size */}
          {product.sizes?.length > 0 && (
            <View style={styles.sizeRow}>
              {product.sizes.map((s: any) => (
                <View key={s.id} style={styles.sizeChip}>
                  <Text style={styles.sizeChipText}>
                    {s.id} · {s.label}
                    {s.extraPrice > 0 ? ` +${s.extraPrice / 1000}k` : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* ── CHỈNH NHANH ── */}
          <View style={styles.quickEditCard}>
            <Text style={styles.quickEditTitle}>⚡ Chỉnh nhanh</Text>

            {/* Giá */}
            <Text style={styles.fieldLabel}>Giá (VNĐ)</Text>
            <TextInput
              style={styles.input}
              value={gia}
              onChangeText={setGia}
              keyboardType="numeric"
            />

            {/* Số lượng */}
            <Text style={styles.fieldLabel}>Số lượng tồn kho</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setSoluong((v) => Math.max(0, v - 1))}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.qtyInput}
                value={String(soluong)}
                onChangeText={(v) =>
                  setSoluong(isNaN(Number(v)) ? soluong : Number(v))
                }
                keyboardType="numeric"
                textAlign="center"
              />
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setSoluong((v) => v + 1)}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Mô tả */}
            <Text style={styles.fieldLabel}>Mô tả</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={mota}
              onChangeText={setMota}
              multiline
              placeholder="Nhập mô tả món ăn..."
              textAlignVertical="top"
            />

            {/* Nút lưu */}
            <TouchableOpacity
              style={[styles.saveBtn, loading && { opacity: 0.7 }]}
              onPress={handleQuickSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>💾 Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Thông tin chỉ đọc */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>📋 Thông tin hiện tại</Text>
            {[
              { label: "Giá gốc", value: formatPrice(product.gia) },
              { label: "Loại", value: product.loaisp },
              { label: "Tồn kho", value: `${product.soluong ?? "—"} phần` },
              {
                label: "Số ảnh phụ",
                value: `${product.images?.length || 0} ảnh`,
              },
            ].map((row) => (
              <View key={row.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },

  // Slider
  sliderImg: { width: SCREEN_W, height: 260, resizeMode: "cover" },
  thumbRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    marginRight: 8,
    opacity: 0.55,
  },
  thumbActive: { opacity: 1, borderWidth: 2, borderColor: "#3498db" },
  noImg: {
    height: 260,
    backgroundColor: "#ecf0f1",
    justifyContent: "center",
    alignItems: "center",
  },

  // Buttons trên ảnh
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
  editFullBtn: {
    position: "absolute",
    top: 50,
    right: 16,
    backgroundColor: "#2c3e50",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
  },
  editFullText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  body: { padding: 16 },

  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badge: {
    backgroundColor: "#d6eaf8",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { color: "#2980b9", fontWeight: "700", fontSize: 13 },
  idText: { fontSize: 11, color: "#bdc3c7", fontStyle: "italic" },
  name: { fontSize: 22, fontWeight: "800", color: "#2c3e50", marginBottom: 10 },

  // Size chips
  sizeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  sizeChip: {
    backgroundColor: "#eaf4fd",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  sizeChipText: { fontSize: 12, color: "#2980b9", fontWeight: "600" },

  // Quick edit card
  quickEditCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },
  quickEditTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  inputMulti: { minHeight: 80, textAlignVertical: "top" },

  // Qty row
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    alignSelf: "flex-start",
  },
  qtyBtn: {
    width: 44,
    height: 44,
    backgroundColor: "#f0f2f5",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  qtyBtnText: { fontSize: 22, color: "#2c3e50", fontWeight: "bold" },
  qtyInput: {
    width: 60,
    height: 44,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    fontSize: 16,
    fontWeight: "700",
    color: "#2c3e50",
    textAlign: "center",
  },

  saveBtn: {
    backgroundColor: "#3498db",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "bold" },

  // Info card
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  infoLabel: { fontSize: 13, color: "#888" },
  infoValue: { fontSize: 13, fontWeight: "600", color: "#2c3e50" },
});
