-- ============================================================
--  EGI Inventario — Datos de ejemplo
--  Archivo: 02_seed_data.sql
-- ============================================================

USE inventario_ubicacion;
GO

-- Aulas
INSERT INTO aulas (nombre, edificio, capacidad) VALUES
    ('Laboratorio A',   'Edificio Informática', 30),
    ('Laboratorio B',   'Edificio Informática', 25),
    ('Laboratorio C',   'Anexo Norte',          20),
    ('Sala de Servidores', 'Edificio Central',   5);

-- Usuarios (sincronizados desde LDAP)
INSERT INTO usuarios (username, email, rol, ldap_dn) VALUES
    ('jperez',    'jperez@itu.edu',    'alumno',  'cn=jperez,ou=alumnos,dc=itu,dc=edu'),
    ('mgomez',    'mgomez@itu.edu',    'alumno',  'cn=mgomez,ou=alumnos,dc=itu,dc=edu'),
    ('dlopez',    'dlopez@itu.edu',    'docente', 'cn=dlopez,ou=docentes,dc=itu,dc=edu'),
    ('asmith',    'asmith@itu.edu',    'docente', 'cn=asmith,ou=docentes,dc=itu,dc=edu'),
    ('cmartinez', 'cmartinez@itu.edu', 'tecnico', 'cn=cmartinez,ou=tecnicos,dc=itu,dc=edu'),
    ('admin',     'admin@itu.edu',     'admin',   'cn=admin,ou=admins,dc=itu,dc=edu');

-- Equipos (mongo_id corresponde al _id en MongoDB)
INSERT INTO equipos (codigo_inventario, aula_id, numero_banco, fecha_mantenimiento, estado, mongo_id) VALUES
    ('EQ-001', 1, 1,  '2025-03-15', 'activo',        'EQ-001'),
    ('EQ-002', 1, 2,  '2025-03-15', 'activo',        'EQ-002'),
    ('EQ-003', 1, 3,  '2025-01-10', 'mantenimiento', 'EQ-003'),
    ('EQ-004', 2, 1,  '2025-04-01', 'activo',        'EQ-004'),
    ('EQ-005', 2, 2,  NULL,         'activo',        'EQ-005'),
    ('EQ-006', 3, 1,  '2024-12-20', 'activo',        'EQ-006'),
    ('EQ-007', 3, 2,  '2025-05-01', 'baja',          'EQ-007'),
    ('EQ-008', 1, 4,  '2025-03-15', 'activo',        'EQ-008');

-- Asignaciones
INSERT INTO asignaciones (equipo_id, usuario_id, fecha_inicio, fecha_fin, tipo) VALUES
    (1, 1, '2025-03-01', NULL,         'alumno'),   -- EQ-001 → jperez (activa)
    (2, 2, '2025-03-01', NULL,         'alumno'),   -- EQ-002 → mgomez (activa)
    (4, 3, '2025-02-15', NULL,         'docente'),  -- EQ-004 → dlopez (activa)
    (5, 4, '2025-01-20', '2025-04-30', 'docente'),  -- EQ-005 → asmith (cerrada)
    (8, 5, '2025-04-01', NULL,         'tecnico');  -- EQ-008 → cmartinez (activa)
GO

-- ============================================================
--  Queries de verificación y uso frecuente
-- ============================================================

-- Ver equipo completo con aula y responsable actual
SELECT
    e.codigo_inventario,
    a.nombre          AS aula,
    a.edificio,
    e.numero_banco,
    e.fecha_mantenimiento,
    e.estado,
    e.mongo_id,
    u.username        AS responsable,
    u.rol,
    asig.tipo         AS tipo_asignacion
FROM equipos e
JOIN aulas a            ON e.aula_id    = a.id
LEFT JOIN asignaciones asig ON asig.equipo_id = e.id AND asig.fecha_fin IS NULL
LEFT JOIN usuarios u    ON asig.usuario_id = u.id
ORDER BY a.nombre, e.numero_banco;
GO
