import { doc, updateDoc } from "firebase/firestore";
import React, { useState } from "react";
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
  const { user, adminProfile, setAdminProfile } = useAuth();
  const [fullName, setFullName] = useState(adminProfile?.fullName || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Lỗi", "Tên không được để trống");
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, "admins", user.uid), {
        fullName: fullName.trim(),
      });
      setAdminProfile((prev) => ({ ...prev, fullName: fullName.trim() }));
      Alert.alert("Thành công", "Đã cập nhật!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert("Lỗi", "Không thể cập nhật.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Chỉnh sửa Profile</Text>
          <View style={{ width: 30 }} />
        </View>

        <View style={styles.form}>
          {/* Email không cho sửa */}
          <Text style={styles.label}>Email (không thể thay đổi)</Text>
          <View style={styles.disabledInput}>
            <Text style={{ color: "#95a5a6" }}>{adminProfile?.email}</Text>
          </View>

          <Text style={styles.label}>Họ và tên</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
          />

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>💾 Lưu thay đổi</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  title: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  form: { padding: 20 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  disabledInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  btn: {
    backgroundColor: "#3498db",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 30,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
