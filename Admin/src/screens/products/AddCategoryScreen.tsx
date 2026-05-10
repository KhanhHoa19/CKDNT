import * as ImagePicker from "expo-image-picker";
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
import { useCategories } from "../../context/CategoryContext";

const PRESET_COLORS = [
  "#FFA500",
  "#2C5F4E",
  "#D2691E",
  "#e74c3c",
  "#9b59b6",
  "#3498db",
  "#1abc9c",
  "#f39c12",
  "#e91e63",
  "#607d8b",
];
const PRESET_EMOJIS = [
  "🍔",
  "🍕",
  "🌯",
  "🍜",
  "🍱",
  "🌮",
  "🍣",
  "🍩",
  "🥗",
  "🍗",
  "🥩",
  "🍦",
  "🧆",
  "🥪",
  "🍛",
  "🍲",
  "🧋",
  "☕",
  "🥤",
  "🍰",
];

export default function AddCategoryScreen({ navigation }) {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();

  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("🍽️");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [customColor, setCustomColor] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  const finalColor = customColor.trim().startsWith("#")
    ? customColor.trim()
    : color;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Lỗi", "Cần cấp quyền truy cập ảnh");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleDelete = (cat) => {
    Alert.alert("Xóa hạng mục", `Xóa "${cat.label}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          setDeletingId(cat.id);
          try {
            await deleteCategory(cat.id);
          } catch {
            Alert.alert("Lỗi", "Không thể xóa. Thử lại.");
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setLabel("");
    setEmoji("🍽️");
    setColor(PRESET_COLORS[0]);
    setCustomColor("");
    setImageUri(null);
    setEditingCategory(null);
  };

  const handleSelectToEdit = (cat) => {
    setEditingCategory(cat);
    setLabel(cat.label || "");
    setEmoji(cat.emoji || "🍽️");
    if (cat.color && PRESET_COLORS.includes(cat.color)) {
      setColor(cat.color);
      setCustomColor("");
    } else {
      setColor(PRESET_COLORS[0]);
      setCustomColor(cat.color || "");
    }
    setImageUri(cat.image || null);
  };

  const handleSave = async () => {
    const trimmed = label.trim();
    if (!trimmed) {
      Alert.alert("Lỗi", "Vui lòng nhập tên hạng mục");
      return;
    }
    if (
      categories.some(
        (c) =>
          c.label.toLowerCase() === trimmed.toLowerCase() &&
          c.id !== editingCategory?.id,
      )
    ) {
      Alert.alert("Trùng tên", `"${trimmed}" đã tồn tại.`);
      return;
    }
    setLoading(true);
    try {
      const isRemoteImage =
        typeof imageUri === "string" && imageUri.startsWith("http");
      let image = editingCategory?.image || "";
      if (imageUri) {
        image = isRemoteImage ? imageUri : await uploadImageToCloudinary(imageUri);
      } else {
        image = "";
      }

      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          label: trimmed,
          emoji,
          color: finalColor,
          order: editingCategory.order ?? 0,
          image,
        });
        Alert.alert("Thành công", `Đã cập nhật "${trimmed}"`);
        resetForm();
      } else {
        const nextOrder = categories.length
          ? Math.max(...categories.map((c) => c.order ?? 0)) + 1
          : 1;
        await addCategory({
          label: trimmed,
          emoji,
          color: finalColor,
          order: nextOrder,
          image,
        });
        Alert.alert("Thành công", `Đã thêm "${trimmed}"`, [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch {
      Alert.alert("Lỗi", "Không thể lưu hạng mục.");
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.title}>
            {editingCategory ? "Sửa Hạng Mục" : "Thêm Hạng Mục"}
          </Text>
          <View style={{ width: 70 }} />
        </View>

        <View style={styles.form}>
          {editingCategory && (
            <View style={styles.editingBanner}>
              <Text style={styles.editingBannerText}>
                Đang sửa: {editingCategory.label}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <Text style={styles.cancelEditText}>Hủy sửa</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* PREVIEW */}
          <Text style={styles.sectionTitle}>👁️ Xem trước</Text>
          <View style={[styles.previewCard, { backgroundColor: finalColor }]}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImg} />
            ) : (
              <Text style={styles.previewEmojiLarge}>{emoji}</Text>
            )}
            <View style={styles.previewTextBlock}>
              <Text style={styles.previewEmojiSmall}>{emoji}</Text>
              <Text style={styles.previewLabel} numberOfLines={2}>
                {label.trim().toUpperCase() || "TÊN HẠNG MỤC"}
              </Text>
            </View>
          </View>

          {/* TÊN */}
          <Text style={styles.label}>Tên hạng mục *</Text>
          <TextInput
            style={styles.input}
            placeholder="VD: Sushi, Bún bò..."
            value={label}
            onChangeText={setLabel}
            maxLength={30}
          />
          <Text style={styles.hint}>{label.length}/30</Text>

          {/* ẢNH */}
          <Text style={styles.label}>Ảnh đại diện card</Text>
          <TouchableOpacity style={styles.imgPicker} onPress={pickImage}>
            {imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={styles.imgPreview} />
                <View style={styles.changeImgBtn}>
                  <Text
                    style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}
                  >
                    Đổi ảnh
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.imgPlaceholder}>
                <Text style={{ fontSize: 36 }}>📷</Text>
                <Text style={styles.hint}>Nhấn để chọn ảnh</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* EMOJI */}
          <Text style={styles.label}>Emoji (icon nhỏ phía trên tên)</Text>
          <View style={styles.emojiGrid}>
            {PRESET_EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
                onPress={() => setEmoji(e)}
              >
                <Text style={{ fontSize: 24 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* MÀU */}
          <Text style={styles.label}>Màu nền card</Text>
          <View style={styles.colorGrid}>
            {PRESET_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorDot,
                  { backgroundColor: c },
                  color === c &&
                    !customColor.trim().startsWith("#") &&
                    styles.colorDotActive,
                ]}
                onPress={() => {
                  setColor(c);
                  setCustomColor("");
                }}
              />
            ))}
          </View>
          <TextInput
            style={[styles.input, { marginTop: 8, width: 180 }]}
            placeholder="#RRGGBB tùy chỉnh"
            value={customColor}
            onChangeText={setCustomColor}
            autoCapitalize="characters"
            maxLength={7}
          />

          {/* DANH MỤC HIỆN CÓ */}
          <Text style={[styles.label, { marginTop: 28 }]}>
            Danh mục hiện có ({categories.length})
          </Text>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.existingRow,
                editingCategory?.id === cat.id && styles.existingRowActive,
              ]}
              onPress={() => handleSelectToEdit(cat)}
            >
              {cat.image ? (
                <Image source={{ uri: cat.image }} style={styles.existingImg} />
              ) : (
                <Text style={{ fontSize: 22 }}>{cat.emoji}</Text>
              )}
              <Text style={styles.existingLabel}>{cat.label}</Text>
              <View
                style={[styles.colorSwatch, { backgroundColor: cat.color }]}
              />
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(cat)}
                disabled={deletingId === cat.id}
              >
                {deletingId === cat.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontSize: 14 }}>🗑️</Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          {categories.length === 0 && (
            <Text style={styles.hint}>Chưa có hạng mục nào</Text>
          )}

          {/* LƯU */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>
                {editingCategory ? "💾 Lưu Cập Nhật" : "💾 Lưu Hạng Mục"}
              </Text>
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
  editingBanner: {
    backgroundColor: "#eaf4fd",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#b9dcfb",
    padding: 10,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editingBannerText: { color: "#2c3e50", fontSize: 13, fontWeight: "700" },
  cancelEditText: { color: "#3498db", fontSize: 13, fontWeight: "700" },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7f8c8d",
    marginBottom: 10,
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

  previewCard: {
    borderRadius: 20,
    height: 110,
    overflow: "hidden",
    justifyContent: "center",
    paddingLeft: 24,
    marginBottom: 4,
  },
  previewImg: {
    position: "absolute",
    right: -10,
    bottom: -5,
    width: 140,
    height: 140,
    resizeMode: "contain",
  },
  previewEmojiLarge: {
    position: "absolute",
    right: 10,
    bottom: -8,
    fontSize: 80,
  },
  previewTextBlock: {
    flexDirection: "column",
    alignItems: "flex-start",
    maxWidth: "65%",
  },
  previewEmojiSmall: { fontSize: 24, marginBottom: 4 },
  previewLabel: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },

  imgPicker: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    height: 160,
    overflow: "hidden",
  },
  imgPreview: { width: "100%", height: "100%", resizeMode: "cover" },
  imgPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  changeImgBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },

  emojiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  emojiBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e8e8e8",
  },
  emojiBtnActive: { borderColor: "#3498db", backgroundColor: "#eaf4fd" },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "transparent",
  },
  colorDotActive: { borderColor: "#2c3e50" },

  existingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  existingRowActive: {
    borderWidth: 1.5,
    borderColor: "#3498db",
  },
  existingImg: { width: 36, height: 36, borderRadius: 8 },
  existingLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: "#2c3e50" },
  colorSwatch: { width: 20, height: 20, borderRadius: 10 },
  deleteBtn: {
    backgroundColor: "#e74c3c",
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  btn: {
    backgroundColor: "#27ae60",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 28,
    marginBottom: 40,
  },
  btnDisabled: { backgroundColor: "#95a5a6" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
