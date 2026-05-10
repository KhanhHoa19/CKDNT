import * as ImagePicker from "expo-image-picker";
import { doc, updateDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { uploadImageToCloudinary } from "../../config/cloudinary";
import { db } from "../../config/firebase";
import { useCategories } from "../../context/CategoryContext";

const ALL_SIZES = [
  { id: "S", label: "Nhỏ", extraPrice: 0 },
  { id: "M", label: "Vừa", extraPrice: 10000 },
  { id: "L", label: "Lớn", extraPrice: 20000 },
];

export default function EditProductScreen({ navigation, route }) {
  const { product } = route.params;
  const { categories } = useCategories();

  const [tensp, setTensp] = useState(product.tensp || "");
  const [loaisp, setLoaisp] = useState(product.loaisp || "");
  const [gia, setGia] = useState(String(product.gia || ""));
  const [mota, setMota] = useState(product.mota || "");
  const [soluong, setSoluong] = useState(product.soluong || 1);

  // Ảnh chính
  const [newMainUri, setNewMainUri] = useState(null);
  const [currentMain, setCurrentMain] = useState(product.hinhanh || "");

  // Ảnh phụ — phân biệt ảnh cũ (url string) vs ảnh mới (uri local)
  const [subImages, setSubImages] = useState(
    (product.images || []).map((url) => ({ uri: url, isNew: false })),
  );

  // Size
  const [sizes, setSizes] = useState(
    ALL_SIZES.map((s) => ({
      ...s,
      enabled: (product.sizes || []).some((ps) => ps.id === s.id),
    })),
  );

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState("");

  const pickMainImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) setNewMainUri(result.assets[0].uri);
  };

  const pickSubImage = async () => {
    if (subImages.length >= 4) {
      Alert.alert("Tối đa 4 ảnh phụ");
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setSubImages((prev) => [
        ...prev,
        { uri: result.assets[0].uri, isNew: true },
      ]);
    }
  };

  const removeSubImage = (idx) =>
    setSubImages((prev) => prev.filter((_, i) => i !== idx));

  const toggleSize = (id) =>
    setSizes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    );

  const handleUpdate = async () => {
    if (!tensp.trim() || !loaisp || !gia.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
      return;
    }
    if (isNaN(Number(gia)) || Number(gia) <= 0) {
      Alert.alert("Lỗi", "Giá không hợp lệ");
      return;
    }
    if (isNaN(Number(soluong)) || Number(soluong) < 0) {
      Alert.alert("Lỗi", "Số lượng tồn kho phải từ 0 trở lên");
      return;
    }

    setLoading(true);
    let hinhanh = currentMain;
    let images = [];

    try {
      // Upload ảnh chính mới nếu có
      if (newMainUri) {
        setUploading("Đang tải ảnh chính...");
        hinhanh = await uploadImageToCloudinary(newMainUri);
      }

      // Xử lý ảnh phụ: giữ url cũ, upload ảnh mới
      for (let i = 0; i < subImages.length; i++) {
        const img = subImages[i];
        if (!img.isNew) {
          images.push(img.uri); // url cũ giữ nguyên
        } else {
          setUploading(`Đang tải ảnh phụ ${i + 1}...`);
          const url = await uploadImageToCloudinary(img.uri);
          images.push(url);
        }
      }

      setUploading("Đang lưu...");
      await updateDoc(doc(db, "sanpham", product.id), {
        tensp: tensp.trim(),
        loaisp,
        gia: Number(gia),
        mota: mota.trim(),
        soluong,
        hinhanh,
        images,
        sizes: sizes
          .filter((s) => s.enabled)
          .map((s) => ({
            id: s.id,
            label: s.label,
            extraPrice: s.extraPrice,
          })),
      });

      Alert.alert("Thành công", "Cập nhật sản phẩm thành công!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert("Lỗi", "Không thể cập nhật.");
    } finally {
      setLoading(false);
      setUploading("");
    }
  };

  const displayMain = newMainUri || currentMain;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Quay lại</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Sửa Sản Phẩm</Text>
          <View style={{ width: 70 }} />
        </View>

        <View style={styles.form}>
          <Text style={styles.idText}>ID: {product.idsanpham}</Text>

          {/* ── ẢNH CHÍNH ── */}
          <Text style={styles.label}>Ảnh chính</Text>
          <TouchableOpacity
            style={styles.mainImgPicker}
            onPress={pickMainImage}
          >
            {displayMain ? (
              <Image
                source={{ uri: displayMain }}
                style={styles.mainImgPreview}
              />
            ) : (
              <View style={styles.mainImgPlaceholder}>
                <Text style={{ fontSize: 44 }}>📷</Text>
                <Text style={styles.imgHint}>Nhấn để chọn ảnh chính</Text>
              </View>
            )}
            {displayMain && (
              <View style={styles.changeImgBtn}>
                <Text
                  style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}
                >
                  {newMainUri ? "✅ Ảnh mới" : "Đổi ảnh"}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ── ẢNH PHỤ ── */}
          <Text style={styles.label}>Ảnh phụ ({subImages.length}/4)</Text>
          <View style={styles.subImgRow}>
            {subImages.map((img, idx) => (
              <View key={idx} style={styles.subImgWrap}>
                <Image source={{ uri: img.uri }} style={styles.subImg} />
                {img.isNew && (
                  <View style={styles.newBadge}>
                    <Text style={{ color: "#fff", fontSize: 9 }}>MỚI</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removeImgBtn}
                  onPress={() => removeSubImage(idx)}
                >
                  <Text style={{ color: "#fff", fontSize: 12 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {subImages.length < 4 && (
              <TouchableOpacity
                style={styles.addSubImgBtn}
                onPress={pickSubImage}
              >
                <Text style={{ fontSize: 28, color: "#aaa" }}>+</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── TÊN ── */}
          <Text style={styles.label}>Tên sản phẩm *</Text>
          <TextInput
            style={styles.input}
            value={tensp}
            onChangeText={setTensp}
          />

          {/* ── MÔ TẢ ── */}
          <Text style={styles.label}>Mô tả món ăn</Text>
          <TextInput
            style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
            value={mota}
            onChangeText={setMota}
            multiline
            placeholder="Mô tả nguyên liệu, hương vị..."
          />

          {/* ── LOẠI (đồng bộ danh mục Firestore / AddProduct) ── */}
          <Text style={styles.label}>Loại món ăn *</Text>
          {categories.length === 0 ? (
            <Text style={styles.hint}>
              Chưa có hạng mục nào. Hãy thêm hạng mục trước.
            </Text>
          ) : (
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    loaisp === cat.label && styles.categoryCardActive,
                  ]}
                  onPress={() => setLoaisp(cat.label)}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      loaisp === cat.label && styles.categoryLabelActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── GIÁ ── */}
          <Text style={styles.label}>Giá gốc (VNĐ) *</Text>
          <TextInput
            style={styles.input}
            value={gia}
            onChangeText={setGia}
            keyboardType="numeric"
          />

          {/* ── SIZE ── */}
          <Text style={styles.label}>Size có sẵn</Text>
          <View style={styles.sizeRow}>
            {sizes.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.sizeCard, s.enabled && styles.sizeCardActive]}
                onPress={() => toggleSize(s.id)}
              >
                <Text style={[styles.sizeId, s.enabled && { color: "#fff" }]}>
                  {s.id}
                </Text>
                <Text
                  style={[styles.sizeLabel, s.enabled && { color: "#fff" }]}
                >
                  {s.label}
                </Text>
                <Text
                  style={[styles.sizeExtra, s.enabled && { color: "#ffe" }]}
                >
                  {s.extraPrice > 0 ? `+${s.extraPrice / 1000}k` : "Gốc"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── SỐ LƯỢNG ── */}
          <Text style={styles.label}>Số lượng tồn kho</Text>
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
              onChangeText={(value) => {
                const onlyDigits = value.replace(/[^0-9]/g, "");
                if (!onlyDigits) {
                  setSoluong(0);
                  return;
                }
                setSoluong(Number(onlyDigits));
              }}
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

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>{uploading}</Text>
              </View>
            ) : (
              <Text style={styles.btnText}>💾 Cập Nhật</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  header: {
    backgroundColor: "#2c3e50",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  back: { color: "#3498db", fontSize: 15 },
  title: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  form: { padding: 20 },
  idText: {
    fontSize: 12,
    color: "#95a5a6",
    marginBottom: 6,
    fontStyle: "italic",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 8,
    marginTop: 18,
  },
  hint: { fontSize: 12, color: "#aaa", marginTop: 4 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  mainImgPicker: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    overflow: "hidden",
    height: 200,
  },
  mainImgPreview: { width: "100%", height: "100%", resizeMode: "cover" },
  mainImgPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imgHint: { color: "#aaa", marginTop: 8, fontSize: 13 },
  changeImgBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },

  subImgRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  subImgWrap: { position: "relative" },
  subImg: { width: 72, height: 72, borderRadius: 10 },
  newBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#27ae60",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  removeImgBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#e74c3c",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  addSubImgBtn: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  categoryCard: {
    width: "47%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e8e8e8",
  },
  categoryCardActive: { borderColor: "#e67e22", backgroundColor: "#fef5ec" },
  categoryEmoji: { fontSize: 30, marginBottom: 4 },
  categoryLabel: { fontSize: 13, fontWeight: "600", color: "#7f8c8d" },
  categoryLabelActive: { color: "#e67e22" },

  sizeRow: { flexDirection: "row", gap: 10 },
  sizeCard: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e8e8e8",
  },
  sizeCardActive: { backgroundColor: "#e67e22", borderColor: "#e67e22" },
  sizeId: { fontSize: 18, fontWeight: "900", color: "#555" },
  sizeLabel: { fontSize: 11, color: "#888", marginTop: 2 },
  sizeExtra: { fontSize: 11, color: "#aaa", marginTop: 2 },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    alignSelf: "flex-start",
    overflow: "hidden",
  },
  qtyBtn: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f2f5",
  },
  qtyBtnText: { fontSize: 22, color: "#2c3e50", fontWeight: "bold" },
  qtyInput: {
    width: 70,
    height: 48,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
  },

  btn: {
    backgroundColor: "#e67e22",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 28,
    marginBottom: 40,
  },
  btnDisabled: { backgroundColor: "#95a5a6" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
