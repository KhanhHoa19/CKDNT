const express = require("express");
const Stripe = require("stripe");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();
app.use(express.json());
app.use(cors());

// ── Cấu hình Nodemailer để gửi email ──
// Nhớ thêm EMAIL_USER và EMAIL_PASS vào file .env trong stripe-server
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Mật khẩu ứng dụng của Gmail
  },
});

// ── API Gửi Email (OTP và Xác nhận) ──
app.post("/send-email", async (req, res) => {
  const { to, subject, html } = req.body;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Lỗi gửi email:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Tạo SetupIntent (lưu thẻ) ──
app.post("/create-setup-intent", async (req, res) => {
  try {
    const customer = await stripe.customers.create();
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: "2022-08-01" }
    );
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
    });
    res.json({
      setupIntent: setupIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Tạo PaymentIntent (thanh toán trực tiếp) ──
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency = "vnd", gateway = "card" } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: parseInt(amount),
      currency,
      payment_method_types: [gateway],
    });
    res.json({ client_secret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Kiểm tra thanh toán ngân hàng qua SePay Account API ──
app.post("/check-sepay", async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    const axios = require("axios");

    // Trim token để tránh lỗi 401 do whitespace/newline
    const apiToken = (process.env.SEPAY_API_TOKEN || "").trim();
    if (!apiToken) {
      return res.status(500).json({ success: false, error: "SEPAY_API_TOKEN chưa được cấu hình trong .env" });
    }

    console.log(`🔍 SePay: Đang kiểm tra orderId="${orderId}", amount=${amount}`);

    // Gọi SePay API lấy lịch sử giao dịch tài khoản ngân hàng cá nhân
    const response = await axios.get("https://my.sepay.vn/userapi/transactions/list", {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      params: {
        transaction_content: orderId,
        limit: 10,
      },
      timeout: 10000, // 10 giây timeout
    });

    const transactions = response.data?.transactions || [];

    // Kiểm tra giao dịch khớp mã đơn hàng VÀ đủ số tiền
    const validTx = transactions.find(
      (tx) =>
        tx.transaction_content &&
        tx.transaction_content.includes(orderId) &&
        parseInt(tx.amount_in) >= parseInt(amount)
    );

    if (validTx) {
      console.log(`✅ SePay: Giao dịch hợp lệ - ${validTx.amount_in}đ - "${validTx.transaction_content}"`);
      res.json({ success: true, transaction: validTx });
    } else {
      console.log(`⏳ SePay: Chưa tìm thấy giao dịch cho orderId="${orderId}"`);
      if (transactions.length > 0) {
        console.log("📝 Các giao dịch gần nhất:", transactions.map(t => `"${t.transaction_content}" - ${t.amount_in}đ`));
      }
      res.json({ success: false, message: "Chưa tìm thấy giao dịch thanh toán. Nếu vừa chuyển khoản, vui lòng chờ 5-10 giây rồi thử lại." });
    }
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data;
    console.error(`❌ Lỗi kiểm tra SePay [HTTP ${status}]:`, detail || err.message);
    
    if (status === 401) {
      console.error("💡 Gợi ý: Token không hợp lệ. Vào my.sepay.vn > Cài đặt > Thiết bị API > Tạo token mới");
    }
    res.status(500).json({ success: false, error: `HTTP ${status}: ${err.message}` });
  }
});

// ── Xác minh Admin đã hoàn tiền chưa (đọc dòng tiền RA từ SePay) ──
app.post("/check-refund", async (req, res) => {
  try {
    const { refundId, amount } = req.body;
    const axios = require("axios");

    const apiToken = (process.env.SEPAY_API_TOKEN || "").trim();
    if (!apiToken) {
      return res.status(500).json({ success: false, error: "SEPAY_API_TOKEN chưa được cấu hình" });
    }

    console.log(`🔄 SePay Refund: Kiểm tra refundId="${refundId}", amount=${amount}`);

    const response = await axios.get("https://my.sepay.vn/userapi/transactions/list", {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      params: {
        transaction_content: refundId,
        limit: 10,
      },
      timeout: 10000,
    });

    const transactions = response.data?.transactions || [];

    // Tìm giao dịch CHUYỂN RA (amount_out) khớp mã refund và đủ số tiền
    const validTx = transactions.find(
      (tx) =>
        tx.transaction_content &&
        tx.transaction_content.includes(refundId) &&
        parseInt(tx.amount_out) >= parseInt(amount)
    );

    if (validTx) {
      console.log(`✅ SePay Refund: Đã hoàn tiền ${validTx.amount_out}đ`);
      res.json({ success: true, transaction: validTx });
    } else {
      res.json({ success: false, message: "Chưa tìm thấy giao dịch hoàn tiền." });
    }
  } catch (err) {
    const status = err.response?.status;
    console.error(`❌ Lỗi SePay Refund [HTTP ${status}]:`, err.message);
    res.status(500).json({ success: false, error: `HTTP ${status}: ${err.message}` });
  }
});

app.listen(3000, () => console.log("✅ Stripe server running on :3000"));