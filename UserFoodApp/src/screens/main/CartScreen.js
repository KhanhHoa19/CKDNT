import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
} from "react-native";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";
import uuid from "react-native-uuid";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

export default function CartScreen({ navigation }) {
  const { cartItems, updateQty, removeFromCart, clearCart, totalPrice } =
    useCart();
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  // States cho thanh toán
  const [paymentMethod, setPaymentMethod] = useState("cod"); // "cod" | "bank"
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [inputOtp, setInputOtp] = useState("");
  const [currentOrderId, setCurrentOrderId] = useState("");
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [savingQR, setSavingQR] = useState(false);
  const qrRef = useRef(null);
  const [liveStockMap, setLiveStockMap] = useState({});

  // Thay IP này bằng IPv4 máy tính của bạn (VD: 192.168.1.x)
  const SERVER_URL = "http://192.168.101.27:3000"; 

  const deliveryFee = 0;
  const discount = cartItems.length > 0 ? Math.round(totalPrice * 0.1) : 0;
  const total = totalPrice - discount + deliveryFee;

  const formatPrice = (p) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(p);

  useEffect(() => {
    if (cartItems.length === 0) {
      setLiveStockMap({});
      return;
    }

    const unsubscribers = [];
    const nextMap = {};

    cartItems.forEach((item) => {
      if (!item.id) return;
      const unsub = onSnapshot(doc(db, "sanpham", item.id), (snap) => {
        if (snap.exists()) {
          nextMap[item.id] = Number(snap.data()?.soluong || 0);
          setLiveStockMap((prev) => ({ ...prev, [item.id]: nextMap[item.id] }));
        } else {
          setLiveStockMap((prev) => ({ ...prev, [item.id]: 0 }));
        }
      });
      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [cartItems]);

  const getAvailableStock = (item) =>
    liveStockMap[item.id] !== undefined
      ? liveStockMap[item.id]
      : Number(item.soluong ?? 0);

  const placeOrder = async (method, isPaid = false, orderIdToUse) => {
    setLoading(true);
    const finalOrderId = orderIdToUse || uuid.v4();
    try {
      // 0. Gom số lượng theo sản phẩm để trừ kho chính xác 1 lần/sản phẩm
      const qtyByProduct = cartItems.reduce((acc, item) => {
        if (!item.id) return acc;
        acc[item.id] = (acc[item.id] || 0) + Number(item.qty || 0);
        return acc;
      }, {});

      // 1. Trừ kho atomically để đồng bộ cho mọi phiên đăng nhập
      await runTransaction(db, async (transaction) => {
        for (const [productId, qtyNeed] of Object.entries(qtyByProduct)) {
          const productRef = doc(db, "sanpham", productId);
          const productSnap = await transaction.get(productRef);
          if (!productSnap.exists()) {
            throw new Error("Sản phẩm không còn tồn tại.");
          }
          const currentStock = Number(productSnap.data()?.soluong || 0);
          if (qtyNeed > currentStock) {
            throw new Error(
              `Sản phẩm "${productSnap.data()?.tensp || "không xác định"}" chỉ còn ${currentStock} phần.`,
            );
          }
          transaction.update(productRef, {
            soluong: currentStock - qtyNeed,
          });
        }
      });

      // 2. Lưu đơn hàng
      await addDoc(collection(db, "orders"), {
        orderId: finalOrderId,
        userId: user.uid,
        userName: userProfile?.fullName || "",
        userEmail: user.email,
        userPhone: userProfile?.phone || "",
        deliveryAddress: userProfile?.address1 || "Chưa có địa chỉ",
        items: cartItems.map((i) => ({
          id: i.id || "",
          idsanpham: i.idsanpham || "",
          tensp: i.tensp || "",
          gia: i.gia || 0,
          qty: i.qty || 1,
          hinhanh: i.hinhanh || "",
        })),
        totalItems: cartItems.length,
        subTotal: totalPrice,
        deliveryFee,
        discount,
        total,
        paymentMethod: method,
        isPaid,
        status: "pending", // Phải dùng 'pending' để Admin thấy trong tab Chờ duyệt
        createdAt: new Date().toISOString(),
      });

      // 3. Nếu chuyển khoản -> Lưu vào bảng mới hoàn toàn (payment_histories) để đối chiếu
      if (method === "bank" && isPaid) {
        await addDoc(collection(db, "payment_histories"), {
          paymentId: uuid.v4(),
          orderId: finalOrderId,
          userId: user.uid,
          
          // Lấy thông tin người dùng (từ profiles)
          customerInfo: {
            fullName: userProfile?.fullName || "",
            email: user.email,
            phone: userProfile?.phone || "",
            address: userProfile?.address1 || "Chưa có địa chỉ",
          },

          // Lấy thông tin đơn hàng (từ orders)
          orderSummary: {
            totalItems: cartItems.length,
            items: cartItems.map((i) => ({
              idsanpham: i.idsanpham || "",
              tensp: i.tensp || "",
              qty: i.qty || 1,
              gia: i.gia || 0,
            })),
            subTotal: totalPrice,
            deliveryFee: deliveryFee,
            discount: discount,
            amountPaid: total,
          },

          paymentMethod: "bank_transfer",
          status: "completed",
          createdAt: new Date().toISOString(),
        });

        // 4. Gửi email xác nhận
        try {
          await fetch(`${SERVER_URL}/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: user.email,
              subject: "Xác nhận thanh toán đơn hàng - FoodApp",
              html: `<h3>Xin chào ${userProfile?.fullName || ""},</h3>
                     <p>Đơn hàng <b>${finalOrderId}</b> của bạn đã được thanh toán thành công.</p>
                     <p>Tổng tiền: <b style="color:red">${formatPrice(total)}</b></p>
                     <p>Thời gian: ${new Date().toLocaleString()}</p>
                     <p>Cảm ơn bạn đã tin tưởng và đặt món!</p>`,
            }),
          });
        } catch (e) {
          console.log("Không thể gửi email xác nhận:", e);
        }
      }

      clearCart();
      Alert.alert(
        "🎉 Đặt hàng thành công!",
        "Đơn hàng đã được gửi đến admin. Vui lòng chờ xác nhận.",
        [
          {
            text: "Xem đơn hàng",
            onPress: () => navigation.navigate("OrderHistory"),
          },
          { text: "OK" },
        ],
      );
    } catch (error) {
      console.error("Lỗi đặt hàng Firebase:", error);
      Alert.alert("Lỗi", "Không thể đặt hàng: " + (error.message || "Lỗi không xác định"));
    } finally {
      setLoading(false);
    }
  };

  const handleOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert("Giỏ hàng trống");
      return;
    }
    if (!userProfile?.address1) {
      Alert.alert(
        "Chưa có địa chỉ",
        "Vui lòng cập nhật địa chỉ giao hàng trong Profile trước khi đặt hàng.",
      );
      return;
    }

    const outOfStockItems = cartItems.filter((item) => getAvailableStock(item) <= 0);
    if (outOfStockItems.length > 0) {
      Alert.alert(
        "Đơn hàng đã hết",
        `Một số món đã hết hàng: ${outOfStockItems.map((i) => i.tensp).join(", ")}.`,
      );
      return;
    }

    const overItems = cartItems.filter((item) => item.qty > getAvailableStock(item));
    if (overItems.length > 0) {
      Alert.alert(
        "Vượt số lượng tồn kho",
        `Vui lòng giảm số lượng. Món vượt tồn: ${overItems.map((i) => i.tensp).join(", ")}.`,
      );
      return;
    }

    if (paymentMethod === "cod") {
      placeOrder("cod", false, null);
    } else {
      initiateOTP();
    }
  };

  const initiateOTP = async () => {
    setLoading(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(code);
    const shortOrderId = "FD" + Date.now().toString().slice(-8) + Math.floor(Math.random() * 100).toString();
    setCurrentOrderId(shortOrderId);
    
    try {
      await fetch(`${SERVER_URL}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: user.email,
          subject: "Mã OTP Xác Nhận Thanh Toán",
          html: `<h3>Mã xác thực giao dịch</h3>
                 <p>Mã OTP của bạn là: <b style="font-size:20px; color:#FF6B35">${code}</b></p>
                 <p>Vui lòng nhập mã này vào ứng dụng để tiếp tục thanh toán.</p>`,
        }),
      });
      setOtpModalVisible(true);
    } catch (e) {
      Alert.alert("Lỗi", "Không thể gửi OTP. Hãy kiểm tra server có đang chạy không.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = () => {
    if (inputOtp === otpCode) {
      setOtpModalVisible(false);
      setInputOtp("");
      setQrModalVisible(true);
    } else {
      Alert.alert("Lỗi", "Mã OTP không chính xác");
    }
  };

  const confirmQRPayment = async () => {
    setCheckingPayment(true);
    try {
      const response = await fetch(`${SERVER_URL}/check-sepay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: currentOrderId, amount: total }),
      });
      const data = await response.json();

      if (data.success) {
        setQrModalVisible(false);
        await placeOrder("bank", true, currentOrderId);
      } else {
        Alert.alert(
          "Chưa nhận được tiền", 
          data.message || "Hệ thống chưa tìm thấy giao dịch của bạn. Nếu bạn vừa chuyển khoản, vui lòng đợi thêm 5-10 giây rồi thử lại."
        );
      }
    } catch (error) {
      console.log("Lỗi kiểm tra SePay:", error);
      Alert.alert("Lỗi kết nối", "Không thể kiểm tra giao dịch lúc này. Đảm bảo server đang chạy.");
    } finally {
      setCheckingPayment(false);
    }
  };

  // Lưu mã QR vào đầu bộ sưu tập ảnh
  const saveQRToGallery = async () => {
    setSavingQR(true);
    try {
      // Xin quyền GHI ảnh (writeOnly=true → không yêu cầu quyền Audio, tránh lỗi Expo Go)
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== "granted") {
        Alert.alert("Cần quyền truy cập", "Vui lòng cấp quyền truy cập thư viện ảnh để lưu mã QR.");
        return;
      }

      // Chụp ảnh component QR
      const uri = await captureRef(qrRef, {
        format: "png",
        quality: 1.0,
      });

      // Lưu thẳng vào bộ sưu tập (chỉ cần quyền Write, không bị lỗi Missing permission)
      await MediaLibrary.saveToLibraryAsync(uri);

      Alert.alert("✅ Đã lưu!", "Mã QR đã được lưu vào bộ sưu tập ảnh của bạn.");
    } catch (e) {
      console.error("Lỗi lưu QR:", e);
      Alert.alert("Lỗi", "Không thể lưu mã QR: " + e.message);
    } finally {
      setSavingQR(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.checkbox}>
        <Text style={{ color: "#FF6B35" }}>✓</Text>
      </View>
      {item.hinhanh ? (
        <Image source={{ uri: item.hinhanh }} style={styles.itemImg} />
      ) : (
        <View style={[styles.itemImg, styles.noImg]}>
          <Text style={{ fontSize: 24 }}>🍽️</Text>
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.tensp}
        </Text>
        <Text style={styles.itemPrice}>{formatPrice(item.gia * item.qty)}</Text>
        <Text style={styles.stockInline}>
          {getAvailableStock(item) > 0
            ? `Còn ${getAvailableStock(item)} phần`
            : "Số lượng: 0 - đơn hàng đã hết"}
        </Text>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => updateQty(item.id, item.qty - 1)}
          >
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.qtyInput}
            value={String(item.qty)}
            onChangeText={(value) => {
              const onlyDigits = value.replace(/[^0-9]/g, "");
              if (!onlyDigits) {
                updateQty(item.id, 1);
                return;
              }
              const num = Number(onlyDigits);
              const maxStock = Math.max(0, getAvailableStock(item));
              updateQty(item.id, Math.min(Math.max(1, num), maxStock || 1));
            }}
            keyboardType="number-pad"
            textAlign="center"
            editable={getAvailableStock(item) > 0}
          />
          <TouchableOpacity
            style={[
              styles.qtyBtn,
              item.qty >= getAvailableStock(item) && { opacity: 0.45 },
            ]}
            onPress={() =>
              item.qty < getAvailableStock(item) && updateQty(item.id, item.qty + 1)
            }
            disabled={item.qty >= getAvailableStock(item)}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => removeFromCart(item.id)}
        style={{ padding: 6 }}
      >
        <Text style={{ fontSize: 18, color: "#e74c3c" }}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header với nút xem lịch sử */}
      <View style={styles.header}>
        <View>
          <Text style={styles.locLabel}>DELIVERY LOCATION</Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={styles.locValue}>
              {userProfile?.address1 || "Chưa có địa chỉ"}
            </Text>
            <TouchableOpacity style={styles.changeBtn}>
              <Text style={styles.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ✅ Nút xem lịch sử đơn hàng */}
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => navigation.navigate("OrderHistory")}
        >
          <Text style={styles.historyIcon}>🧾</Text>
          <Text style={styles.historyText}>Lịch sử</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {cartItems.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={{ fontSize: 60, marginBottom: 12 }}>🛒</Text>
            <Text style={styles.empty}>Giỏ hàng trống</Text>
            <TouchableOpacity
              style={styles.viewHistoryBtn}
              onPress={() => navigation.navigate("OrderHistory")}
            >
              <Text style={styles.viewHistoryText}>Xem lịch sử đơn hàng →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={cartItems}
              keyExtractor={(i) => i.id}
              renderItem={renderItem}
              scrollEnabled={false}
            />

              {/* Payment Method Selection */}
              <View style={styles.methodContainer}>
                <Text style={styles.summaryTitle}>Payment Method</Text>
                
                <TouchableOpacity
                  style={[styles.methodOption, paymentMethod === "cod" && styles.methodSelected]}
                  onPress={() => setPaymentMethod("cod")}
                >
                  <Text style={styles.methodText}>💵 Tiền mặt (COD)</Text>
                  {paymentMethod === "cod" && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodOption, paymentMethod === "bank" && styles.methodSelected]}
                  onPress={() => setPaymentMethod("bank")}
                >
                  <Text style={styles.methodText}>🏦 Chuyển khoản qua mã QR (Thanh toán trước)</Text>
                  {paymentMethod === "bank" && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>
              </View>

              {/* Payment Summary */}
              <View style={styles.summary}>
                <Text style={styles.summaryTitle}>Payment Summary</Text>
                {[
                  {
                    label: `Total Items (${cartItems.length})`,
                    value: formatPrice(totalPrice),
                  },
                  { label: "Delivery Fee", value: "Free" },
                  {
                    label: "Discount",
                    value: `-${formatPrice(discount)}`,
                    red: true,
                  },
                ].map((row) => (
                  <View key={row.label} style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{row.label}</Text>
                    <Text
                      style={[
                        styles.summaryValue,
                        row.red && { color: "#e74c3c" },
                      ]}
                    >
                      {row.value}
                    </Text>
                  </View>
                ))}
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text
                    style={[
                      styles.summaryLabel,
                      { fontWeight: "700", fontSize: 16 },
                    ]}
                  >
                    Total
                  </Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      { fontWeight: "700", fontSize: 16 },
                    ]}
                  >
                    {formatPrice(total)}
                  </Text>
                </View>
              </View>
          </>
        )}
      </ScrollView>

      {cartItems.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.orderBtn, loading && { opacity: 0.7 }]}
            onPress={handleOrder}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.orderBtnText}>
                {paymentMethod === "cod" ? "Đặt hàng ngay" : "Xác nhận & Thanh toán QR"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Nhập OTP */}
      <Modal visible={otpModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Xác thực Email</Text>
            <Text style={styles.modalDesc}>Mã 6 số đã được gửi đến {user.email}. Vui lòng kiểm tra và nhập vào bên dưới:</Text>
            <TextInput
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={6}
              value={inputOtp}
              onChangeText={setInputOtp}
              placeholder="000000"
              textAlign="center"
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setOtpModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={verifyOTP}>
                <Text style={styles.confirmBtnText}>Xác thực</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal QR Code */}
      <Modal visible={qrModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Quét mã thanh toán</Text>
            <Text style={styles.modalDesc}>Vui lòng quét mã QR qua ứng dụng ngân hàng để thanh toán {formatPrice(total)}</Text>
            
            {/* Thay BANK_BIN bằng mã Ngân hàng (VD: Vietcombank = 970436) và STK của bạn */}
            <View ref={qrRef} style={styles.qrWrapper} collapsable={false}>
              <Image
                source={{ uri: `https://img.vietqr.io/image/970422-3083737857829-compact2.png?amount=${total}&addInfo=${currentOrderId}&accountName=DO%20XUAN%20HAI` }}
                style={{ width: 230, height: 230 }}
              />
              <Text style={styles.qrAmountLabel}>{formatPrice(total)}</Text>
              <Text style={styles.qrOrderLabel}>#{currentOrderId}</Text>
            </View>

            {/* Nút lưu QR */}
            <TouchableOpacity
              style={[styles.saveQrBtn, savingQR && { opacity: 0.6 }]}
              onPress={saveQRToGallery}
              disabled={savingQR}
            >
              <Text style={styles.saveQrBtnText}>
                {savingQR ? "⏳ Đang lưu..." : "💾 Lưu mã QR"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.orderBtn, checkingPayment && { backgroundColor: "#ccc" }]} 
              onPress={confirmQRPayment}
              disabled={checkingPayment}
            >
              <Text style={styles.orderBtnText}>
                {checkingPayment ? "⏳ Đang kiểm tra..." : "Tôi đã thanh toán"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 12, alignItems: "center" }} onPress={() => setQrModalVisible(false)}>
              <Text style={{ color: "#aaa", fontSize: 16 }}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locLabel: {
    fontSize: 11,
    color: "#FF6B35",
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  locValue: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  changeBtn: {
    borderWidth: 1,
    borderColor: "#FF6B35",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 8,
  },
  changeBtnText: { color: "#FF6B35", fontSize: 11, fontWeight: "600" },

  // ✅ Nút lịch sử
  historyBtn: { alignItems: "center" },
  historyIcon: { fontSize: 24 },
  historyText: {
    fontSize: 11,
    color: "#FF6B35",
    fontWeight: "600",
    marginTop: 2,
  },

  item: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    elevation: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  itemImg: { width: 60, height: 60, borderRadius: 12, marginRight: 12 },
  noImg: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: { flex: 1 },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 3,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF6B35",
    marginBottom: 6,
  },
  qtyRow: { flexDirection: "row", alignItems: "center" },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBtnText: { fontSize: 16, color: "#333" },
  qtyInput: {
    width: 52,
    height: 30,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    paddingHorizontal: 4,
  },
  stockInline: { fontSize: 11, color: "#888", marginBottom: 6 },

  summary: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
    marginTop: 4,
  },
  summaryLabel: { fontSize: 14, color: "#888" },
  summaryValue: { fontSize: 14, color: "#1a1a1a", fontWeight: "500" },

  footer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  orderBtn: {
    backgroundColor: "#FF6B35",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  orderBtnText: { color: "#fff", fontSize: 17, fontWeight: "bold" },

  emptyWrap: { alignItems: "center", marginTop: 80 },
  empty: { fontSize: 16, color: "#aaa", marginBottom: 16 },
  viewHistoryBtn: {
    borderWidth: 1.5,
    borderColor: "#FF6B35",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  viewHistoryText: { color: "#FF6B35", fontWeight: "600", fontSize: 14 },
  
  // Custom Styles cho Method & Modal
  methodContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
  },
  methodOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    borderRadius: 12,
    marginBottom: 8,
  },
  methodSelected: {
    borderColor: "#FF6B35",
    backgroundColor: "#fff5f2",
  },
  methodText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  checkIcon: {
    color: "#FF6B35",
    fontWeight: "bold",
    fontSize: 16,
  },

  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    fontSize: 24,
    paddingVertical: 12,
    letterSpacing: 8,
    marginBottom: 20,
    color: "#333",
  },
  modalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  cancelBtnText: { color: "#666", fontWeight: "bold" },
  confirmBtn: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#FF6B35",
    marginLeft: 8,
  },
  confirmBtnText: { color: "#fff", fontWeight: "bold" },

  // QR wrapper (bọc ảnh QR + text để chụp)
  qrWrapper: {
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  qrAmountLabel: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "800",
    color: "#FF6B35",
  },
  qrOrderLabel: {
    fontSize: 11,
    color: "#aaa",
    marginTop: 2,
    letterSpacing: 1,
  },

  // Nút lưu QR
  saveQrBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f9ff",
    borderWidth: 1.5,
    borderColor: "#3498db",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 6,
  },
  saveQrBtnText: {
    color: "#3498db",
    fontWeight: "700",
    fontSize: 14,
  },
});
