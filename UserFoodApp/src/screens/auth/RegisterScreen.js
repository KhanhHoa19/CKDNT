import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { auth, db } from "../../config/firebase";

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirm) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Lỗi", "Mật khẩu không khớp");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu phải ít nhất 6 ký tự");
      return;
    }
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      // Lưu thông tin user vào Firestore collection "users"
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullName,
        email,
        phone,
        address1: "",
        address2: "",
        role: "user", // phân quyền: 'user' hoặc 'admin'
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      let msg = "Đăng ký thất bại";
      if (error.code === "auth/email-already-in-use")
        msg = "Email đã được sử dụng";
      if (error.code === "auth/invalid-email") msg = "Email không hợp lệ";
      Alert.alert("Lỗi", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>🍔 Tạo Tài Khoản</Text>
        <Text style={styles.subtitle}>Đăng ký để đặt món yêu thích</Text>

        {[
          {
            label: "Họ và tên",
            value: fullName,
            set: setFullName,
            placeholder: "Nhập họ và tên",
          },
          {
            label: "Email",
            value: email,
            set: setEmail,
            placeholder: "Nhập email",
            keyboard: "email-address",
            caps: "none",
          },
          {
            label: "Số điện thoại",
            value: phone,
            set: setPhone,
            placeholder: "Nhập số điện thoại",
            keyboard: "phone-pad",
          },
          {
            label: "Mật khẩu",
            value: password,
            set: setPassword,
            placeholder: "Ít nhất 6 ký tự",
            secure: true,
          },
          {
            label: "Xác nhận mật khẩu",
            value: confirm,
            set: setConfirm,
            placeholder: "Nhập lại mật khẩu",
            secure: true,
          },
        ].map(({ label, value, set, placeholder, keyboard, caps, secure }) => (
          <View key={label}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={set}
              placeholder={placeholder}
              keyboardType={keyboard || "default"}
              autoCapitalize={caps || "words"}
              secureTextEntry={secure || false}
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Đăng Ký</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.link}>Đã có tài khoản? Đăng nhập</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 24, paddingTop: 60 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  subtitle: { fontSize: 15, color: "#888", marginBottom: 28 },
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
    marginTop: 8,
    marginBottom: 20,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  link: { textAlign: "center", color: "#FF6B35", fontSize: 14 },
});
