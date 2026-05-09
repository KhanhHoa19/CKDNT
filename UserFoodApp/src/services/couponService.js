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
export const validateCoupon = async (code, cartTotal, totalItems, userId) => {
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

    // 4. Check minimum order value
    if (couponData.minOrderValue && cartTotal < couponData.minOrderValue) {
      return { success: false, message: `Đơn hàng tối thiểu để áp dụng là ${new Intl.NumberFormat("vi-VN").format(couponData.minOrderValue)}đ` };
    }

    // 5. Check minimum items
    if (couponData.minItems && totalItems < couponData.minItems) {
      return { success: false, message: `Cần mua tối thiểu ${couponData.minItems} sản phẩm để áp dụng mã này` };
    }

    // All checks passed, calculate discount
    let discountAmount = 0;
    if (couponData.discountType === "percent") {
      discountAmount = Math.round((cartTotal * couponData.discountValue) / 100);
      // Optional: limit max discount if property exists e.g. maxDiscountValue
      if (couponData.maxDiscountValue && discountAmount > couponData.maxDiscountValue) {
        discountAmount = couponData.maxDiscountValue;
      }
    } else if (couponData.discountType === "fixed") {
      discountAmount = couponData.discountValue;
    }

    // Ensure we don't discount more than the cart total
    if (discountAmount > cartTotal) {
      discountAmount = cartTotal;
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
