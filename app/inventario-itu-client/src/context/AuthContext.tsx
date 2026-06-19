// src/context/AuthContext.tsx
import { createContext, useState, useContext } from "react";
import type { ReactNode } from "react";
import type { Usuario } from "../types";

interface AuthContextType {
  usuario: Usuario | null;
  login: (u: Usuario) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const login = (u: Usuario) => setUsuario(u);
  const logout = () => setUsuario(null);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        login,
        logout,
        isAuthenticated: usuario !== null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
