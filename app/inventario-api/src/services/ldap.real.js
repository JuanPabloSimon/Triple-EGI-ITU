// src/services/ldap.real.js
//
// Implementación real de autenticación contra Active Directory.
// Reemplazo directo de ldap.mock.js: mantiene la firma authenticateLdap(username, password)
// y devuelve el mismo objeto { username, email, rol, ldap_dn } o null.

import ldap from 'ldapjs';
import { env } from '../config/env.js';

// Mapeo de grupos AD → roles de la app
const MAPEO_GRUPOS_A_ROLES = [
  { grupo: 'Grupo_BD_Admin', rol: 'admin' },
  { grupo: 'Grupo_BD_Inventario_A', rol: 'admin' },
  { grupo: 'Grupo_BD_Inventario_C', rol: 'tecnico' },
  { grupo: 'Grupo_BD_Inventario_R', rol: 'alumno' }
];

function determinarRol(memberOfArray) {
  if (!memberOfArray) return 'alumno';
  const arr = Array.isArray(memberOfArray) ? memberOfArray : [memberOfArray];
  for (const mapeo of MAPEO_GRUPOS_A_ROLES) {
    const enGrupo = arr.some(dn => dn.includes(`CN=${mapeo.grupo}`));
    if (enGrupo) return mapeo.rol;
  }
  return 'alumno';
}

function nuevaConexion() {
  return ldap.createClient({
    url: env.ldap.url,
    timeout: 5000,
    connectTimeout: 5000
  });
}

function bindAsync(client, dn, password) {
  return new Promise((resolve, reject) => {
    client.bind(dn, password, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function searchAsync(client, baseDN, filter, attrs) {
  return new Promise((resolve, reject) => {
    const opts = { filter, scope: 'sub', attributes: attrs };
    client.search(baseDN, opts, (err, res) => {
      if (err) return reject(err);
      const entries = [];
      res.on('searchEntry', (entry) => {
        const obj = { dn: entry.objectName };
        entry.attributes.forEach(attr => {
          obj[attr.type] = attr.values.length === 1 ? attr.values[0] : attr.values;
        });
        entries.push(obj);
      });
      res.on('error', (e) => reject(e));
      res.on('end', () => resolve(entries));
    });
  });
}

export async function authenticateLdap(username, password) {
  if (!username || !password) return null;

  // PRIMER BIND: con la cuenta de servicio
  const cliente = nuevaConexion();
  try {
    await bindAsync(cliente, env.ldap.bindDN, env.ldap.bindPassword);
  } catch (err) {
    console.error('[ldap.real] bind del servicio falló:', err.message);
    cliente.unbind(() => {});
    return null;
  }

  // SEARCH: buscar al usuario por sAMAccountName
  let usuarioLDAP;
  try {
    const entries = await searchAsync(
      cliente,
      env.ldap.baseDN,
      `(sAMAccountName=${username})`,
      ['sAMAccountName', 'mail', 'memberOf', 'distinguishedName']
    );
    if (entries.length === 0) {
      cliente.unbind(() => {});
      return null;
    }
    usuarioLDAP = entries[0];
  } catch (err) {
    console.error('[ldap.real] search falló:', err.message);
    cliente.unbind(() => {});
    return null;
  }
  cliente.unbind(() => {});

  // SEGUNDO BIND: con las credenciales del usuario
  const dnUsuario = usuarioLDAP.distinguishedName || usuarioLDAP.dn;
  if (!dnUsuario) return null;

  const clienteUsuario = nuevaConexion();
  try {
    await bindAsync(clienteUsuario, dnUsuario, password);
  } catch (err) {
    if (err.code === 49 || /invalid credentials/i.test(err.message || '')) {
      clienteUsuario.unbind(() => {});
      return null;
    }
    console.error('[ldap.real] bind del usuario falló:', err.message);
    clienteUsuario.unbind(() => {});
    return null;
  }
  clienteUsuario.unbind(() => {});

  // Bind OK → mismo contrato que el mock
  return {
    username: usuarioLDAP.sAMAccountName,
    email: usuarioLDAP.mail || `${usuarioLDAP.sAMAccountName}@dex.local`,
    rol: determinarRol(usuarioLDAP.memberOf),
    ldap_dn: dnUsuario
  };
}
