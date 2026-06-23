#!/usr/bin/env bash
# ============================================================
#  seed-databases.sh — Carga datos en SQL Server y MongoDB
#  Lee las credenciales directamente de los Secrets (no las
#  hardcodea). Pensado para correr UNA vez sobre bases recién
#  creadas. Para re-ejecutar, borrar los PVCs y volver a desplegar.
# ============================================================
set -euo pipefail

NAMESPACE="inventario"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "==> Leyendo credenciales desde los Secrets..."
SQL_PW=$(kubectl get secret ubicacion-db-secret -n "$NAMESPACE" -o jsonpath='{.data.password}' | base64 -d)
MONGO_USER=$(kubectl get secret inventario-db-secret -n "$NAMESPACE" -o jsonpath='{.data.MONGO_INITDB_ROOT_USERNAME}' | base64 -d)
MONGO_PW=$(kubectl get secret inventario-db-secret -n "$NAMESPACE" -o jsonpath='{.data.MONGO_INITDB_ROOT_PASSWORD}' | base64 -d)

# ── SQL Server ──────────────────────────────────────────────
echo "==> [SQL] Buscando el pod..."
SQLPOD=$(kubectl get pod -l app=ubicacion-db -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')

# Detectar la ruta de sqlcmd (imágenes nuevas: mssql-tools18 + -C)
if kubectl exec -n "$NAMESPACE" "$SQLPOD" -- test -f /opt/mssql-tools18/bin/sqlcmd 2>/dev/null; then
  SQLCMD="/opt/mssql-tools18/bin/sqlcmd"; TRUST="-C"
else
  SQLCMD="/opt/mssql-tools/bin/sqlcmd"; TRUST=""
fi

echo "==> [SQL] Esperando a que SQL Server acepte conexiones..."
for i in $(seq 1 30); do
  if kubectl exec -n "$NAMESPACE" "$SQLPOD" -- "$SQLCMD" -S localhost -U sa -P "$SQL_PW" $TRUST -Q "SELECT 1" >/dev/null 2>&1; then
    echo "    SQL Server listo."
    break
  fi
  sleep 5
  if [ "$i" -eq 30 ]; then echo "    SQL Server no respondió a tiempo."; exit 1; fi
done

echo "==> [SQL] Copiando y ejecutando scripts..."
kubectl cp databases/ubicacion-db/01_schema.sql    "$NAMESPACE/$SQLPOD:/tmp/01_schema.sql"
kubectl cp databases/ubicacion-db/02_seed_data.sql "$NAMESPACE/$SQLPOD:/tmp/02_seed_data.sql"
kubectl exec -n "$NAMESPACE" "$SQLPOD" -- "$SQLCMD" -S localhost -U sa -P "$SQL_PW" $TRUST -i /tmp/01_schema.sql
kubectl exec -n "$NAMESPACE" "$SQLPOD" -- "$SQLCMD" -S localhost -U sa -P "$SQL_PW" $TRUST -i /tmp/02_seed_data.sql
echo "    SQL cargado."

# ── MongoDB ─────────────────────────────────────────────────
echo "==> [Mongo] Buscando el pod..."
MONGOPOD=$(kubectl get pod -l app=inventario-db -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}')

echo "==> [Mongo] Importando documentos..."
kubectl cp databases/inventario-db/seed/equipos.json "$NAMESPACE/$MONGOPOD:/tmp/equipos.json"
kubectl exec -n "$NAMESPACE" "$MONGOPOD" -- mongoimport \
  --username "$MONGO_USER" --password "$MONGO_PW" --authenticationDatabase admin \
  --db inventario_hardware --collection equipos_hardware \
  --file /tmp/equipos.json --jsonArray --drop
echo "    Mongo cargado."

echo ""
echo "Seed completado. (LDAP no se carga: el backend usa un mock por ahora.)"
