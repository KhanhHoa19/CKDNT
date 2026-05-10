import { signInWithEmailAndPassword, signOut } from "firebase/auth"; // Thêm signOut
import { doc, getDoc } from "firebase/firestore"; // Thêm hàm để đọc Database
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from "react-native";
import { auth, db } from "../../config/firebase"; // Nhớ import thêm db

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ");
      return;
    }
    setLoading(true);
    try {
      // 1. Thực hiện đăng nhập qua Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. CHỐT CHẶN KIỂM TRA BAN: Đọc dữ liệu từ bảng rate_limits
      const rateLimitRef = doc(db, "rate_limits", user.uid);
      const rateLimitSnap = await getDoc(rateLimitRef);

      if (rateLimitSnap.exists() && rateLimitSnap.data().isBanned === true) {
        // 3. Nếu phát hiện bị Khóa -> Ép Đăng xuất ngay lập tức
        await signOut(auth);
        Alert.alert(
          "⛔ Tài khoản bị khóa",
          "Tài khoản của bạn đã bị khóa do vi phạm chính sách chống Spam của hệ thống. Vui lòng liên hệ Admin để được hỗ trợ."
        );
        setLoading(false);
        return; // Dừng lại tại đây, KHÔNG cho vào app
      }

      // Nếu không bị Ban thì code sẽ chạy tiếp tục ở đây để vào màn hình chính...
      // (Ví dụ: navigation.navigate("Home") hoặc dựa vào Auth Listener của bạn)

    } catch (error) {
      let msg = "Đăng nhập thất bại";
      if (error.code === "auth/invalid-credential")
        msg = "Email hoặc mật khẩu không đúng";
      Alert.alert("Lỗi", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Text style={styles.emoji}>🍔</Text>
      <Text style={styles.title}>Chào mừng trở lại!</Text>
      <Text style={styles.subtitle}>Đăng nhập để đặt món</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Nhập email"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Mật khẩu</Text>
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Nhập mật khẩu"
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.btn, loading && { opacity: 0.7 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Đăng Nhập</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={styles.link}>Chưa có tài khoản? Đăng ký</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  emoji: { fontSize: 52, textAlign: "center", marginBottom: 12 },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    color: "#888",
    marginBottom: 36,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#e8e8e8",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: "#fafafa",
  },
  btn: {
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  link: { textAlign: "center", color: "#FF6B35", fontSize: 14 },
});