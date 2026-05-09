import React, { useState, useEffect, useRef } from 'react';
// Thêm dòng này vào (Tùy theo đường dẫn file firebaseConfig của bạn)
import { getAuth } from 'firebase/auth';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import uuid from 'react-native-uuid';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: 'Bạn cần tư vấn món ăn hay có thắc mắc gì không?',
      sender: 'ai',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState('');

  const flatListRef = useRef(null);

  // 1. Tạo sessionId khi lần đầu mở màn hình chat
  // 1. Lấy UID thật của người dùng khi mở màn hình chat
  useEffect(() => {
    const auth = getAuth();
    // Lấy thông tin user đang đăng nhập hiện tại
    const currentUser = auth.currentUser;

    if (currentUser) {
      // Gán sessionId bằng đúng UID của Firebase
      setSessionId(currentUser.uid);
    } else {
      console.warn("Lỗi: Người dùng chưa đăng nhập!");
    }
  }, []);
  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg = inputText.trim();
    const newUserMessage = {
      id: uuid.v4(),
      text: userMsg,
      sender: 'user',
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      // LƯU Ý KHI LÊN PRODUCTION: 
      // Xóa chữ "-test" trong URL dưới đây thành /webhook/a6fa...
      // Và nhớ bật công tắc Active (Góc phải trên cùng) trong n8n.
      const N8N_WEBHOOK_URL = 'https://cornell-unpugilistic-dorsoventrally.ngrok-free.dev/webhook/a6fa15ad-549b-4397-91f8-80186a6a6b84';

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          chatInput: userMsg,
        }),
      });

      if (!response.ok) {
        throw new Error(`Lỗi HTTP: ${response.status}`);
      }

      // XỬ LÝ FIX LỖI: Đọc text trước để bắt luồng chặn Spam (Plain Text)
      const responseText = await response.text();
      let aiResponseText = '';

      try {
        // Thử parse JSON (Áp dụng cho luồng AI Agent trả về bình thường)
        const data = JSON.parse(responseText);
        // Trích xuất từ node Postgres (ai_response) hoặc mặc định của Langchain (output)
        aiResponseText = data.ai_response || data.output || data.text || 'Xin lỗi, hệ thống AI không trả về dữ liệu hợp lệ.';
      } catch (parseError) {
        // Nếu không parse được JSON -> Đây là thông báo chặn Spam bằng Text từ n8n
        aiResponseText = responseText;
      }

      const newAiMessage = {
        id: uuid.v4(),
        text: aiResponseText,
        sender: 'ai',
      };

      setMessages((prev) => [...prev, newAiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: uuid.v4(),
        text: 'Hệ thống đang bận hoặc mất kết nối máy chủ, vui lòng thử lại sau! (' + error.message + ')',
        sender: 'system',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    const isSystem = item.sender === 'system';

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : isSystem ? styles.systemBubble : styles.aiBubble,
        ]}
      >
        <Text style={[
          styles.messageText,
          isUser && { color: '#fff' },
          isSystem && { color: '#fff', fontSize: 13, textAlign: 'center' }
        ]}>
          {item.text}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chăm sóc khách hàng</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {isTyping && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color="#FF6B35" />
          <Text style={styles.typingText}>AI đang suy nghĩ...</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Nhập tin nhắn..."
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && { opacity: 0.5 }]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isTyping}
          >
            <Text style={styles.sendButtonText}>Gửi</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  chatList: {
    padding: 15,
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
  },
  userBubble: {
    backgroundColor: '#FF6B35', // Màu cam chủ đạo
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  systemBubble: {
    backgroundColor: '#e74c3c',
    alignSelf: 'center',
    borderRadius: 8,
    maxWidth: '90%',
  },
  messageText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 20,
  },
  typingText: {
    marginLeft: 8,
    color: '#888',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginLeft: 10,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
