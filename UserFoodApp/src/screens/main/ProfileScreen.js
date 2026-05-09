import {
  Alert,
  Image,
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
  const { userProfile, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      { text: "Đăng xuất", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
       
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarWrap}>
          <Image
            source={require("../../../assets/images/avatar-default.png")}
            style={styles.avatar}
          />
          <View style={styles.avatarBadge}>
            <Text style={{ fontSize: 12 }}>✏️</Text>
          </View>
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <InfoRow icon="👤" label="Full Name" value={userProfile?.fullName} />
        <InfoRow icon="✉️" label="Email" value={userProfile?.email} />
        <InfoRow icon="📞" label="Phone number" value={userProfile?.phone} />
        <InfoRow
          icon="📍"
          label="Address 1 - (Home)"
          value={userProfile?.address1}
        />
        <InfoRow
          icon="📍"
          label="Address 2 - (Work)"
          value={userProfile?.address2}
        />
      </View>

      {/* Buttons */}
      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => navigation.navigate("EditProfile")}
      >
        <Text style={styles.editBtnText}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.editBtn, { borderColor: '#10B981', marginTop: -4 }]}
        onPress={() => navigation.navigate("AdminScreen")}
      >
        <Text style={[styles.editBtnText, { color: '#10B981' }]}>🛡️ Quản lý Người dùng</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>🚪 Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
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
  },
  backIcon: { fontSize: 20, color: "#333" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  searchIcon: { fontSize: 20 },
  avatarSection: { alignItems: "center", paddingVertical: 20 },
  avatarWrap: { position: "relative" },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#eee" },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FF6B35",
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  infoCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    elevation: 3,
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
  rowValue: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  editBtn: {
    marginHorizontal: 20,
    borderWidth: 1.5,
    borderColor: "#FF6B35",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  editBtnText: { color: "#FF6B35", fontSize: 15, fontWeight: "700" },
  logoutBtn: {
    marginHorizontal: 20,
    borderWidth: 1.5,
    borderColor: "#e74c3c",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  logoutBtnText: { color: "#e74c3c", fontSize: 15, fontWeight: "700" },
});
