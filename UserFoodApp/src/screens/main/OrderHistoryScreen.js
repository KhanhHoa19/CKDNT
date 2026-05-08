import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import uuid from "react-native-uuid";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";

const STATUS_CONFIG = {
  pending: { label: "Chờ xác nhận", color: "#e67e22", bg: "#FEF5E7", icon: "⏳" },
  confirmed: { label: "Đã xác nhận", color: "#3498db", bg: "#EBF5FB", icon: "✅" },
  shipping: { label: "Đang giao", color: "#9b59b6", bg: "#F5EEF8", icon: "🚚" },
  done: { label: "Hoàn thành", color: "#27ae60", bg: "#EAFAF1", icon: "🎉" },
  cancelled: { label: "Đã hủy", color: "#e74c3c", bg: "#FDEDEC", icon: "❌" },
};

const FILTER_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "pending", label: "Chờ duyệt" },
  { key: "confirmed", label: "Đã duyệt" },
  { key: "shipping", label: "Đang giao" },
  { key: "done", label: "Hoàn thành" },
  { key: "refund", label: "Hoàn tiền" },
];

const PROGRESS_STEPS = [
  { key: "pending", label: "Chờ\nxác nhận" },
  { key: "confirmed", label: "Đã\nxác nhận" },
  { key: "shipping", label: "Đang\ngiao" },
  { key: "done", label: "Hoàn\nthành" },
];

const REFUND_REASONS = [
  "Đặt nhầm món",
  "Món ăn không đúng mô tả",
  "Thời gian chờ quá lâu",
  "Muốn thay đổi đơn hàng",
  "Lý do khác",
];

