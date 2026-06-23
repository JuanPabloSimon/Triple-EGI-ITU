# Triple-EGI-ITU — Ecosistema de Inventario Seguro

Sistema centralizado para inventariar las computadoras de los laboratorios de informática del ITU. La aplicación web consulta **dos bases de datos** (SQL Server para ubicación y responsables, MongoDB para hardware), autentica a los usuarios contra **Active Directory / LDAP**, y se despliega de forma contenerizada en **Kubernetes (Minikube)** aplicando políticas de red con enfoque _zero-trust_.

---

## Tabla de contenidos

- [Arquitectura](#arquitectura)
- [Flujo de datos](#flujo-de-datos)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Stack tecnológico](#stack-tecnológico)
- [Modelo de datos](#modelo-de-datos)
- [API del backend](#api-del-backend)
- [Roles y permisos](#roles-y-permisos)
- [Autenticación](#autenticación)
- [Cómo correr el proyecto en local](#cómo-correr-el-proyecto-en-local)
- [Despliegue en Minikube](#despliegue-en-minikube)
- [Seguridad de red (zero-trust)](#seguridad-de-red-zero-trust)

---

## Arquitectura

El proyecto sigue un esquema **híbrido**: la aplicación y MongoDB corren contenerizados en Kubernetes, mientras que SQL Server y Active Directory son servicios reales montados en máquinas virtuales (red `192.168.10.0/24`), detrás de un firewall pfSense que simula la DMZ perimetral.

| Servicio         | Rol                                        | Dónde corre                     | Puerto    |
| ---------------- | ------------------------------------------ | ------------------------------- | --------- |
| `inventario-web` | Aplicación web (API + frontend estático)   | Kubernetes — NodePort (30080)   | 3000      |
| `inventario-db`  | Base de datos de hardware (MongoDB)        | Kubernetes — ClusterIP          | 27017     |
| SQL Server       | Base de datos de ubicación y responsables  | VM real `192.168.10.20\ITUEGI`  | 1433      |
| Active Directory | Directorio de identidad institucional      | VM real `192.168.10.10` (`dex.local`) | 389 / 636 |
| pfSense          | Firewall perimetral (DMZ)                  | VM real `192.168.10.254`        | —         |

> El `inventario-web` se ejecuta como **un solo contenedor**: el backend Express sirve tanto la API como el frontend de React ya compilado.

## Flujo de datos

El recorrido de una consulta de inventario sigue exactamente el planteo del proyecto:

1. El usuario se autentica en `inventario-web`; las credenciales se validan contra **Active Directory / LDAP** y se emite un JWT.
2. Para listar equipos, la app consulta **SQL Server**: dónde está la máquina (aula, edificio, banco), su estado, fecha de mantenimiento y a quién está asignada.
3. Para el detalle de un equipo, la app toma el `mongo_id` que devolvió SQL Server y consulta **MongoDB** para traer los componentes de hardware (fabricante, CPU, RAM, disco, sistema operativo, periféricos, etc.).
4. La respuesta combina ambas fuentes en un único objeto que consume la interfaz.

El vínculo entre las dos bases es el campo `mongo_id` en la tabla `equipos` de SQL Server, que coincide con el `_id` del documento en MongoDB. Las bases **nunca se comunican entre sí**: la aplicación es el único puente.

## Estructura del repositorio

```
Triple-EGI-ITU/
├── app/
│   ├── inventario-api/          # Backend (Node + Express). Sirve también el front compilado.
│   │   ├── src/
│   │   │   ├── config/          # Variables de entorno centralizadas
│   │   │   ├── db/              # Conexiones a SQL Server y MongoDB
│   │   │   ├── services/        # Lógica: auth, equipos (join SQL+Mongo), LDAP (mock y real)
│   │   │   ├── routes/          # Endpoints: /auth, /equipos, /health
│   │   │   ├── middleware/      # Validación de JWT y de roles
│   │   │   ├── app.js           # Configuración de Express
│   │   │   └── server.js        # Arranque del servidor
│   │   └── Dockerfile           # Build multi-etapa (compila front + empaqueta back)
│   │
│   └── inventario-itu-client/   # Frontend (React + TypeScript + Vite)
│       └── src/
│           ├── api/             # Cliente HTTP, llamadas a /auth y /equipos
│           ├── pages/           # Login, Dashboard, Detalle
│           ├── components/      # NavBar, ProtectedRoute, CrearModal, EditarModal
│           ├── context/         # AuthContext (sesión y token)
│           ├── hooks/           # useAuth
│           ├── styles/          # CSS por vista
│           └── types/           # Tipos alineados a las dos bases
│
├── databases/
│   ├── ubicacion-db/            # SQL Server: schema + datos de ejemplo + usuarios AD
│   └── inventario-db/           # MongoDB: queries de ejemplo + seed de hardware
│
├── docs/                        # Diagramas: arquitectura, ER, flujograma
│
├── scripts/                     # Automatización de despliegue y carga de datos
│   ├── deploy.sh                # Construye la imagen y aplica los manifiestos en orden
│   └── seed-databases.sh        # Carga los seeds leyendo credenciales de los Secrets
│
└── kubernetes/                  # Manifiestos del despliegue, organizados por capas
    ├── 00-namespace/
    ├── 01-config/               # ConfigMap y Secrets
    ├── 02-storage/              # PersistentVolumeClaim (MongoDB)
    ├── 03-workloads/            # Deployments y Services (inventario-web, inventario-db)
    └── 04-network-policies/     # Políticas de red zero-trust
```

## Stack tecnológico

**Frontend:** React 19, TypeScript, Vite, React Router. Estilos en CSS plano con variables (soporta modo claro/oscuro).

**Backend:** Node.js 20, Express 4, con los drivers oficiales `mssql` (SQL Server) y `mongodb`. Autenticación con JSON Web Tokens (`jsonwebtoken`) y `ldapjs` para Active Directory.

**Bases de datos:** SQL Server 2022 (VM real) y MongoDB (contenedor).

**Identidad:** Active Directory / LDAP (`dex.local`). El backend incluye una implementación real (`ldap.real.js`) y un mock para desarrollo (`ldap.mock.js`).

**Infraestructura:** Docker, Kubernetes (Minikube con CNI Calico para que las NetworkPolicies tengan efecto), pfSense como firewall perimetral.

## Modelo de datos

### SQL Server — `inventario_ubicacion`

Cuatro tablas normalizadas:

- **`aulas`**: espacios físicos (nombre, edificio, capacidad).
- **`usuarios`**: sincronizados desde Active Directory (username, email, rol, `ldap_dn`). No se almacenan contraseñas.
- **`equipos`**: cada computadora (código de inventario, aula, banco, estado, fecha de mantenimiento, `mongo_id`).
- **`asignaciones`**: relaciona un equipo con un usuario en un período. `fecha_fin = NULL` indica la asignación vigente.

El responsable actual de un equipo no es un campo fijo: se obtiene mediante un _join_ con la asignación vigente.

Scripts de carga (en orden):

| Archivo | Contenido |
| ------- | --------- |
| `01_schema.sql` | Creación de la base y las cuatro tablas |
| `02_seed_data.sql` | Aulas, usuarios y equipos de ejemplo |
| `03_usuarios_ad.sql` | Usuarios reales de Active Directory (dba1, adminapp1, tecnico1, alumno1) |

### MongoDB — `inventario_hardware`

Colección **`equipos_hardware`**. Cada documento describe el hardware de un equipo, con estructura variable según el tipo:

- Campos comunes: `_id`, fabricante, modelo, tipo (`desktop`/`laptop`), `cpu`, `ram_gb`, `disco`, sistema operativo, periféricos.
- Solo en laptops: `bateria` (capacidad y ciclos).
- Solo en algunos equipos: `gpu`.

## API del backend

Todas las rutas de equipos requieren un JWT válido en el header `Authorization: Bearer <token>`. Las operaciones de escritura (crear, editar, eliminar) además exigen rol **admin** o **técnico**.

| Método   | Ruta            | Descripción                                                          | Auth | Rol requerido    |
| -------- | --------------- | ------------------------------------------------------------------- | ---- | ---------------- |
| `POST`   | `/auth/login`   | Valida credenciales y devuelve `{ token, usuario }`                  | No   | —                |
| `GET`    | `/equipos`      | Lista de equipos (filtrada por rol: alumno/docente ven solo los suyos) | Sí | cualquiera       |
| `GET`    | `/equipos/:id`  | Equipo con ubicación (SQL) + hardware (Mongo) combinados             | Sí   | cualquiera*      |
| `POST`   | `/equipos`      | Crea un equipo nuevo (escribe en SQL y Mongo)                        | Sí   | admin / técnico  |
| `PUT`    | `/equipos/:id`  | Edita estado, reasigna responsable o actualiza hardware             | Sí   | admin / técnico  |
| `DELETE` | `/equipos/:id`  | Elimina el equipo (borra en SQL y Mongo)                            | Sí   | admin / técnico  |
| `GET`    | `/health/live`  | Liveness probe (el proceso está vivo)                               | No   | —                |
| `GET`    | `/health/ready` | Readiness probe (200 solo si ambas bases están conectadas)         | No   | —                |

\* Alumno y docente solo pueden ver el detalle de un equipo que tengan asignado; en caso contrario la API responde 403.

Cualquier otra ruta devuelve el `index.html` del frontend, para que el ruteo del cliente (React Router) funcione incluso al recargar la página.

## Roles y permisos

El sistema diferencia cuatro roles, que se derivan de los grupos de Active Directory:

| Grupo AD | Rol en la app | Permisos |
| -------- | ------------- | -------- |
| `Grupo_BD_Admin` | admin | CRUD completo sobre todos los equipos |
| `Grupo_BD_Inventario_A` | admin | CRUD completo sobre todos los equipos |
| `Grupo_BD_Inventario_C` | técnico | CRUD completo sobre todos los equipos |
| `Grupo_BD_Inventario_R` | alumno | Solo lectura de los equipos asignados |

El control se aplica en **dos capas**: el backend valida el rol con el middleware `requireRol` antes de ejecutar cualquier escritura (responde 403 si no corresponde), y el frontend refleja eso ocultando los botones de crear, editar y eliminar a quien no tiene permiso. La seguridad real reside en el backend; el frontend solo mejora la experiencia.

## Autenticación

El login valida las credenciales contra Active Directory / LDAP y, si son correctas, emite un JWT firmado que lleva el username, el email y el rol del usuario. El frontend guarda ese token y lo envía en cada petición; el backend lo verifica en un middleware antes de permitir el acceso a los datos. El secreto de firma (`JWT_SECRET`) vive en un Secret de Kubernetes, nunca en el código.

La validación de credenciales está aislada en un único módulo intercambiable:

- **`ldap.mock.js`** — usado en desarrollo. Valida contra una lista de usuarios de prueba sin necesitar un servidor LDAP.
- **`ldap.real.js`** — implementación contra Active Directory real. Hace _bind_ con las credenciales del usuario, lee sus grupos (`memberOf`) y deriva el rol según el mapeo de grupos. Mantiene la misma firma que el mock, así que cambiar de uno a otro no toca rutas, middleware ni frontend.

Usuarios de prueba (mock):

| Usuario     | Contraseña   | Rol     |
| ----------- | ------------ | ------- |
| `admin`     | `admin123`   | admin   |
| `cmartinez` | `tecnico123` | tecnico |
| `dlopez`    | `docente123` | docente |
| `jperez`    | `alumno123`  | alumno  |

Usuarios reales en Active Directory (`dex.local`, todos con contraseña `Usuario_EGI_2026!`):

| Usuario     | Grupo AD                  | Rol     |
| ----------- | ------------------------- | ------- |
| `dba1`      | `Grupo_BD_Admin`          | admin   |
| `adminapp1` | `Grupo_BD_Inventario_A`   | admin   |
| `tecnico1`  | `Grupo_BD_Inventario_C`   | tecnico |
| `alumno1`   | `Grupo_BD_Inventario_R`   | alumno  |

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
# SQL Server (con sqlcmd o un cliente de su preferencia), en orden:
#   databases/ubicacion-db/01_schema.sql
#   databases/ubicacion-db/02_seed_data.sql
#   databases/ubicacion-db/03_usuarios_ad.sql

# MongoDB
mongoimport --db inventario_hardware --collection equipos_hardware \
  --file databases/inventario-db/seed/equipos.json --jsonArray
```

## Despliegue en Minikube

Para automatizar todo el proceso existen dos scripts en `scripts/`. La forma rápida:

```bash
export MSYS_NO_PATHCONV=1   # solo en Git Bash (Windows), evita romper rutas
./scripts/deploy.sh         # construye la imagen y aplica todos los manifiestos en orden
./scripts/seed-databases.sh # carga los datos (lee las credenciales de los Secrets)
```

A continuación, el detalle de lo que hace `deploy.sh`, por si se prefiere correrlo paso a paso.

### 1. Iniciar Minikube con un CNI compatible

Las `NetworkPolicies` solo tienen efecto con un CNI que las soporte (por ejemplo Calico). SQL Server real necesita memoria suficiente:

```bash
minikube start --driver=docker --cni=calico --memory=4096 --cpus=2
```

### 2. Construir la imagen dentro del entorno Docker de Minikube

La imagen debe construirse en el Docker de Minikube para que el cluster la encuentre (el Deployment usa `imagePullPolicy: IfNotPresent`). El Dockerfile necesita acceso a las dos carpetas (API y front), por eso el build se corre desde `app/`:

```bash
eval $(minikube docker-env)
docker build -t inventario-web:latest -f app/inventario-api/Dockerfile app/
```

### 3. Aplicar los manifiestos en orden

```bash
kubectl apply -f kubernetes/00-namespace/
kubectl apply -f kubernetes/01-config/
kubectl apply -f kubernetes/02-storage/
kubectl apply -R -f kubernetes/03-workloads/
kubectl wait --for=condition=ready pod --all -n inventario --timeout=300s
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

El namespace aplica el principio de **mínimo privilegio** mediante NetworkPolicies (requieren un CNI compatible como Calico para tener efecto):

- **`default-deny`**: bloquea todo el tráfico de entrada y salida en el namespace. Nada se comunica salvo lo explícitamente permitido.
- **`allow-web-ingress`**: permite tráfico externo entrante a `inventario-web` únicamente por el puerto 3000.
- **`allow-web-egress`**: `inventario-web` solo puede salir hacia sus dependencias (MongoDB en el cluster, y SQL Server / Active Directory en la red de VMs) en sus puertos correspondientes, más DNS.
- **`allow-web-to-inventario`**: MongoDB solo acepta conexiones provenientes de `inventario-web`.

De esta forma, aunque un pod fuera comprometido, no podría alcanzar servicios que no necesita. El firewall **pfSense** complementa este esquema controlando el tráfico perimetral entre la red de VMs y el exterior.
