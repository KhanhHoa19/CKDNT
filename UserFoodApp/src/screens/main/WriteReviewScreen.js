import * as ImagePicker from "expo-image-picker";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useState } from "react";
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
import uuid from "react-native-uuid";
import { uploadImageToCloudinary } from "../../config/cloudinary";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";

const StarRating = ({ rating, onRate }) => (
  <View style={styles.starsRow}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity key={star} onPress={() => onRate(star)}>
        <Text style={[styles.star, star <= rating && styles.starActive]}>
          ★
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const RATING_LABELS = {
  1: "Rất tệ 😞",
  2: "Tệ 😕",
  3: "Bình thường 😐",
  4: "Tốt 😊",
  5: "Tuyệt vời 🤩",
};

export default function WriteReviewScreen({ navigation, route }) {
  const { order, product } = route.params;
  // product = item trong order.items tương ứng
  const { user, userProfile } = useAuth();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState([]); // [{uri, isUploaded}]
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState("");

  const pickImage = async () => {
    if (images.length >= 3) {
      Alert.alert("Tối đa 3 ảnh");
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, { uri: result.assets[0].uri }]);
    }
  };

  const removeImage = (idx) =>
    setImages((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Thiếu đánh giá", "Vui lòng chọn số sao");
      return;
    }
    if (!comment.trim()) {
      Alert.alert("Thiếu nhận xét", "Vui lòng viết nhận xét");
      return;
    }

    setLoading(true);
    try {
      // Upload ảnh minh chứng
      const uploadedUrls = [];
      for (let i = 0; i < images.length; i++) {
        setUploading(`Đang tải ảnh ${i + 1}/${images.length}...`);
        const url = await uploadImageToCloudinary(images[i].uri);
        uploadedUrls.push(url);
      }

      setUploading("Đang lưu đánh giá...");

      // 1. SỬA CHỖ NÀY: Khai báo hằng số docRef để hứng kết quả trả về từ addDoc
      const docRef = await addDoc(collection(db, "reviews"), {
        reviewId: uuid.v4(),
        productId: product.id,
        orderId: order.id,
        userId: user.uid,
        userName: userProfile?.fullName || "Người dùng",
        rating,
        comment: comment.trim(),
        images: uploadedUrls,
        createdAt: new Date().toISOString(),
        isVisible: true,
      });

      // 2. Gọi Webhook n8n ngay lập tức
      try {
        // LƯU Ý: Nếu muốn chạy thật, hãy đổi /webhook-test/ thành /webhook/ 
        // URL Test dưới đây chỉ dùng khi bạn đang mở màn hình n8n và bấm Execute
        await fetch('https://cornell-unpugilistic-dorsoventrally.ngrok-free.dev/webhook-test/auto-reply-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewDocId: docRef.id, // Bây giờ docRef đã tồn tại
            userName: userProfile?.fullName || "Người dùng",
            rating: rating,
            comment: comment.trim()
          })
        });
        console.log("Đã bắn Webhook sang n8n thành công!");
      } catch (error) {
        console.log("Không thể gọi AI Agent:", error);
      }

      // Cập nhật avgRating và totalReviews trong sanpham
      setUploading("Cập nhật điểm...");
      const reviewsSnap = await getDocs(
        query(collection(db, "reviews"), where("productId", "==", product.id)),
      );
      const allRatings = reviewsSnap.docs.map((d) => d.data().rating);
      const totalReviews = allRatings.length;
      const avgRating = allRatings.reduce((s, r) => s + r, 0) / totalReviews;

      await updateDoc(doc(db, "sanpham", product.id), {
        avgRating: parseFloat(avgRating.toFixed(1)),
        totalReviews,
      });

      Alert.alert("🎉 Cảm ơn bạn!", "Đánh giá của bạn đã được ghi nhận.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi", "Không thể gửi đánh giá. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      setUploading("");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Viết đánh giá</Text>
          <View style={{ width: 30 }} />
        </View>

        <View style={styles.body}>
          {/* Thông tin món ăn */}
          <View style={styles.productCard}>
            {product.hinhanh ? (
              <Image
                source={{ uri: product.hinhanh }}
                style={styles.productImg}
              />
            ) : (
              <View style={[styles.productImg, styles.noImg]}>
                <Text style={{ fontSize: 28 }}>🍽️</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{product.tensp}</Text>
              <Text style={styles.productOrder}>
                Đơn #{order.orderId?.slice(0, 8).toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Chọn sao */}
          <Text style={styles.sectionLabel}>Đánh giá của bạn *</Text>
          <StarRating rating={rating} onRate={setRating} />
          {rating > 0 && (
            <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
          )}

          {/* Nhận xét */}
          <Text style={styles.sectionLabel}>Nhận xét *</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Chia sẻ trải nghiệm của bạn về món ăn này..."
            value={comment}
            onChangeText={setComment}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{comment.length}/500</Text>

          {/* Ảnh minh chứng */}
          <Text style={styles.sectionLabel}>
            Ảnh minh chứng{" "}
            <Text style={styles.optional}>(tuỳ chọn, tối đa 3)</Text>
          </Text>
          <View style={styles.imagesRow}>
            {images.map((img, idx) => (
              <View key={idx} style={styles.imgWrap}>
                <Image source={{ uri: img.uri }} style={styles.reviewImg} />
                <TouchableOpacity
                  style={styles.removeImg}
                  onPress={() => removeImage(idx)}
                >
                  <Text style={{ color: "#fff", fontSize: 12 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 3 && (
              <TouchableOpacity style={styles.addImgBtn} onPress={pickImage}>
                <Text style={{ fontSize: 28, color: "#aaa" }}>+</Text>
                <Text style={styles.addImgText}>Thêm ảnh</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Nút gửi */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (loading || rating === 0) && { opacity: 0.6 },
            ]}
            onPress={handleSubmit}
            disabled={loading || rating === 0}
          >
            {loading ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <ActivityIndicator color="#fff" />
                <Text style={styles.submitBtnText}>{uploading}</Text>
              </View>
            ) : (
              <Text style={styles.submitBtnText}>⭐ Gửi đánh giá</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    backgroundColor: "#FF6B35",
    paddingTop: 55,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  back: { fontSize: 22, color: "#fff", fontWeight: "bold" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  body: { padding: 20 },

  // Sản phẩm
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
    elevation: 2,
  },
  productImg: { width: 64, height: 64, borderRadius: 12 },
  noImg: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  productName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  productOrder: { fontSize: 12, color: "#aaa" },

  // Stars
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 10,
    marginTop: 16,
  },
  optional: { fontSize: 12, fontWeight: "400", color: "#aaa" },
  starsRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  star: { fontSize: 40, color: "#ddd" },
  starActive: { color: "#f39c12" },
  ratingLabel: {
    fontSize: 14,
    color: "#f39c12",
    fontWeight: "600",
    marginBottom: 4,
  },

  // Comment
  commentInput: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#eee",
    minHeight: 120,
    lineHeight: 22,
  },
  charCount: { fontSize: 11, color: "#aaa", textAlign: "right", marginTop: 4 },

  // Images
  imagesRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  imgWrap: { position: "relative" },
  reviewImg: { width: 80, height: 80, borderRadius: 12 },
  removeImg: {
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
  addImgBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  addImgText: { fontSize: 10, color: "#aaa", marginTop: 2 },

  // Submit
  submitBtn: {
    backgroundColor: "#FF6B35",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginTop: 28,
    marginBottom: 40,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
