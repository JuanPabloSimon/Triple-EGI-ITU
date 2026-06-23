// src/services/ldap.mock.js
//
// Mock del servidor LDAP/Active Directory institucional.
// Simula `bind` (validación de credenciales) contra el directorio.
// IMPORTANTE: cuando exista el ldap-service real, se reemplaza SOLO
// este archivo manteniendo la firma de authenticateLdap().

// Usuarios alineados con el seed de SQL Server (usuarios.ldap_dn).
// Las contraseñas viven solo acá (en LDAP real nunca se almacenan en la app).
const DIRECTORIO = [
  {
    username: "jperez",
    password: "alumno123",
    email: "jperez@itu.edu",
    rol: "alumno",
    ldap_dn: "cn=jperez,ou=alumnos,dc=itu,dc=edu",
  },
  {
    username: "mgomez",
    password: "alumno123",
    email: "mgomez@itu.edu",
    rol: "alumno",
    ldap_dn: "cn=mgomez,ou=alumnos,dc=itu,dc=edu",
  },
  {
    username: "dlopez",
    password: "docente123",
    email: "dlopez@itu.edu",
    rol: "docente",
    ldap_dn: "cn=dlopez,ou=docentes,dc=itu,dc=edu",
  },
  {
    username: "asmith",
    password: "docente123",
    email: "asmith@itu.edu",
    rol: "docente",
    ldap_dn: "cn=asmith,ou=docentes,dc=itu,dc=edu",
  },
  {
    username: "cmartinez",
    password: "tecnico123",
    email: "cmartinez@itu.edu",
    rol: "tecnico",
    ldap_dn: "cn=cmartinez,ou=tecnicos,dc=itu,dc=edu",
  },
  {
    username: "admin",
    password: "admin123",
    email: "admin@itu.edu",
    rol: "admin",
    ldap_dn: "cn=admin,ou=admins,dc=itu,dc=edu",
  },
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Valida credenciales contra el directorio simulado.
// Devuelve los datos del usuario (sin password) o null si falla el bind.
export async function authenticateLdap(username, password) {
  await delay(300); // simula la latencia de la consulta LDAP

  const entrada = DIRECTORIO.find((u) => u.username === username);
  if (!entrada || entrada.password !== password) {
    return null;
  }

  const { password: _omit, ...usuario } = entrada;
  return usuario; // { username, email, rol, ldap_dn }
}
