import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Switch,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../config/firebase";

export default function CouponManagementScreen() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form states
  const [currentId, setCurrentId] = useState("");
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("fixed"); // "percent" or "fixed"
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderValue, setMinOrderValue] = useState("");
  const [minItems, setMinItems] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [applicableProductsStr, setApplicableProductsStr] = useState("");
  
  // Expiration
  const [expirationDateStr, setExpirationDateStr] = useState(""); // YYYY-MM-DD

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "magiamgia"));
      const list = [];
      const now = new Date();

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let isExpired = data.isExpired || false;
        
        // Auto check expiration
        if (data.expirationDate) {
          const expDate = new Date(data.expirationDate);
          if (now > expDate && !isExpired) {
            isExpired = true;
            // Background update
            updateDoc(doc(db, "magiamgia", docSnap.id), { isExpired: true }).catch(console.error);
          }
        }

        list.push({ id: docSnap.id, ...data, isExpired });
      });

      setCoupons(list);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể tải danh sách mã giảm giá");
      console.error(error);
    }
    setLoading(false);
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId("");
    setCode("");
    setDiscountType("fixed");
    setDiscountValue("");
    setMinOrderValue("");
    setMinItems("");
    setUsageLimit("");
    setIsActive(true);
    setApplicableProductsStr("");
    setExpirationDateStr("");
    setModalVisible(true);
  };

  const openEditModal = (coupon) => {
    setIsEditing(true);
    setCurrentId(coupon.id);
    setCode(coupon.code || "");
    setDiscountType(coupon.discountType || "fixed");
    setDiscountValue(coupon.discountValue?.toString() || "");
    setMinOrderValue(coupon.minOrderValue?.toString() || "");
    setMinItems(coupon.minItems?.toString() || "");
    setUsageLimit(coupon.usageLimit?.toString() || "");
    setIsActive(coupon.isActive);
    setApplicableProductsStr(coupon.applicableProducts ? coupon.applicableProducts.join(", ") : "");
    
    if (coupon.expirationDate) {
      const d = new Date(coupon.expirationDate);
      const iso = d.toISOString().split("T")[0]; // YYYY-MM-DD
      setExpirationDateStr(iso);
    } else {
      setExpirationDateStr("");
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!code || !discountValue) {
      Alert.alert("Lỗi", "Vui lòng nhập Mã và Giá trị giảm");
      return;
    }

    let expDateISO = null;
    let isExpired = false;
    if (expirationDateStr) {
        // Validate date string basic YYYY-MM-DD
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(expirationDateStr)) {
            Alert.alert("Lỗi", "Ngày hết hạn phải theo định dạng YYYY-MM-DD");
            return;
        }
        const d = new Date(expirationDateStr);
        d.setHours(23, 59, 59, 999);
        expDateISO = d.toISOString();
        if (new Date() > d) {
            isExpired = true;
        }
    }

    let applicableProducts = [];
    if (applicableProductsStr.trim()) {
      applicableProducts = applicableProductsStr.split(",").map(s => s.trim()).filter(s => s !== "");
    }

    const payload = {
      code: code.toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      minOrderValue: minOrderValue ? Number(minOrderValue) : 0,
      minItems: minItems ? Number(minItems) : 0,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      applicableProducts,
      isActive,
      isExpired,
      expirationDate: expDateISO,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (isEditing) {
        await updateDoc(doc(db, "magiamgia", currentId), payload);
        Alert.alert("Thành công", "Đã cập nhật mã giảm giá");
      } else {
        payload.usageCount = 0;
        payload.usedBy = []; // Khởi tạo danh sách user đã dùng
        payload.createdAt = new Date().toISOString();
        await addDoc(collection(db, "magiamgia"), payload);
        Alert.alert("Thành công", "Đã thêm mã giảm giá mới");
      }
      setModalVisible(false);
      fetchCoupons();
    } catch (error) {
      Alert.alert("Lỗi", "Không thể lưu mã giảm giá");
      console.error(error);
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa mã này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "magiamgia", id));
            Alert.alert("Thành công", "Đã xóa mã giảm giá");
            fetchCoupons();
          } catch (error) {
            Alert.alert("Lỗi", "Không thể xóa");
          }
        },
      },
    ]);
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, "magiamgia", id), { isActive: !currentStatus });
      fetchCoupons();
    } catch (error) {
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái");
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat("vi-VN").format(val) + "đ";

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.codeText}>{item.code}</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {item.isExpired ? (
            <View style={[styles.badge, { backgroundColor: "#e74c3c" }]}>
              <Text style={styles.badgeText}>Expired</Text>
            </View>
          ) : !item.isActive ? (
            <View style={[styles.badge, { backgroundColor: "#95a5a6" }]}>
              <Text style={styles.badgeText}>Disabled</Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: "#2ecc71" }]}>
              <Text style={styles.badgeText}>Active</Text>
            </View>
          )}
          <Switch
            value={item.isActive}
            onValueChange={() => toggleStatus(item.id, item.isActive)}
            style={{ marginLeft: 10, transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.infoText}>
          Giảm: <Text style={styles.boldText}>
            {item.discountType === "percent" ? `${item.discountValue}%` : formatCurrency(item.discountValue)}
          </Text>
        </Text>
        <Text style={styles.infoText}>
          Đơn tối thiểu: <Text style={styles.boldText}>{formatCurrency(item.minOrderValue || 0)}</Text>
        </Text>
        <Text style={styles.infoText}>
          Lượt sử dụng: <Text style={styles.boldText}>{item.usageCount || 0} / {item.usageLimit || "∞"}</Text>
        </Text>
        {item.expirationDate && (
          <Text style={styles.infoText}>
            Hết hạn: <Text style={styles.boldText}>{new Date(item.expirationDate).toLocaleDateString()}</Text>
          </Text>
        )}
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
          <Text style={styles.btnText}>✏️ Sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
          <Text style={styles.btnText}>🗑️ Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý Mã giảm giá</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Text style={styles.addBtnText}>+ Thêm mới</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={coupons}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshing={loading}
        onRefresh={fetchCoupons}
      />

      {/* Modal Add/Edit */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isEditing ? "Sửa Mã giảm giá" : "Thêm Mã giảm giá"}</Text>
            
            <ScrollView>
              <Text style={styles.label}>Mã (Code) *</Text>
              <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="VD: TET2026" autoCapitalize="characters" />

              <Text style={styles.label}>Loại giảm giá</Text>
              <View style={styles.radioRow}>
                <TouchableOpacity 
                  style={[styles.radioBtn, discountType === "fixed" && styles.radioActive]} 
                  onPress={() => setDiscountType("fixed")}
                >
                  <Text style={discountType === "fixed" ? styles.radioTextActive : styles.radioText}>Tiền mặt</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.radioBtn, discountType === "percent" && styles.radioActive]} 
                  onPress={() => setDiscountType("percent")}
                >
                  <Text style={discountType === "percent" ? styles.radioTextActive : styles.radioText}>Phần trăm</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Giá trị giảm *</Text>
              <TextInput style={styles.input} value={discountValue} onChangeText={setDiscountValue} keyboardType="numeric" placeholder="VD: 50000 hoặc 10" />

              <Text style={styles.label}>Đơn hàng tối thiểu</Text>
              <TextInput style={styles.input} value={minOrderValue} onChangeText={setMinOrderValue} keyboardType="numeric" placeholder="VD: 150000" />

              <Text style={styles.label}>Số lượng sản phẩm tối thiểu</Text>
              <TextInput style={styles.input} value={minItems} onChangeText={setMinItems} keyboardType="numeric" placeholder="VD: 2" />

              <Text style={styles.label}>Giới hạn số lần sử dụng</Text>
              <TextInput style={styles.input} value={usageLimit} onChangeText={setUsageLimit} keyboardType="numeric" placeholder="VD: 100" />

              <Text style={styles.label}>Áp dụng cho sản phẩm (ID cách nhau dấu phẩy)</Text>
              <TextInput style={styles.input} value={applicableProductsStr} onChangeText={setApplicableProductsStr} placeholder="Để trống = Áp dụng tất cả" />

              <Text style={styles.label}>Ngày hết hạn (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} value={expirationDateStr} onChangeText={setExpirationDateStr} placeholder="VD: 2026-12-31" />

              <View style={[styles.radioRow, { justifyContent: "space-between", marginTop: 10 }]}>
                <Text style={styles.label}>Kích hoạt ngay</Text>
                <Switch value={isActive} onValueChange={setIsActive} />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f6fa" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#2c3e50" },
  addBtn: { backgroundColor: "#3498db", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: "#fff", fontWeight: "bold" },
  
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  codeText: { fontSize: 18, fontWeight: "bold", color: "#e67e22", letterSpacing: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold", textTransform: "uppercase" },
  
  cardBody: { marginBottom: 12 },
  infoText: { fontSize: 14, color: "#7f8c8d", marginBottom: 4 },
  boldText: { fontWeight: "bold", color: "#34495e" },
  
  cardFooter: { flexDirection: "row", justifyContent: "flex-end", borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 12 },
  editBtn: { marginRight: 16 },
  deleteBtn: {},
  btnText: { fontSize: 14, color: "#34495e" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "85%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 16, textAlign: "center", color: "#2c3e50" },
  label: { fontSize: 14, fontWeight: "bold", color: "#34495e", marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: "#bdc3c7", borderRadius: 8, padding: 12, fontSize: 14, color: "#2c3e50" },
  
  radioRow: { flexDirection: "row", alignItems: "center" },
  radioBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: "#bdc3c7", alignItems: "center", borderRadius: 8, marginHorizontal: 4 },
  radioActive: { backgroundColor: "#3498db", borderColor: "#3498db" },
  radioText: { color: "#7f8c8d" },
  radioTextActive: { color: "#fff", fontWeight: "bold" },

  modalActions: { flexDirection: "row", marginTop: 20 },
  cancelBtn: { flex: 1, padding: 16, backgroundColor: "#ecf0f1", borderRadius: 8, marginRight: 8, alignItems: "center" },
  cancelBtnText: { color: "#7f8c8d", fontWeight: "bold" },
  saveBtn: { flex: 1, padding: 16, backgroundColor: "#3498db", borderRadius: 8, marginLeft: 8, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "bold" },
});
