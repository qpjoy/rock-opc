### 一次性把 ELK + Demo App + Prometheus + Grafana 拉起来并验证通路
```bash
cd /Users/qpjoy/workspace/qpjoy/codex_projects/opc/archives/dock/devops
cp .env.example .env

### windows
# docker compose -f compose/compose.yml -f compose/compose.windows.yml --profile full up -d
docker compose -f compose/compose.yml -f compose/compose.windows.yml --profile elk up -d
docker compose -f compose/compose.yml -f compose/compose.windows.yml --profile demo up -d
docker compose -f compose/compose.yml -f compose/compose.windows.yml --profile monitoring up -d
# docker compose -f compose/compose.yml -f compose/compose.windows.yml ps


### Linux/macOS
# docker compose -f compose/compose.yml --profile full up -d
docker compose -f compose/compose.yml --profile elk up -d
docker compose -f compose/compose.yml --profile demo up -d
docker compose -f compose/compose.yml --profile monitoring up -d
# docker compose -f compose/compose.yml ps
```
你重点看这些：
- elasticsearch Up
- kibana Up
- logstash Up
- filebeat Up
- elk-setup Exited (0)
- elk-snapshot-scheduler Up
- demo-app Up
- prometheus Up
- grafana Up

### 第二步：验证 ELK 基础

```bash
curl http://192.168.1.8:9200
curl http://192.168.1.8:9200/_cluster/health?pretty
curl http://192.168.1.8:9200/_data_stream?pretty
curl http://192.168.1.8:5601/api/status
```

### 第三步：验证 ELK 初始化结果
```bash
curl http://192.168.1.8:9200/_ilm/policy/opc-logs-policy?pretty
curl http://192.168.1.8:9200/_index_template/opc-logs-template?pretty
curl http://192.168.1.8:9200/_snapshot/opc_snapshots?pretty
```

### 第四步：验证 Demo App
```bash
curl http://192.168.1.8:8088/healthz
curl http://192.168.1.8:8088/api/catalog
curl -X POST http://192.168.1.8:8088/api/orders
curl "http://192.168.1.8:8088/api/slow?delayMs=2500"
curl http://192.168.1.8:8088/api/error
curl http://192.168.1.8:8088/api/batch
curl http://192.168.1.8:8088/metrics
```

### 第五步：验证日志是否进入 ELK
先看 Elasticsearch 里是否有 demo-app 日志：
```bash
curl "http://192.168.1.8:9200/logs-opc-default/_search?pretty&size=10"
# 更明确一点，只查 demo-app：
curl "http://192.168.1.8:9200/logs-opc-default/_search?pretty" \
  -H "Content-Type: application/json" \
  -d '{"query":{"term":{"service.keyword":"demo-app"}},"size":10,"sort":[{"@timestamp":"desc"}]}'
```
如果你本机 curl 不方便写 JSON，也可以先直接在 Kibana Discover 搜：

- service:"demo-app"
- level:"error"
- category:"performance"

### 第六步：验证 Prometheus
打开：

- http://192.168.1.8:9090/targets

确认这些 target 至少是 UP：

- prometheus
- grafana
- demo-app
- filebeat
- blackbox-http
然后在 Prometheus 查询页直接查：
```prometheusql
up
demo_http_requests_total
demo_job_queue_depth
demo_incident_mode
rate(demo_http_requests_total[5m])
rate(demo_http_request_duration_seconds_sum[5m]) / rate(demo_http_request_duration_seconds_count[5m])
```
### 第七步：验证 Grafana
打开：

-http://192.168.1.8:3000
默认账号看你的 .env，通常是：

- 用户名：admin
- 密码：admin123

进去后看 OPC DevOps Overview 仪表盘，重点确认：

- Targets Up
- ES Health
- Demo App Request Rate
- Demo App Average Latency
你可以一边刷下面这些请求，一边看 Grafana：

```bash
curl http://192.168.1.8:8088/api/catalog
curl -X POST http://192.168.1.8:8088/api/orders
curl http://192.168.1.8:8088/api/error
curl "http://192.168.1.8:8088/api/slow?delayMs=3000"
```

### 第八步：验证快照调度器
```bash
docker compose -f compose/compose.yml logs --tail=100 elk-snapshot-scheduler
#  Windows：
docker compose -f compose/compose.yml -f compose/compose.windows.yml logs --tail=100 elk-snapshot-scheduler
# 再看快照仓库：
curl http://192.168.1.8:9200/_cat/snapshots/opc_snapshots?v
```

### 第九步：给新人演示推荐顺序
按这个顺序最容易理解：

1. 打开 Grafana 仪表盘
2. 调 /api/catalog 和 /api/orders
3. 看 Grafana 请求率变化
4. 调 /api/slow?delayMs=3000
5. 看 Grafana 平均延迟上升
6. 调 /api/error
7. 再去 Kibana Discover 搜 service:"demo-app"
8. 过滤 level:"error" 看错误日志
9. 过滤 category:"performance" 看慢请求日志

这个顺序能让人直接理解：

- Grafana 先告诉你“系统变差了”
- Kibana 再告诉你“为什么变差”

### 如果启动后有问题，优先看这些日志
```bash
# ELK：
docker compose -f compose/compose.yml logs --tail=100 elasticsearch kibana logstash filebeat elk-setup
# Demo + Monitoring：
docker compose -f compose/compose.yml logs --tail=100 demo-app prometheus grafana
# Windows:
docker compose -f compose/compose.yml -f compose/compose.windows.yml logs --tail=100 demo-app prometheus grafana
```

### 目前最实用的检查结论
只要下面 4 件事成立，这套就算真正跑通了：

1. curl http://192.168.1.8:8088/api/error 返回 500
2. Kibana 能搜到 service:"demo-app" 的 error 日志
3. Prometheus 里能查到 demo_http_requests_total
4. Grafana 里 Demo App Request Rate 和 Demo App Average Latency 有数据
