import { registerRootComponent } from "expo";
import { AuthProvider } from "./src/context/AuthContext";
import { CategoryProvider } from "./src/context/CategoryContext";
import AppNavigator from "./src/navigation/AppNavigator";

function App() {
  return (
    <CategoryProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </CategoryProvider>
  );
}

registerRootComponent(App);
