import { createContext, useContext, useMemo, useState } from "react";
import { api, setTokens, clearTokens } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("tajira_user");
    return raw ? JSON.parse(raw) : null;
  });

  const value = useMemo(
    () => ({
      user,
      async login(identifier, password) {
        const data = await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({ identifier, password }),
        });
        if (!["SUPER_ADMIN", "ADMIN", "INVENTORY_MANAGER", "SALES_MANAGER", "CUSTOMER_SUPPORT", "DELIVERY_MANAGER"].includes(data.user.role)) {
          throw new Error("This account cannot access the admin dashboard");
        }
        setTokens(data.accessToken, data.refreshToken);
        localStorage.setItem("tajira_user", JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
      },
      logout() {
        clearTokens();
        setUser(null);
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
