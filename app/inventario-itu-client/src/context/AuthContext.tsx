// src/context/AuthContext.tsx
import { createContext, useState, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import type { Usuario } from "../types";
import { logout as apiLogout } from "../api/auth.api";
import { getToken } from "../api/client";

interface AuthContextType {
  usuario: Usuario | null;
  login: (u: Usuario) => void;
  logout: () => void;
  isAuthenticated: boolean;
  cargando: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_KEY = "inventario_usuario";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  // Al montar: si hay token + usuario guardados, restauramos la sesión.
  useEffect(() => {
    const token = getToken();
    if (token) {
      try {
        const guardado = sessionStorage.getItem(USER_KEY);
        if (guardado) setUsuario(JSON.parse(guardado));
      } catch {
        // si algo falla, simplemente no restauramos
      }
    }
    setCargando(false);
  }, []);

  const login = (u: Usuario) => {
    setUsuario(u);
    try {
      sessionStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {
      // seguimos solo en memoria si sessionStorage no está disponible
    }
  };

  const logout = () => {
    apiLogout(); // limpia el token
    setUsuario(null);
    try {
      sessionStorage.removeItem(USER_KEY);
    } catch {
      // nada
    }
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        login,
        logout,
        isAuthenticated: usuario !== null,
        cargando,
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
