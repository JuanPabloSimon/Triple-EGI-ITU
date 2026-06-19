#!/usr/bin/env bash
# ============================================================
#  deploy.sh — Despliega el ecosistema EGI Inventario en Minikube
#  Construye la imagen y aplica los manifiestos en orden,
#  terminando con las network policies (candado zero-trust).
# ============================================================
set -euo pipefail

NAMESPACE="inventario"
IMAGE="inventario-web:latest"

# Ubicarse en la raíz del repo (este script vive en scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "==> Verificando herramientas..."
command -v kubectl  >/dev/null || { echo "Falta kubectl";  exit 1; }
command -v minikube >/dev/null || { echo "Falta minikube"; exit 1; }

echo "==> Verificando que Minikube esté corriendo..."
minikube status >/dev/null 2>&1 || {
  echo "Minikube no está corriendo. Iniciá con:"
  echo "  minikube start --driver=docker --cni=calico --memory=4096 --cpus=2"
  exit 1
}

echo "==> [1/6] Construyendo la imagen ${IMAGE} dentro de Minikube..."
eval "$(minikube docker-env)"
docker build -t "${IMAGE}" -f app/inventario-api/Dockerfile app/
eval "$(minikube docker-env -u)"

echo "==> [2/6] Namespace..."
kubectl apply -f kubernetes/00-namespace/

echo "==> [3/6] Config y secrets..."
kubectl apply -f kubernetes/01-config/

echo "==> [4/6] Almacenamiento (PVCs)..."
kubectl apply -f kubernetes/02-storage/

echo "==> [5/6] Workloads (deployments + services)..."
kubectl apply -R -f kubernetes/03-workloads/

echo "==> Esperando a que los pods estén listos (hasta 300s)..."
kubectl wait --for=condition=ready pod --all -n "${NAMESPACE}" --timeout=300s || \
  echo "Aviso: algún pod no quedó Ready. Revisá con: kubectl get pods -n ${NAMESPACE}"

echo "==> [6/6] Network policies (zero-trust)..."
kubectl apply -f kubernetes/04-network-policies/

echo ""
echo "==> Estado final:"
kubectl get pods -n "${NAMESPACE}"
echo ""
echo "==> URL de la aplicación:"
minikube service inventario-web -n "${NAMESPACE}" --url || true

echo ""
echo "Listo. Si es la primera vez, cargá los datos con:  ./scripts/seed-databases.sh"
