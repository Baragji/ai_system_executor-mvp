# Infrastructure & Deployment

This directory contains deployment configurations, observability setups, and infrastructure-as-code for the AI Coding Platform.

## Contents

### prometheus-alerts.yaml
Prometheus alerting rules covering:
- BFF high error rate & latency
- Database connection pool exhaustion
- Disk space monitoring
- Runner queue backlog

### deployment-sequence.mmd
Mermaid diagram showing:
- Service dependency graph
- 6-phase deployment sequence (kubectl commands)
- Health check probe configurations

## Related Files

- **Grafana Dashboards**: `../grafana/` (4 complete dashboard JSONs)
- **Database Schema**: `../database/schema.sql` (11 tables with cascades)
- **Health Checks**: `../health/` (TypeScript for each service)
- **OpenAPI Specs**: `../openapi/` (5 complete API contracts)

## Usage

### Deploy to Kubernetes
```bash
# Follow sequence in deployment-sequence.mmd
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres.yaml k8s/redis.yaml
# ... (see deployment-sequence.mmd for full sequence)
```

### Load Prometheus Alerts
```bash
kubectl create configmap prometheus-alerts \
  --from-file=prometheus-alerts.yaml \
  --namespace=monitoring
```

### Import Grafana Dashboards
```bash
# Via Grafana UI: Dashboards → Import → Upload JSON
# Or via provisioning:
cp ../grafana/*.json /var/lib/grafana/dashboards/
```

## Dependencies

- Kubernetes 1.31+
- Prometheus (metrics)
- Tempo (traces)
- Loki (logs)
- Grafana (visualization)
- PostgreSQL 16
- Redis 7.x
