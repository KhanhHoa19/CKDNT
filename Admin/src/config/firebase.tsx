import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBk0ydOTnNRvJf9fYnYS7u14OyAnRvV1hE",
  authDomain: "giuakidnt-1702.firebaseapp.com",
  projectId: "giuakidnt-1702",
  storageBucket: "giuakidnt-1702.firebasestorage.app",
  messagingSenderId: "185014378962",
  appId: "1:185014378962:web:6cf014004a01fc60c2a80b",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export const db = getFirestore(app);
