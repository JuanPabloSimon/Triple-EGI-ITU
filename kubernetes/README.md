# kubernetes/

Manifiestos del ecosistema EGI Inventario. Deployment y Service van en
archivos separados: el "contrato" son las etiquetas (selector del Service =
labels del pod del Deployment).

## Orden de carga

```bash
kubectl apply -f kubernetes/00-namespace/
kubectl apply -f kubernetes/01-config/
kubectl apply -f kubernetes/02-storage/
kubectl apply -R -f kubernetes/03-workloads/
kubectl wait --for=condition=ready pod --all -n inventario --timeout=180s
kubectl apply -f kubernetes/04-network-policies/
```

## Verificacion

```bash
kubectl get pods -n inventario
kubectl get endpoints -n inventario   # si un Service da <none>: labels no coinciden
```

## Pendientes (TODO)
- Imagen y puerto reales de inventario-web.
- LDIF real en 03-workloads/ldap/bootstrap-configmap.yaml.
