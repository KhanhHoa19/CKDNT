import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from 'expo-clipboard';
import { db } from "../../config/firebase";

// SERVER_URL — đổi thành IPv4 của máy bạn
const SERVER_URL = "http://192.168.101.27:3000";

const STATUS_TABS = [
  { key: "pending", label: "Chờ duyệt", color: "#e67e22" },
  { key: "confirmed", label: "Đã duyệt", color: "#3498db" },
  { key: "shipping", label: "Đang giao", color: "#9b59b6" },
  { key: "done", label: "Hoàn thành", color: "#27ae60" },
  { key: "refund", label: "Hoàn tiền", color: "#e74c3c" },
];

export default function OrderListScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [refundRequests, setRefundRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [confirmingRefund, setConfirmingRefund] = useState<string | null>(null);

  // Lắng nghe đơn hàng realtime
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  // Lắng nghe yêu cầu hoàn tiền realtime
  useEffect(() => {
    const q = query(collection(db, "refund_requests"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRefundRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(p);

  const formatDate = (iso: string) => new Date(iso).toLocaleString("vi-VN");

  // Gọi server xác minh Admin đã chuyển khoản hoàn tiền chưa (đọc dòng tiền RA từ SePay)
  const verifyAndConfirmRefund = async (refundReq: any) => {
    setConfirmingRefund(refundReq.id);
    try {
      const response = await fetch(`${SERVER_URL}/check-refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refundId: refundReq.refundId,
          amount: refundReq.amount,
        }),
      });
      const data = await response.json();

      if (data.success) {
        // Tìm document đơn hàng thật theo orderId (mã hiển thị cho user)
        const orderSnap = await getDocs(
          query(collection(db, "orders"), where("orderId", "==", refundReq.orderId)),
        );
        if (orderSnap.empty) {
          Alert.alert("Lỗi", "Không tìm thấy đơn hàng cần hoàn tiền để cộng lại tồn kho.");
          return;
        }
        const orderDoc = orderSnap.docs[0];
        const orderRef = doc(db, "orders", orderDoc.id);
        const refundRef = doc(db, "refund_requests", refundReq.id);

        // Cộng lại tồn kho + chốt trạng thái hoàn tiền trong cùng transaction
        await runTransaction(db, async (transaction) => {
          const refundDoc = await transaction.get(refundRef);
          if (!refundDoc.exists()) throw new Error("Yêu cầu hoàn tiền không tồn tại.");

          const refundData = refundDoc.data();
          if (refundData?.status === "refunded") {
            return; // idempotent: đã xử lý rồi thì không cộng lại lần nữa
          }

          const orderTxDoc = await transaction.get(orderRef);
          if (!orderTxDoc.exists()) throw new Error("Đơn hàng không tồn tại.");
          const orderData = orderTxDoc.data();
          const items = Array.isArray(orderData?.items) ? orderData.items : [];

          for (const item of items) {
            const productId = item?.id;
            const qty = Number(item?.qty || 0);
            if (!productId || qty <= 0) continue;

            const productRef = doc(db, "sanpham", productId);
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists()) continue;

            const currentStock = Number(productDoc.data()?.soluong || 0);
            transaction.update(productRef, { soluong: currentStock + qty });
          }

          transaction.update(refundRef, {
            status: "refunded",
            confirmedAt: new Date().toISOString(),
            txInfo: data.transaction,
            restockedAt: new Date().toISOString(),
          });

          transaction.update(orderRef, {
            status: "cancelled",
            refundedAt: new Date().toISOString(),
          });
        });

        // Gửi email thông báo cho user
        try {
          await fetch(`${SERVER_URL}/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: refundReq.userEmail,
              subject: "Hoàn tiền thành công - FoodApp",
              html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                  <h2 style="color: #FF6B35;">Hoàn tiền thành công!</h2>
                  <p>Xin chào <b>${refundReq.userName || "bạn"}</b>,</p>
                  <p>Yêu cầu hoàn tiền cho đơn hàng <b>#${refundReq.orderId?.slice(0, 8).toUpperCase()}</b> đã được xử lý thành công.</p>
                  <p>Số tiền <b>${formatPrice(refundReq.amount)}</b> đã được chuyển về tài khoản ngân hàng của bạn:</p>
                  <ul>
                    <li>Số tài khoản: <b>${refundReq.bankInfo?.accountNumber}</b></li>
                    <li>Ngân hàng: <b>${refundReq.bankInfo?.bankName}</b></li>
                    <li>Chủ tài khoản: <b>${refundReq.bankInfo?.accountHolder}</b></li>
                  </ul>
                  <p>Vui lòng kiểm tra tài khoản ngân hàng của bạn. Cảm ơn bạn đã đồng hành cùng FoodApp!</p>
                </div>
              `,
            }),
          });
        } catch (mailErr) {
          console.error("Lỗi gửi email hoàn tiền:", mailErr);
        }

        Alert.alert("✅ Xác nhận thành công", "Đã xác minh giao dịch hoàn tiền qua SePay và gửi email cho khách.");
      } else {
        Alert.alert(
          "⏳ Chưa xác minh được",
          `SePay chưa ghi nhận giao dịch hoàn tiền với mã ${refundReq.refundId}.\n\nHãy đảm bảo đã chuyển khoản với nội dung chứa mã này và thử lại sau 5-10 giây.`,
        );
      }
    } catch (e: any) {
      Alert.alert("Lỗi kết nối", "Không thể kết nối server để xác minh: " + e.message);
    } finally {
      setConfirmingRefund(null);
    }
  };

  const currentTab = STATUS_TABS.find((t) => t.key === activeTab)!;

  // Tập hợp orderId đã được hoàn tiền thành công → loại khỏi các tab khác
  const refundedOrderIds = new Set(
    refundRequests
      .filter((r) => r.status === "refunded")
      .map((r) => r.orderId)
  );

  // Dữ liệu hiển thị tùy theo tab (loại trừ đơn đã hoàn tiền ở các tab thường)
  const filteredOrders = orders.filter(
    (o) => o.status === activeTab && !refundedOrderIds.has(o.orderId)
  );
  const pendingRefunds = refundRequests.filter((r) => r.status === "pending");
  const approvedRefunds = refundRequests.filter((r) => r.status === "refunded");

  // Render card đơn hàng thường
  const renderOrderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("OrderDetail", { order: item })}
    >
      <View style={styles.cardTop}>
        <Text style={styles.orderId} numberOfLines={1}>
          🧾 {item.orderId?.slice(0, 8).toUpperCase()}...
        </Text>
        <View style={[styles.badge, { backgroundColor: currentTab.color }]}>
          <Text style={styles.badgeText}>{currentTab.label}</Text>
        </View>
      </View>
      <Text style={styles.userName}>👤 {item.userName}</Text>
      <Text style={styles.address}>📍 {item.deliveryAddress}</Text>
      {!!item.items?.length && (
        <View style={styles.itemPreviewWrap}>
          {item.items.slice(0, 3).map((orderItem: any, idx: number) => (
            <View key={`${orderItem.id || orderItem.idsanpham || idx}`} style={styles.itemPreview}>
              {orderItem.hinhanh ? (
                <Image source={{ uri: orderItem.hinhanh }} style={styles.itemPreviewImg} />
              ) : (
                <View style={[styles.itemPreviewImg, styles.itemPreviewFallback]}>
                  <Text style={styles.itemPreviewFallbackText}>🍽️</Text>
                </View>
              )}
            </View>
          ))}
          {item.items.length > 3 && (
            <View style={styles.itemMoreBubble}>
              <Text style={styles.itemMoreText}>+{item.items.length - 3}</Text>
            </View>
          )}
        </View>
      )}
      <View style={styles.cardBottom}>
        <Text style={styles.itemCount}>{item.items?.length} món</Text>
        <Text style={styles.total}>{formatPrice(item.total)}</Text>
      </View>
      <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
    </TouchableOpacity>
  );

  // Render card yêu cầu hoàn tiền (tab Hoàn tiền)
  const renderRefundItem = ({ item, isApproved }: { item: any; isApproved: boolean }) => (
    <View style={[styles.card, isApproved && styles.cardApproved]}>
      <View style={styles.cardTop}>
        <Text style={styles.orderId}>↩️ {item.refundId}</Text>
        <View style={[styles.badge, { backgroundColor: isApproved ? "#27ae60" : "#e67e22" }]}>
          <Text style={styles.badgeText}>{isApproved ? "Đã hoàn" : "Chờ xử lý"}</Text>
        </View>
      </View>
      <Text style={styles.userName}>👤 {item.userName}</Text>
      <Text style={styles.address}>📋 Lý do: {item.reason}</Text>

      <View style={styles.bankInfoBox}>
        <Text style={styles.bankInfoTitle}>💳 Thông tin hoàn tiền:</Text>
        <Text style={styles.bankInfoText}>STK: {item.bankInfo?.accountNumber}</Text>
        <Text style={styles.bankInfoText}>NH: {item.bankInfo?.bankName}</Text>
        <Text style={styles.bankInfoText}>Chủ TK: {item.bankInfo?.accountHolder}</Text>
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.itemCount}>Đơn #{item.orderId?.slice(0, 8).toUpperCase()}</Text>
        <Text style={[styles.total, { color: "#e74c3c" }]}>{formatPrice(item.amount)}</Text>
      </View>
      <Text style={styles.date}>{formatDate(item.createdAt)}</Text>

      {/* Nội dung chuyển khoản cần dùng */}
      {!isApproved && (
        <View style={styles.transferNote}>
          <Text style={styles.transferNoteTitle}>📌 Nội dung CK bắt buộc:</Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={styles.transferNoteCode}>{item.refundId}</Text>
            <TouchableOpacity 
              style={styles.copyBtn} 
              onPress={async () => {
                await Clipboard.setStringAsync(item.refundId);
                Alert.alert("Đã copy", "Đã sao chép nội dung chuyển khoản!");
              }}
            >
              <Text style={styles.copyBtnText}>📋 Copy</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Nút xác nhận đã hoàn tiền (Admin bấm sau khi CK tay xong) */}
      {!isApproved && (
        <TouchableOpacity
          style={[styles.confirmRefundBtn, confirmingRefund === item.id && { opacity: 0.6 }]}
          onPress={() => verifyAndConfirmRefund(item)}
          disabled={confirmingRefund === item.id}
        >
          <Text style={styles.confirmRefundBtnText}>
            {confirmingRefund === item.id ? "⏳ Đang xác minh SePay..." : "✅ Xác nhận đã hoàn tiền"}
          </Text>
        </TouchableOpacity>
      )}

      {isApproved && item.confirmedAt && (
        <Text style={styles.confirmedAt}>
          ✅ Xác nhận lúc: {formatDate(item.confirmedAt)}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🧾 Quản Lý Đơn Hàng</Text>
      </View>

      {/* Status tabs */}
      <View style={styles.tabs}>
        {STATUS_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && {
                borderBottomColor: tab.color,
                borderBottomWidth: 3,
              },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && { color: tab.color, fontWeight: "700" },
              ]}
            >
              {tab.label}
            </Text>
            <Text style={[styles.tabCount, { color: tab.color }]}>
              {tab.key === "refund"
                ? refundRequests.length
                : orders.filter(
                    (o) => o.status === tab.key && !refundedOrderIds.has(o.orderId)
                  ).length}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3498db" style={{ marginTop: 40 }} />
      ) : activeTab === "refund" ? (
        // Tab Hoàn tiền: chia 2 nhóm
        <FlatList
          data={[...pendingRefunds, ...approvedRefunds]}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          ListHeaderComponent={
            pendingRefunds.length > 0 ? (
              <Text style={styles.sectionHeader}>
                🔔 Chờ xử lý ({pendingRefunds.length})
              </Text>
            ) : null
          }
          renderItem={({ item, index }) => {
            const isApproved = item.status === "refunded";
            const showApprovedHeader =
              isApproved && index === pendingRefunds.length;
            return (
              <>
                {showApprovedHeader && (
                  <Text style={[styles.sectionHeader, { color: "#27ae60", marginTop: 16 }]}>
                    ✅ Đã hoàn tiền ({approvedRefunds.length})
                  </Text>
                )}
                {renderRefundItem({ item, isApproved })}
              </>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>Không có yêu cầu hoàn tiền nào</Text>
          }
        />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(i) => i.id}
          renderItem={renderOrderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={styles.empty}>Không có đơn hàng nào</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  header: {
    backgroundColor: "#2c3e50",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10 },
  tabText: { fontSize: 10, color: "#95a5a6" },
  tabCount: { fontSize: 15, fontWeight: "bold", marginTop: 2 },

  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#e67e22",
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  cardApproved: { opacity: 0.75 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  orderId: { fontSize: 13, fontWeight: "700", color: "#2c3e50", flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  userName: { fontSize: 14, color: "#2c3e50", marginBottom: 3 },
  address: { fontSize: 13, color: "#7f8c8d", marginBottom: 8 },
  itemPreviewWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  itemPreview: { marginRight: 6 },
  itemPreviewImg: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#ecf0f1",
  },
  itemPreviewFallback: {
    justifyContent: "center",
    alignItems: "center",
  },
  itemPreviewFallbackText: { fontSize: 18 },
  itemMoreBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#eef2f7",
    justifyContent: "center",
    alignItems: "center",
  },
  itemMoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7f8c8d",
  },
  cardBottom: { flexDirection: "row", justifyContent: "space-between" },
  itemCount: { fontSize: 13, color: "#7f8c8d" },
  total: { fontSize: 15, fontWeight: "bold", color: "#e74c3c" },
  date: { fontSize: 11, color: "#bdc3c7", marginTop: 6 },

  // Bank info
  bankInfoBox: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
  },
  bankInfoTitle: { fontSize: 12, fontWeight: "700", color: "#555", marginBottom: 4 },
  bankInfoText: { fontSize: 13, color: "#2c3e50", marginBottom: 2 },

  // Transfer note
  transferNote: {
    backgroundColor: "#FEF5E7",
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#e67e22",
  },
  transferNoteTitle: { fontSize: 12, fontWeight: "700", color: "#e67e22", marginBottom: 4 },
  transferNoteCode: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2c3e50",
    letterSpacing: 1,
  },
  copyBtn: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copyBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Confirm refund button
  confirmRefundBtn: {
    backgroundColor: "#27ae60",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  confirmRefundBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  confirmedAt: { fontSize: 11, color: "#27ae60", marginTop: 6, textAlign: "center" },

  empty: { textAlign: "center", marginTop: 60, color: "#95a5a6", fontSize: 15 },
});
