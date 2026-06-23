# Triple-EGI-ITU — Ecosistema de Inventario Seguro

Sistema centralizado para inventariar las computadoras de los laboratorios de informática del ITU. La aplicación web consulta **dos bases de datos** (SQL Server para ubicación y responsables, MongoDB para hardware), autentica a los usuarios contra un directorio **LDAP/Active Directory**, y se despliega de forma contenerizada en **Kubernetes (Minikube)** aplicando políticas de red con enfoque _zero-trust_.

---

## Tabla de contenidos

- [Arquitectura](#arquitectura)
- [Flujo de datos](#flujo-de-datos)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Stack tecnológico](#stack-tecnológico)
- [Modelo de datos](#modelo-de-datos)
- [API del backend](#api-del-backend)
- [Autenticación](#autenticación)
- [Cómo correr el proyecto en local](#cómo-correr-el-proyecto-en-local)
- [Despliegue en Minikube](#despliegue-en-minikube)
- [Seguridad de red (zero-trust)](#seguridad-de-red-zero-trust)

---

## Arquitectura

El ecosistema se compone de los siguientes servicios, cada uno corriendo en su propio contenedor dentro del namespace `inventario`:

| Servicio         | Rol                                       | Imagen                                       | Puerto    | Tipo de Service  |
| ---------------- | ----------------------------------------- | -------------------------------------------- | --------- | ---------------- |
| `inventario-web` | Aplicación web (API + frontend estático)  | `inventario-web:latest`                      | 3000      | NodePort (30080) |
| `ubicacion-db`   | Base de datos de ubicación y responsables | `mcr.microsoft.com/mssql/server:2022-latest` | 1433      | ClusterIP        |
| `inventario-db`  | Base de datos de hardware                 | MongoDB                                      | 27017     | ClusterIP        |
| `ldap-service`   | Directorio de identidad institucional     | LDAP/Active Directory                        | 389 / 636 | ClusterIP        |

## Flujo de datos

El recorrido de una consulta de inventario sigue exactamente el planteo del proyecto:

1. El usuario se autentica en `inventario-web`; las credenciales se validan contra **LDAP**.
2. Para listar equipos, la app consulta **SQL Server**: dónde está la máquina (aula, edificio, banco), su estado, fecha de mantenimiento y a quién está asignada.
3. Para el detalle de un equipo, la app toma el `mongo_id` que devolvió SQL Server y consulta **MongoDB** para traer los componentes de hardware (fabricante, CPU, RAM, disco, sistema operativo, periféricos, etc.).
4. La respuesta combina ambas fuentes en un único objeto que consume la interfaz.

El vínculo entre las dos bases es el campo `mongo_id` en la tabla `equipos` de SQL Server, que coincide con el `_id` del documento en MongoDB.

## Estructura del repositorio

```
Triple-EGI-ITU/
├── app/
│   ├── inventario-api/          # Backend (Node + Express). Sirve también el front compilado.
│   │   ├── src/
│   │   │   ├── config/          # Variables de entorno centralizadas
│   │   │   ├── db/              # Conexiones a SQL Server y MongoDB
│   │   │   ├── services/        # Lógica: auth, equipos (join SQL+Mongo), mock LDAP
│   │   │   ├── routes/          # Endpoints: /auth, /equipos, /health
│   │   │   ├── middleware/      # Validación de JWT
│   │   │   ├── app.js           # Configuración de Express
│   │   │   └── server.js        # Arranque del servidor
│   │   └── Dockerfile           # Build multi-etapa (compila front + empaqueta back)
│   │
│   └── inventario-itu-client/   # Frontend (React + TypeScript + Vite)
│       └── src/
│           ├── api/             # Cliente HTTP, llamadas a /auth y /equipos
│           ├── pages/           # Login, Dashboard, Detalle
│           ├── components/      # NavBar, ProtectedRoute
│           ├── context/         # AuthContext (sesión y token)
│           ├── styles/          # CSS por vista
│           └── types/           # Tipos alineados a las dos bases
│
├── databases/
│   ├── ubicacion-db/            # SQL Server: schema + datos de ejemplo
│   └── inventario-db/           # MongoDB: queries de ejemplo + seed de hardware
│
├── docs/                        # Diagramas: arquitectura, ER, flujograma
│
└── kubernetes/                  # Manifiestos del despliegue, organizados por capas
    ├── 00-namespace/
    ├── 01-config/               # ConfigMap y Secrets
    ├── 02-storage/              # PersistentVolumeClaims
    ├── 03-workloads/            # Deployments y Services
    └── 04-network-policies/     # Políticas de red zero-trust
```

## Stack tecnológico

**Frontend:** React 19, TypeScript, Vite, React Router. Estilos en CSS plano con variables (soporta modo claro/oscuro).

**Backend:** Node.js 20, Express 4, con los drivers oficiales `mssql` (SQL Server) y `mongodb`. Autenticación con JSON Web Tokens (`jsonwebtoken`).

**Bases de datos:** SQL Server 2022 y MongoDB.

**Identidad:** LDAP/Active Directory (mock en la demo, real en producción).

**Infraestructura:** Docker, Kubernetes (Minikube con CNI Calico para que las NetworkPolicies tengan efecto).

## Modelo de datos

### SQL Server — `inventario_ubicacion`

Cuatro tablas normalizadas:

- **`aulas`**: espacios físicos (nombre, edificio, capacidad).
- **`usuarios`**: sincronizados desde LDAP (username, email, rol, `ldap_dn`). No se almacenan contraseñas.
- **`equipos`**: cada computadora (código de inventario, aula, banco, estado, fecha de mantenimiento, `mongo_id`).
- **`asignaciones`**: relaciona un equipo con un usuario en un período. `fecha_fin = NULL` indica la asignación vigente.

El responsable actual de un equipo no es un campo fijo: se obtiene mediante un _join_ con la asignación vigente.

### MongoDB — `inventario_hardware`

Colección **`equipos_hardware`**. Cada documento describe el hardware de un equipo, con estructura variable según el tipo:

- Campos comunes: `_id`, fabricante, modelo, tipo (`desktop`/`laptop`), `cpu`, `ram_gb`, `disco`, sistema operativo, periféricos.
- Solo en laptops: `bateria` (capacidad y ciclos).
- Solo en algunos equipos: `gpu`.

## API del backend

Todas las rutas de equipos requieren un JWT válido en el header `Authorization: Bearer <token>`.

| Método | Ruta            | Descripción                                                         | Auth |
| ------ | --------------- | ------------------------------------------------------------------- | ---- |
| `POST` | `/auth/login`   | Valida credenciales y devuelve `{ token, usuario }`                 | No   |
| `GET`  | `/equipos`      | Lista de equipos con ubicación y responsable (SQL Server)           | Sí   |
| `GET`  | `/equipos/:id`  | Equipo con ubicación (SQL) + hardware (Mongo) combinados            | Sí   |
| `GET`  | `/health/live`  | Liveness probe (el proceso está vivo)                               | No   |
| `GET`  | `/health/ready` | Readiness probe (responde 200 solo si ambas bases están conectadas) | No   |

Cualquier otra ruta devuelve el `index.html` del frontend, para que el ruteo del cliente (React Router) funcione incluso al recargar la página.

## Autenticación

El login valida las credenciales contra LDAP y, si son correctas, emite un JWT firmado que lleva el username, el email y el rol del usuario. El frontend guarda ese token y lo envía en cada petición; el backend lo verifica en un middleware antes de permitir el acceso a los datos.

La validación de credenciales está aislada en un único módulo (`services/ldap.mock.js`). Para la demo se usa un **mock** con los mismos usuarios que el seed de SQL Server. La migración al **LDAP real** del cluster consiste en reemplazar ese único archivo manteniendo la misma firma de función, sin tocar rutas, middleware ni frontend.

Usuarios de prueba (mock):

| Usuario     | Contraseña   | Rol     |
| ----------- | ------------ | ------- |
| `admin`     | `admin123`   | admin   |
| `cmartinez` | `tecnico123` | tecnico |
| `dlopez`    | `docente123` | docente |
| `jperez`    | `alumno123`  | alumno  |

## Cómo correr el proyecto en local

Pensado para desarrollo, con el frontend y el backend por separado.

### Requisitos

- Node.js 20+
- Una instancia de SQL Server y otra de MongoDB accesibles (locales o en contenedor), con los seeds de `databases/` cargados.

### Backend

```bash
cd app/inventario-api
npm install
cp .env.example .env        # ajustar SQL_HOST, SQL_PASSWORD, MONGO_URI, JWT_SECRET
npm start                   # arranca en el puerto 3000
```

### Frontend

```bash
cd app/inventario-itu-client
npm install
# Apuntar el front al backend local mediante la variable VITE_API_URL:
echo "VITE_API_URL=http://localhost:3000" > .env.local
npm run dev                 # arranca el servidor de desarrollo de Vite
```

> En el contenedor de producción no hace falta `VITE_API_URL`: como el backend sirve el frontend, las llamadas usan rutas relativas al mismo origen.

### Cargar los seeds

```bash
# SQL Server (con sqlcmd o un cliente de su preferencia)
# Ejecutar en orden: databases/ubicacion-db/01_schema.sql y 02_seed_data.sql

# MongoDB
mongoimport --db inventario_hardware --collection equipos_hardware \
  --file databases/inventario-db/seed/equipos.json --jsonArray
```

## Despliegue en Minikube

### 1. Iniciar Minikube con un CNI compatible

Las `NetworkPolicies` solo tienen efecto con un CNI que las soporte (por ejemplo Calico):

```bash
minikube start --cni=calico
```

### 2. Construir la imagen dentro del entorno Docker de Minikube

La imagen debe construirse en el Docker de Minikube para que el cluster la encuentre (el Deployment usa `imagePullPolicy: IfNotPresent`):

```bash
eval $(minikube docker-env)

# El Dockerfile necesita acceso a las dos carpetas (API y front),
# por eso el build se corre desde app/ con la opción -f:
cd app
docker build -t inventario-web:latest -f inventario-api/Dockerfile .
```

### 3. Aplicar los manifiestos en orden

```bash
kubectl apply -f kubernetes/00-namespace/
kubectl apply -f kubernetes/01-config/
kubectl apply -f kubernetes/02-storage/
kubectl apply -R -f kubernetes/03-workloads/
kubectl wait --for=condition=ready pod --all -n inventario --timeout=180s
kubectl apply -f kubernetes/04-network-policies/
```

### 4. Verificar

```bash
kubectl get pods -n inventario
kubectl get endpoints -n inventario   # si un Service muestra <none>, las labels no coinciden
```

### 5. Acceder a la aplicación

```bash
minikube service inventario-web -n inventario --url
# o bien acceder por el NodePort: http://<minikube-ip>:30080
```

## Seguridad de red (zero-trust)

El namespace aplica el principio de **mínimo privilegio** mediante NetworkPolicies:

- **`default-deny`**: bloquea todo el tráfico de entrada y salida en el namespace. Nada se comunica salvo lo explícitamente permitido.
- **Ingress al frontend**: se permite tráfico externo entrante a `inventario-web` únicamente por el puerto 3000.
- **Egress del frontend**: `inventario-web` solo puede hablar con las tres dependencias (SQL Server, MongoDB, LDAP) en sus puertos correspondientes, más DNS.
- **Las bases de datos** solo aceptan conexiones provenientes de `inventario-web`.

De esta forma, aunque un pod fuera comprometido, no podría alcanzar servicios que no necesita.
