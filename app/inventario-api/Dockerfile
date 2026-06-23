# app/inventario-api/Dockerfile
# ===========================================================
#  Build multi-etapa: compila el frontend y lo sirve desde
#  el backend Node (arquitectura A: un solo contenedor).
# ===========================================================

# --- Etapa 1: build del frontend (Vite) ---
FROM node:20-alpine AS frontend-build
WORKDIR /front

# El frontend vive en ../inventario-itu-client respecto a este Dockerfile.
# El build context debe ser la carpeta app/ (ver nota abajo).
COPY inventario-itu-client/package*.json ./
RUN npm ci
COPY inventario-itu-client/ ./
RUN npm run build
# Resultado: /front/dist

# --- Etapa 2: backend + front estático ---
FROM node:20-alpine
WORKDIR /usr/src/app

# Dependencias del backend
COPY inventario-api/package*.json ./
RUN npm ci --omit=dev

# Código del backend
COPY inventario-api/src ./src

# Copiamos el build del frontend desde la etapa 1 a /public,
# que es la carpeta que sirve express.static (FRONTEND_DIR=public).
COPY --from=frontend-build /front/dist ./public

USER node
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "src/server.js"]