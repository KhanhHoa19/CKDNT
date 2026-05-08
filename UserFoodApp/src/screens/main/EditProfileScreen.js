import { doc, updateDoc } from "firebase/firestore";
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
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";

export default function EditProfileScreen({ navigation }) {
  const { user, userProfile, setUserProfile } = useAuth();
  const [fullName, setFullName] = useState(userProfile?.fullName || "");
  const [phone, setPhone] = useState(userProfile?.phone || "");
  const [address1, setAddress1] = useState(userProfile?.address1 || "");
  const [address2, setAddress2] = useState(userProfile?.address2 || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Lỗi", "Tên không được để trống");
      return;
    }
    setLoading(true);
    try {
      const updated = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        address1: address1.trim(),
        address2: address2.trim(),
      };
      await updateDoc(doc(db, "users", user.uid), updated);
      setUserProfile((prev) => ({ ...prev, ...updated }));
      Alert.alert("Thành công", "Đã cập nhật thông tin!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert("Lỗi", "Không thể cập nhật. Thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
          <View style={{ width: 30 }} />
        </View>

        <View style={styles.form}>
          {[
            { label: "Họ và tên", value: fullName, set: setFullName },
            {
              label: "Số điện thoại",
              value: phone,
              set: setPhone,
              keyboard: "phone-pad",
            },
            { label: "Địa chỉ 1 (Home)", value: address1, set: setAddress1 },
            { label: "Địa chỉ 2 (Work)", value: address2, set: setAddress2 },
          ].map(({ label, value, set, keyboard }) => (
            <View key={label}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={set}
                keyboardType={keyboard || "default"}
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Lưu thay đổi</Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 16,
    backgroundColor: "#fff",
  },
  back: { fontSize: 22, color: "#333" },
  title: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  form: { padding: 20 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  btn: {
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 30,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
