import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../config/firebase";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);
        if (u) {
          // Thêm 2 dòng này để debug
          console.log("UID đang dùng:", u.uid);
          console.log("Document path:", `admins/${u.uid}`);

          const snap = await getDoc(doc(db, "admins", u.uid));
          if (snap.exists() && snap.data()?.isActive === true) {
            setIsAdmin(true);
            setAdminProfile(snap.data());
          } else {
            setIsAdmin(false);
            setAdminProfile(null);
          }
        } else {
          setIsAdmin(false);
          setAdminProfile(null);
        }
      } catch (error) {
        // Dù lỗi gì cũng reset về trạng thái an toàn
        console.error("AuthContext error:", error);
        setIsAdmin(false);
        setAdminProfile(null);
      } finally {
        // LUÔN LUÔN chạy dù có lỗi hay không
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider
      value={{
        user,
        adminProfile,
        setAdminProfile,
        isAdmin,
        loading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