export default function OrderHistoryScreen({ navigation }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [refundRequests, setRefundRequests] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [reviewedIds, setReviewedIds] = useState(new Set());

  // Refund modal states
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Lấy đơn hàng realtime
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "orders"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // Lấy danh sách yêu cầu hoàn tiền của user
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "refund_requests"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setRefundRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  // Lấy danh sách orderId đã review
  useEffect(() => {
    if (!user) return;
    const fetchReviewed = async () => {
      const snap = await getDocs(
        query(collection(db, "reviews"), where("userId", "==", user.uid)),
      );
      const ids = new Set(snap.docs.map((d) => d.data().orderId));
      setReviewedIds(ids);
    };
    fetchReviewed();
  }, [user, orders]);

  // Lọc theo tab
  useEffect(() => {
    if (activeTab === "all") {
      setFiltered(orders);
    } else if (activeTab === "refund") {
      // Tab hoàn tiền: chỉ hiện những yêu cầu đã được xác nhận thành công
      const approvedRefunds = refundRequests.filter((r) => r.status === "refunded");
      const approvedOrderIds = new Set(approvedRefunds.map((r) => r.orderId));
      setFiltered(orders.filter((o) => approvedOrderIds.has(o.orderId)));
    } else {
      setFiltered(orders.filter((o) => o.status === activeTab));
    }
  }, [orders, activeTab, refundRequests]);

  const formatPrice = (p) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(p);

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  // Kiểm tra xem đơn đã có yêu cầu hoàn tiền chưa
  const getRefundRequest = (orderId) =>
    refundRequests.find((r) => r.orderId === orderId);

  // Mở modal hoàn tiền
  const openRefundModal = (order) => {
    setSelectedOrder(order);
    setRefundReason("");
    setBankAccount("");
    setBankName("");
    setAccountHolder("");
    setRefundModalVisible(true);
  };

  // Gửi yêu cầu hoàn tiền
  const submitRefundRequest = async () => {
    if (!refundReason) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn lý do hoàn tiền.");
      return;
    }
    if (!bankAccount.trim() || !bankName.trim() || !accountHolder.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đầy đủ thông tin tài khoản nhận hoàn tiền.");
      return;
    }

    setSubmitting(true);
    try {
      const refundId = "RF" + Date.now().toString().slice(-8);
      await addDoc(collection(db, "refund_requests"), {
        refundId,
        orderId: selectedOrder.orderId,
        userId: user.uid,
        userName: selectedOrder.userName || "",
        userEmail: selectedOrder.userEmail || user.email,
        amount: selectedOrder.total,
        reason: refundReason,
        bankInfo: {
          accountNumber: bankAccount.trim(),
          bankName: bankName.trim(),
          accountHolder: accountHolder.trim(),
        },
        status: "pending", // pending | refunded
        createdAt: new Date().toISOString(),
      });

      setRefundModalVisible(false);
      Alert.alert(
        "✅ Gửi yêu cầu thành công",
        "Yêu cầu hoàn tiền của bạn đã được ghi nhận. Admin sẽ xử lý và chuyển khoản sớm nhất có thể.",
      );
    } catch (e) {
      Alert.alert("Lỗi", "Không thể gửi yêu cầu hoàn tiền: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const StatusProgress = ({ status }) => {
    const currentIdx = PROGRESS_STEPS.findIndex((s) => s.key === status);
    return (
      <View style={styles.progressWrap}>
        {PROGRESS_STEPS.map((step, idx) => {
          const cfg = STATUS_CONFIG[step.key];
          const reached = idx <= currentIdx;
          return (
            <View key={step.key} style={styles.progressItem}>
              {idx > 0 && (
                <View style={[styles.progressLine, { backgroundColor: reached ? cfg.color : "#e0e0e0" }]} />
              )}
              <View style={[styles.progressDot, { backgroundColor: reached ? cfg.color : "#e0e0e0" }]}>
                <Text style={{ fontSize: 11, color: "#fff", fontWeight: "700" }}>
                  {reached ? "✓" : ""}
                </Text>
              </View>
              <Text style={[styles.progressLabel, { color: reached ? cfg.color : "#bbb", fontWeight: reached ? "600" : "400" }]}>
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const isDone = item.status === "done";
    const isReviewed = reviewedIds.has(item.id);
    const canRefund = item.status === "pending" || item.status === "confirmed";
    const refundRequest = getRefundRequest(item.orderId);

    return (
      <View style={styles.card}>
        {/* Header card */}
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>🧾 #{item.orderId?.slice(0, 8).toUpperCase()}</Text>
          <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.badgeText, { color: cfg.color }]}>
              {cfg.icon} {cfg.label}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        {item.status !== "cancelled" && <StatusProgress status={item.status} />}

        {/* Danh sách món */}
        <View style={styles.itemsList}>
          {item.items?.slice(0, 2).map((p, idx) => (
            <View key={idx} style={styles.productRow}>
              {p.hinhanh ? (
                <Image source={{ uri: p.hinhanh }} style={styles.productImg} />
              ) : (
                <View style={[styles.productImg, styles.noImg]}>
                  <Text style={{ fontSize: 18 }}>🍽️</Text>
                </View>
              )}
              <Text style={styles.productName} numberOfLines={1}>{p.tensp}</Text>
              <Text style={styles.productQty}>x{p.qty}</Text>
              <Text style={styles.productPrice}>{formatPrice(p.gia * p.qty)}</Text>
            </View>
          ))}
          {item.items?.length > 2 && (
            <Text style={styles.moreItems}>+{item.items.length - 2} món khác...</Text>
          )}
        </View>

        {/* Footer card */}
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.totalText}>{formatPrice(item.total)}</Text>
        </View>

        {/* Nút Hoàn tiền — chỉ hiện với đơn pending/confirmed */}
        {canRefund && (
          <View style={styles.refundSection}>
            {refundRequest ? (
              // Đã có yêu cầu hoàn tiền
              <View style={[styles.refundStatusBadge, 
                { backgroundColor: refundRequest.status === "refunded" ? "#EAFAF1" : "#FEF5E7" }]}>
                <Text style={[styles.refundStatusText,
                  { color: refundRequest.status === "refunded" ? "#27ae60" : "#e67e22" }]}>
                  {refundRequest.status === "refunded" ? "✅ Đã hoàn tiền" : "⏳ Đang chờ hoàn tiền"}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.refundBtn}
                onPress={() => openRefundModal(item)}
              >
                <Text style={styles.refundBtnText}>↩️ Yêu cầu hoàn tiền</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Nút đánh giá — chỉ hiện khi done */}
        {isDone && (
          <View style={styles.reviewSection}>
            {isReviewed ? (
              <View style={styles.reviewedBadge}>
                <Text style={styles.reviewedText}>⭐ Đã đánh giá</Text>
              </View>
            ) : (
              <View>
                <Text style={styles.reviewPrompt}>Đánh giá món ăn của bạn:</Text>
                {item.items?.map((product, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.reviewBtn}
                    onPress={() =>
                      navigation.navigate("WriteReview", {
                        order: item,
                        product: {
                          id: product.id,
                          tensp: product.tensp,
                          hinhanh: product.hinhanh,
                          loaisp: product.loaisp || "",
                        },
                      })
                    }
                  >
                    {product.hinhanh ? (
                      <Image source={{ uri: product.hinhanh }} style={styles.reviewBtnImg} />
                    ) : (
                      <View style={[styles.reviewBtnImg, { backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" }]}>
                        <Text>🍽️</Text>
                      </View>
                    )}
                    <Text style={styles.reviewBtnText} numberOfLines={1}>{product.tensp}</Text>
                    <Text style={styles.reviewBtnAction}>Đánh giá ›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🧾 Đơn Hàng Của Tôi</Text>
      </View>

      <View style={styles.tabsWrap}>
        <FlatList
          data={FILTER_TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(t) => t.key}
          contentContainerStyle={styles.tabs}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
              <View style={[styles.tabBadge, { backgroundColor: activeTab === tab.key ? "#fff" : "#f0f0f0" }]}>
                <Text style={[styles.tabBadgeText, { color: activeTab === tab.key ? "#FF6B35" : "#888" }]}>
                  {tab.key === "all"
                    ? orders.length
                    : tab.key === "refund"
                    ? refundRequests.filter((r) => r.status === "refunded").length
                    : orders.filter((o) => o.status === tab.key).length}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FF6B35" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 60, marginBottom: 12 }}>🛒</Text>
              <Text style={styles.emptyText}>
                {activeTab === "all"
                  ? "Bạn chưa có đơn hàng nào"
                  : activeTab === "refund"
                  ? "Chưa có đơn hoàn tiền nào"
                  : "Không có đơn hàng ở trạng thái này"}
              </Text>
            </View>
          }
        />
      )}

      {/* Modal Yêu cầu Hoàn tiền */}
      <Modal visible={refundModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>↩️ Yêu cầu Hoàn tiền</Text>
              {selectedOrder && (
                <View style={styles.modalOrderInfo}>
                  <Text style={styles.modalOrderId}>
                    Đơn #{selectedOrder.orderId?.slice(0, 8).toUpperCase()}
                  </Text>
                  <Text style={styles.modalOrderAmount}>
                    {formatPrice(selectedOrder.total)}
                  </Text>
                </View>
              )}

              {/* Chọn lý do */}
              <Text style={styles.inputLabel}>Lý do hoàn tiền *</Text>
              {REFUND_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonOption, refundReason === reason && styles.reasonSelected]}
                  onPress={() => setRefundReason(reason)}
                >
                  <View style={[styles.radioCircle, refundReason === reason && styles.radioSelected]} />
                  <Text style={[styles.reasonText, refundReason === reason && { color: "#FF6B35", fontWeight: "600" }]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Thông tin tài khoản nhận hoàn tiền */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Tài khoản nhận hoàn tiền *</Text>
              <TextInput
                style={styles.input}
                placeholder="Số tài khoản ngân hàng"
                value={bankAccount}
                onChangeText={setBankAccount}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Tên ngân hàng (VD: Vietcombank, MB Bank...)"
                value={bankName}
                onChangeText={setBankName}
              />
              <TextInput
                style={styles.input}
                placeholder="Tên chủ tài khoản (viết hoa không dấu)"
                value={accountHolder}
                onChangeText={setAccountHolder}
                autoCapitalize="characters"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setRefundModalVisible(false)}
                  disabled={submitting}
                >
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                  onPress={submitRefundRequest}
                  disabled={submitting}
                >
                  <Text style={styles.submitBtnText}>
                    {submitting ? "Đang gửi..." : "Gửi yêu cầu hoàn tiền"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    backgroundColor: "#FF6B35",
    paddingTop: 55,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },

  tabsWrap: { backgroundColor: "#fff", paddingVertical: 10 },
  tabs: { paddingHorizontal: 16, gap: 8 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    gap: 6,
  },
  tabActive: { backgroundColor: "#FF6B35" },
  tabText: { fontSize: 13, color: "#888", fontWeight: "500" },
  tabTextActive: { color: "#fff", fontWeight: "700" },
  tabBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeText: { fontSize: 11, fontWeight: "700" },

  list: { padding: 14, paddingBottom: 100 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 14,
    padding: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  orderId: { fontSize: 14, fontWeight: "700", color: "#2c3e50" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: "700" },

  progressWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  progressItem: { flex: 1, alignItems: "center", position: "relative" },
  progressDot: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
    marginBottom: 4, zIndex: 1,
  },
  progressLabel: { fontSize: 9, textAlign: "center" },
  progressLine: {
    position: "absolute", top: 11, left: "-50%",
    width: "100%", height: 2, zIndex: 0,
  },

  itemsList: { borderTopWidth: 1, borderTopColor: "#f5f5f5", paddingTop: 10 },
  productRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  productImg: { width: 40, height: 40, borderRadius: 8, marginRight: 10 },
  noImg: { backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" },
  productName: { flex: 1, fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
  productQty: { fontSize: 13, color: "#aaa", marginRight: 10 },
  productPrice: { fontSize: 13, fontWeight: "700", color: "#FF6B35" },
  moreItems: { fontSize: 12, color: "#aaa", fontStyle: "italic", marginTop: 2 },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
    paddingTop: 10,
    marginTop: 6,
  },
  dateText: { fontSize: 12, color: "#aaa" },
  totalText: { fontSize: 16, fontWeight: "800", color: "#1a1a1a" },

  // Refund section
  refundSection: {
    borderTopWidth: 1,
    borderTopColor: "#f5f5f5",
    paddingTop: 10,
    marginTop: 8,
  },
  refundBtn: {
    backgroundColor: "#FFF0EB",
    borderWidth: 1,
    borderColor: "#FF6B35",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  refundBtnText: { color: "#FF6B35", fontWeight: "700", fontSize: 14 },
  refundStatusBadge: {
    borderRadius: 10, padding: 10, alignItems: "center",
  },
  refundStatusText: { fontWeight: "700", fontSize: 13 },

  // Review section
  reviewSection: {
    borderTopWidth: 1, borderTopColor: "#f0f0f0",
    paddingTop: 12, marginTop: 10,
  },
  reviewPrompt: { fontSize: 13, color: "#555", fontWeight: "600", marginBottom: 8 },
  reviewBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFF5F0", borderRadius: 12,
    padding: 10, marginBottom: 6, gap: 10,
  },
  reviewBtnImg: { width: 36, height: 36, borderRadius: 8 },
  reviewBtnText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
  reviewBtnAction: { fontSize: 13, color: "#FF6B35", fontWeight: "700" },
  reviewedBadge: {
    backgroundColor: "#EAFAF1", borderRadius: 12, padding: 10, alignItems: "center",
  },
  reviewedText: { color: "#27ae60", fontWeight: "700", fontSize: 14 },

  emptyWrap: { alignItems: "center", marginTop: 80 },
  emptyText: { fontSize: 15, color: "#aaa", textAlign: "center" },

  // Modal styles
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1a1a1a", marginBottom: 12 },
  modalOrderInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFF5F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  modalOrderId: { fontSize: 14, fontWeight: "700", color: "#2c3e50" },
  modalOrderAmount: { fontSize: 15, fontWeight: "800", color: "#FF6B35" },

  inputLabel: { fontSize: 13, fontWeight: "700", color: "#555", marginBottom: 8 },
  reasonOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 6,
    gap: 10,
  },
  reasonSelected: { borderColor: "#FF6B35", backgroundColor: "#FFF5F0" },
  radioCircle: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: "#ccc",
  },
  radioSelected: { borderColor: "#FF6B35", backgroundColor: "#FF6B35" },
  reasonText: { fontSize: 14, color: "#555" },

  input: {
    borderWidth: 1, borderColor: "#e0e0e0",
    borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 14,
    color: "#1a1a1a", marginBottom: 10,
    backgroundColor: "#fafafa",
  },

  modalActions: {
    flexDirection: "row", gap: 12, marginTop: 8, marginBottom: 8,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: "#ddd", alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#888" },
  submitBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: "#FF6B35", alignItems: "center",
  },
  submitBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
