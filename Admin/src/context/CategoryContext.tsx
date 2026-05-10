import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
} from "firebase/firestore";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { db } from "../config/firebase";

export interface FoodCategory {
  id: string;
  label: string;
  emoji: string;
  color: string;
  order: number;
  image?: string; // Cloudinary URL ảnh đại diện card
}

interface CategoryContextType {
  categories: FoodCategory[];
  loading: boolean;
  addCategory: (cat: Omit<FoodCategory, "id">) => Promise<void>;
  updateCategory: (id: string, cat: Omit<FoodCategory, "id">) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType>({
  categories: [],
  loading: true,
  addCategory: async () => {},
  updateCategory: async () => {},
  deleteCategory: async () => {},
});

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<FoodCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "danhmucsanpham"), orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setCategories(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<FoodCategory, "id">),
        })),
      );
      setLoading(false);
    });
    return unsub;
  }, []);

  const addCategory = useCallback(async (cat: Omit<FoodCategory, "id">) => {
    await addDoc(collection(db, "danhmucsanpham"), cat);
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    await deleteDoc(doc(db, "danhmucsanpham", id));
  }, []);

  const updateCategory = useCallback(
    async (id: string, cat: Omit<FoodCategory, "id">) => {
      await updateDoc(doc(db, "danhmucsanpham", id), cat);
    },
    [],
  );

  return (
    <CategoryContext.Provider
      value={{ categories, loading, addCategory, updateCategory, deleteCategory }}
    >
      {children}
    </CategoryContext.Provider>
  );
}

export const useCategories = () => useContext(CategoryContext);
