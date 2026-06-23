-- ============================================================
--  EGI Inventario — Base de datos de ubicación y responsables
--  Motor: SQL Server 2022
--  Archivo: 01_schema.sql
-- ============================================================

CREATE DATABASE inventario_ubicacion;
GO
USE inventario_ubicacion;
GO

-- ------------------------------------------------------------
--  Tabla: AULAS
--  Registra los espacios físicos donde están los equipos
-- ------------------------------------------------------------
CREATE TABLE aulas (
    id        INT           IDENTITY(1,1) PRIMARY KEY,
    nombre    VARCHAR(100)  NOT NULL,          -- Ej: "Laboratorio A"
    edificio  VARCHAR(100)  NOT NULL,
    capacidad INT           NOT NULL CHECK (capacidad > 0)
);

-- ------------------------------------------------------------
--  Tabla: USUARIOS
--  Sincronizados desde LDAP; no se guardan contraseñas
-- ------------------------------------------------------------
CREATE TABLE usuarios (
    id       INT           IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(100)  NOT NULL UNIQUE,
    email    VARCHAR(200)  NOT NULL UNIQUE,
    rol      VARCHAR(20)   NOT NULL CHECK (rol IN ('alumno','docente','tecnico','admin')),
    ldap_dn  VARCHAR(300)  NOT NULL   -- DN completo del objeto LDAP
);

-- ------------------------------------------------------------
--  Tabla: EQUIPOS
--  Cada fila es una computadora.
--  mongo_id vincula con el documento de hardware en MongoDB.
-- ------------------------------------------------------------
CREATE TABLE equipos (
    id                  INT           IDENTITY(1,1) PRIMARY KEY,
    codigo_inventario   VARCHAR(50)   NOT NULL UNIQUE,   -- Ej: "EQ-001"
    aula_id             INT           NOT NULL REFERENCES aulas(id),
    numero_banco        INT           NOT NULL CHECK (numero_banco > 0),
    fecha_mantenimiento DATE,
    estado              VARCHAR(20)   NOT NULL DEFAULT 'activo'
                        CHECK (estado IN ('activo','baja','mantenimiento')),
    mongo_id            VARCHAR(50)   NOT NULL UNIQUE    -- _id del doc en MongoDB
);

-- ------------------------------------------------------------
--  Tabla: ASIGNACIONES
--  Relaciona un equipo con un usuario en un período dado.
--  fecha_fin = NULL indica asignación vigente.
-- ------------------------------------------------------------
CREATE TABLE asignaciones (
    id           INT         IDENTITY(1,1) PRIMARY KEY,
    equipo_id    INT         NOT NULL REFERENCES equipos(id),
    usuario_id   INT         NOT NULL REFERENCES usuarios(id),
    fecha_inicio DATE        NOT NULL DEFAULT GETDATE(),
    fecha_fin    DATE,       -- NULL = asignación activa
    tipo         VARCHAR(20) NOT NULL CHECK (tipo IN ('alumno','docente','tecnico'))
);

-- Índices de rendimiento
CREATE INDEX idx_equipos_aula     ON equipos(aula_id);
CREATE INDEX idx_asign_equipo     ON asignaciones(equipo_id);
CREATE INDEX idx_asign_usuario    ON asignaciones(usuario_id);
CREATE INDEX idx_asign_vigente    ON asignaciones(equipo_id) WHERE fecha_fin IS NULL;
GO
