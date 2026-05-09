// Khi test với Expo Go trên điện thoại thật → dùng IP LAN
// Khi chạy Android Emulator → dùng 10.0.2.2
const API_URL = "http://192.168.100.188:3000"; // ← đổi IP máy bạn

/**
 * Tạo PaymentIntent — gọi trước khi confirmPayment
 * VND không có decimal → KHÔNG nhân 100
 */
export const createPaymentIntent = async ({ amount, gateway = "card" }) => {
  try {
    const res = await fetch(`${API_URL}/create-payment-intent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        amount: amount.toString(), // VND: 50000 → "50000"
        currency: "vnd",
        gateway: gateway,
      }),
    });
    const data = await res.json();
    return data?.client_secret; // trả về clientSecret
  } catch (error) {
    console.error("createPaymentIntent error:", error);
    return null;
  }
};

/**
 * Tạo SetupIntent — dùng để lưu thẻ (save card)
 */
export const fetchSetupIntentClientSecret = async () => {
  try {
    const res = await fetch(`${API_URL}/create-setup-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return data?.setupIntent; // client_secret của setupIntent
  } catch (error) {
    console.error("fetchSetupIntentClientSecret error:", error);
    return null;
  }
};
