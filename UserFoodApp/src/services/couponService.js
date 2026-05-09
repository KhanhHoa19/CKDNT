import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * Validate a coupon code based on rules.
 * @param {string} code - The coupon code to check
 * @param {number} cartTotal - Total price of the cart before discount
 * @param {number} totalItems - Total number of items in the cart
 * @param {string} userId - ID of the user applying the coupon
 * @returns {Promise<{success: boolean, message: string, discountAmount?: number, couponId?: string}>}
 */
export const validateCoupon = async (code, cartTotal, totalItems, userId, cartItems = []) => {
  if (!code) return { success: false, message: "Vui lòng nhập mã giảm giá" };
  if (!userId) return { success: false, message: "Lỗi xác thực người dùng" };

  try {
    const q = query(collection(db, "magiamgia"), where("code", "==", code.toUpperCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, message: "Mã giảm giá không tồn tại" };
    }

    const couponDoc = querySnapshot.docs[0];
    const couponId = couponDoc.id;
    const couponData = couponDoc.data();

    // 1. Check isActive
    if (!couponData.isActive) {
      return { success: false, message: "Mã giảm giá đã bị vô hiệu hóa" };
    }

    // 1.5. Check if user already used this coupon
    if (couponData.usedBy && couponData.usedBy.includes(userId)) {
      return { success: false, message: "Bạn đã sử dụng mã giảm giá này rồi" };
    }

    // 2. Check expiration
    const now = new Date();
    let isExpired = couponData.isExpired;

    if (couponData.expirationDate) {
      const expirationDate = new Date(couponData.expirationDate);
      if (now > expirationDate) {
        isExpired = true;
      }
    }

    if (isExpired) {
      // Auto update if it wasn't expired in DB but is now expired
      if (!couponData.isExpired) {
        await updateDoc(doc(db, "magiamgia", couponId), { isExpired: true });
      }
      return { success: false, message: "Mã giảm giá đã hết hạn" };
    }
    
    // Check start date
    if (couponData.startDate) {
        const startDate = new Date(couponData.startDate);
        if (now < startDate) {
            return { success: false, message: "Mã giảm giá chưa đến ngày sử dụng" };
        }
    }

    // 3. Check usage limit
    if (couponData.usageLimit && couponData.usageCount >= couponData.usageLimit) {
      return { success: false, message: "Mã giảm giá đã hết lượt sử dụng" };
    }

    // 4. Lọc sản phẩm áp dụng (nếu coupon có chỉ định applicableProducts)
    const hasFilter = couponData.applicableProducts && couponData.applicableProducts.length > 0;
    let discountBase = cartTotal; // mặc định tính trên toàn giỏ
    let checkQty = totalItems;

    if (hasFilter && cartItems.length > 0) {
      const matched = cartItems.filter(item =>
        couponData.applicableProducts.includes(item.idsanpham || item.id)
      );
      if (matched.length === 0) {
        return { success: false, message: "Mã giảm giá này không áp dụng cho sản phẩm trong giỏ hàng" };
      }
      discountBase = matched.reduce((s, i) => s + ((i.gia || 0) * (i.qty || 1)), 0);
      checkQty = matched.reduce((s, i) => s + (i.qty || 1), 0);
    }

    // 5. Check minimum order value (tổng toàn đơn)
    if (couponData.minOrderValue && cartTotal < couponData.minOrderValue) {
      return { success: false, message: `Đơn hàng tối thiểu là ${new Intl.NumberFormat("vi-VN").format(couponData.minOrderValue)}đ` };
    }

    // 6. Check minimum items (chỉ tính SP áp dụng)
    if (couponData.minItems && checkQty < couponData.minItems) {
      return { success: false, message: `Cần tối thiểu ${couponData.minItems} sản phẩm${hasFilter ? " áp dụng" : ""} để dùng mã này` };
    }

    // All checks passed, calculate discount
    let discountAmount = 0;
    if (couponData.discountType === "percent") {
      discountAmount = Math.round((discountBase * couponData.discountValue) / 100);
      if (couponData.maxDiscountValue && discountAmount > couponData.maxDiscountValue) {
        discountAmount = couponData.maxDiscountValue;
      }
    } else if (couponData.discountType === "fixed") {
      discountAmount = couponData.discountValue;
    }

    // Không giảm nhiều hơn phần sản phẩm áp dụng
    if (discountAmount > discountBase) {
      discountAmount = discountBase;
    }

    return { 
      success: true, 
      message: "Áp dụng mã giảm giá thành công", 
      discountAmount,
      couponId,
      code: couponData.code
    };

  } catch (error) {
    console.error("Lỗi khi xác thực mã giảm giá:", error);
    return { success: false, message: "Đã xảy ra lỗi khi kiểm tra mã" };
  }
};
