import React from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowIcon}>{icon}</Text>
    <View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || "Chưa cập nhật"}</Text>
    </View>
  </View>
);

export default function ProfileScreen({ navigation }) {
  const { adminProfile, logout } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👤 Profile Admin</Text>
      </View>

      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={{ fontSize: 40 }}>👨‍💼</Text>
        </View>
        <Text style={styles.adminBadge}>🔑 Administrator</Text>
      </View>

      <View style={styles.infoCard}>
        <InfoRow icon="👤" label="Họ và tên" value={adminProfile?.fullName} />
        <InfoRow icon="✉️" label="Email" value={adminProfile?.email} />
        <InfoRow icon="🔑" label="Vai trò" value={adminProfile?.role} />
      </View>

      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => navigation.navigate("EditProfile")}
      >
        <Text style={styles.editBtnText}>✏️ Chỉnh sửa thông tin</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() =>
          Alert.alert("Đăng xuất", "Bạn có muốn đăng xuất?", [
            { text: "Hủy", style: "cancel" },
            { text: "Đăng xuất", style: "destructive", onPress: logout },
          ])
        }
      >
        <Text style={styles.logoutBtnText}>🚪 Đăng xuất</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
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
  avatarSection: { alignItems: "center", paddingVertical: 24 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#d6eaf8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  adminBadge: { fontSize: 14, color: "#3498db", fontWeight: "700" },
  infoCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  rowIcon: { fontSize: 20, marginRight: 14, marginTop: 2 },
  rowLabel: { fontSize: 12, color: "#aaa", marginBottom: 2 },
  rowValue: { fontSize: 15, fontWeight: "600", color: "#2c3e50" },
  editBtn: {
    marginHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "#3498db",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  editBtnText: { color: "#3498db", fontSize: 15, fontWeight: "700" },
  logoutBtn: {
    marginHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "#e74c3c",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  logoutBtnText: { color: "#e74c3c", fontSize: 15, fontWeight: "700" },
});
