
import { doc, updateDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { db } from "../../config/firebase";

const STATUS_FLOW = {
  pending: { next: "confirmed", label: "✅ Xác nhận đơn", color: "#3498db" },
  confirmed: {
    next: "shipping",
    label: "🚚 Bắt đầu giao hàng",
    color: "#9b59b6",
  },
  shipping: { next: "done", label: "✔️ Hoàn thành", color: "#27ae60" },
  done: { next: null, label: "Đã hoàn thành", color: "#95a5a6" },
};

const STATUS_LABEL = {
  pending: { label: "Chờ duyệt", color: "#e67e22" },
  confirmed: { label: "Đã duyệt", color: "#3498db" },
  shipping: { label: "Đang giao", color: "#9b59b6" },
  done: { label: "Hoàn thành", color: "#27ae60" },
};

export default function OrderDetailScreen({ navigation, route }) {
  const { order } = route.params;
  const [status, setStatus] = useState(order.status);
  const [loading, setLoading] = useState(false);

  const formatPrice = (p) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(p);

  const formatDate = (iso) => new Date(iso).toLocaleString("vi-VN");

  const handleUpdateStatus = async () => {
    const flow = STATUS_FLOW[status];
    if (!flow.next) return;

    Alert.alert(
      "Xác nhận",
      `Chuyển đơn hàng sang trạng thái "${STATUS_LABEL[flow.next].label}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            setLoading(true);
            try {
              await updateDoc(doc(db, "orders", order.id), {
                status: flow.next,
              });
              setStatus(flow.next);
              Alert.alert("✅ Thành công", `Đơn hàng đã được cập nhật!`);
            } catch {
              Alert.alert("Lỗi", "Không thể cập nhật đơn hàng.");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const currentStatus = STATUS_LABEL[status];
  const flow = STATUS_FLOW[status];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi Tiết Đơn Hàng</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Trạng thái */}
        <View style={styles.section}>
          <View style={styles.statusRow}>
            <Text style={styles.sectionTitle}>Trạng thái</Text>
            <View
              style={[styles.badge, { backgroundColor: currentStatus.color }]}
            >
              <Text style={styles.badgeText}>{currentStatus.label}</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progress}>
            {["pending", "confirmed", "shipping", "done"].map((s, i) => (
              <View key={s} style={styles.progressItem}>
                <View
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor:
                        ["pending", "confirmed", "shipping", "done"].indexOf(
                          status,
                        ) >= i
                          ? STATUS_LABEL[s].color
                          : "#ddd",
                    },
                  ]}
                />
                <Text style={styles.progressLabel}>
                  {STATUS_LABEL[s].label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Thông tin khách hàng */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Thông tin khách hàng</Text>
          <Text style={styles.infoText}>Tên: {order.userName}</Text>
          <Text style={styles.infoText}>Địa chỉ: {order.deliveryAddress}</Text>
          <Text style={styles.infoText}>
            Ngày đặt: {formatDate(order.createdAt)}
          </Text>
        </View>

        {/* Danh sách món */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍽️ Món đã đặt</Text>
          {order.items?.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              {item.hinhanh ? (
                <Image source={{ uri: item.hinhanh }} style={styles.itemImg} />
              ) : (
                <View
                  style={[
                    styles.itemImg,
                    {
                      backgroundColor: "#f0f0f0",
                      justifyContent: "center",
                      alignItems: "center",
                    },
                  ]}
                >
                  <Text>🍽️</Text>
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.tensp}</Text>
                <Text style={styles.itemQty}>x{item.qty}</Text>
              </View>
              <Text style={styles.itemPrice}>
                {formatPrice(item.gia * item.qty)}
              </Text>
            </View>
          ))}
        </View>

        {/* Tổng tiền */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Thanh toán</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Tạm tính</Text>
            <Text style={styles.priceValue}>
              {formatPrice(order.subTotal || order.total)}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Phí giao hàng</Text>
            <Text style={styles.priceValue}>Miễn phí</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Giảm giá</Text>
            <Text style={[styles.priceValue, { color: "#e74c3c" }]}>
              -{formatPrice(order.discount || 0)}
            </Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Nút cập nhật trạng thái */}
      {flow.next && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: flow.color },
              loading && { opacity: 0.7 },
            ]}
            onPress={handleUpdateStatus}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionBtnText}>{flow.label}</Text>
            )}
          </TouchableOpacity>
        </View>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  back: { fontSize: 22, color: "#3498db" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  progress: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  progressItem: { alignItems: "center", flex: 1 },
  progressDot: { width: 16, height: 16, borderRadius: 8, marginBottom: 6 },
  progressLabel: { fontSize: 10, color: "#7f8c8d", textAlign: "center" },
  infoText: { fontSize: 14, color: "#555", marginBottom: 4 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  itemImg: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: "600", color: "#2c3e50" },
  itemQty: { fontSize: 13, color: "#7f8c8d" },
  itemPrice: { fontSize: 14, fontWeight: "700", color: "#e74c3c" },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  priceLabel: { fontSize: 14, color: "#7f8c8d" },
  priceValue: { fontSize: 14, color: "#2c3e50" },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: { fontSize: 16, fontWeight: "700", color: "#2c3e50" },
  totalValue: { fontSize: 16, fontWeight: "700", color: "#e74c3c" },
  footer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  actionBtn: { borderRadius: 14, padding: 16, alignItems: "center" },
  actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
