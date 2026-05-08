import { StripeProvider } from "@stripe/stripe-react-native";
import { registerRootComponent } from "expo";
import { AuthProvider } from "./src/context/AuthContext";
import { CartProvider } from "./src/context/CartContext";
import { CategoryProvider } from "./src/context/CategoryContext";
import AppNavigator from "./src/navigation/AppNavigator";

function App() {
  return (
    <StripeProvider
      publishableKey="pk_test_51TI34rFMjT329XsKkO5vSlD41BWCwkVHDq4btk57FrWT5h8MTSyK94KTBXmoo6mvO59WcKzwJNjVdcZsCtsU7qFj00Yh5BgDSc"
      urlScheme="userfoodapp" // required for 3D Secure and bank redirects
      merchantIdentifier="merchant.com.userfoodapp" // required for Apple Pay
    >
      <AuthProvider>
        <CategoryProvider>
          <CartProvider>
            <AppNavigator />
          </CartProvider>
        </CategoryProvider>
      </AuthProvider>
    </StripeProvider>
  );
}

// Thay vì export default App
registerRootComponent(App);
