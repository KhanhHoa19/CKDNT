import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function AdminScreen() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMap, setLoadingMap] = useState({});

  useEffect(() => {
    // Lắng nghe realtime từ collection 'rate_limits'
    const rateLimitsRef = collection(db, 'rate_limits');
    
    const unsubscribe = onSnapshot(rateLimitsRef, (snapshot) => {
      const usersData = [];
      snapshot.forEach((doc) => {
        usersData.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      
      // Sắp xếp người dùng bị khóa lên đầu, hoặc theo thời gian cập nhật
      usersData.sort((a, b) => {
        if (a.isBanned === b.isBanned) {
          return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
        }
        return a.isBanned ? -1 : 1;
      });

      setUsers(usersData);
      setFilteredUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Lỗi khi fetch rate_limits:", error);
      setLoading(false);
      Alert.alert('Lỗi', 'Không thể lấy danh sách người dùng.');
    });

    return () => unsubscribe();
  }, []);

  // Xử lý tìm kiếm
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const lowercasedQuery = searchQuery.toLowerCase();
      const filtered = users.filter((user) => 
        user.id.toLowerCase().includes(lowercasedQuery)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  // Cập nhật trạng thái Block / Unblock
  const toggleBanStatus = async (uid, currentStatus) => {
    setLoadingMap(prev => ({ ...prev, [uid]: true }));
    try {
      const userRef = doc(db, 'rate_limits', uid);
      await updateDoc(userRef, {
        isBanned: !currentStatus
      });
    } catch (error) {
      console.error("Lỗi khi cập nhật isBanned: ", error);
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái của người dùng này.");
    } finally {
      setLoadingMap(prev => ({ ...prev, [uid]: false }));
    }
  };

  // Format thời gian hiển thị
  const formatTime = (isoString) => {
    if (!isoString) return 'Chưa có dữ liệu';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('vi-VN');
    } catch (e) {
      return isoString;
    }
  };

  const renderUserItem = ({ item }) => {
    const isBanned = item.isBanned === true;
    const isUpdating = loadingMap[item.id];
    const violationCount = item.violationCount || 0;

    return (
      <View style={[styles.userCard, isBanned && styles.bannedCard]}>
        <View style={styles.userInfoContainer}>
          <Text style={styles.uidText} numberOfLines={1} ellipsizeMode="middle">
            UID: {item.id}
          </Text>
          <Text style={styles.infoText}>
            Tương tác cuối: {formatTime(item.lastMessageTime)}
          </Text>
          <Text style={styles.infoText}>
            Số tin nhắn (chu kỳ): {item.messageCount || 0}
          </Text>
          <Text style={[styles.infoText, violationCount > 0 && styles.violationText]}>
            Số lần vi phạm Spam: {violationCount}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.actionButton,
            isBanned ? styles.unblockButton : styles.blockButton,
            isUpdating && styles.disabledButton
          ]}
          onPress={() => toggleBanStatus(item.id, isBanned)}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>
              {isBanned ? 'MỞ KHÓA' : 'KHÓA'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quản lý Người dùng</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo UID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Không tìm thấy người dùng nào.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#334155',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bannedCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  userInfoContainer: {
    flex: 1,
    marginRight: 12,
  },
  uidText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  violationText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockButton: {
    backgroundColor: '#DC2626',
  },
  unblockButton: {
    backgroundColor: '#10B981',
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 15,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 15,
    marginTop: 24,
  },
});
