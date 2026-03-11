现在这套可以先按“一个最小可用 DevOps 观测闭环”来理解：

Elasticsearch + Logstash + Filebeat 负责“采集和存储日志”
Kibana 负责“查日志、做可视化分析”
Prometheus + exporters 负责“采集系统和服务指标”
Grafana 负责“统一看板，把指标可视化”
elk-snapshot-scheduler 负责“日志存储的备份闭环”
对应配置入口主要在：

ELK 独立编排：compose.yml
总控编排：compose.yml
Logstash pipeline：logstash.conf
Filebeat 配置：filebeat.yml
Prometheus 抓取配置：prometheus.yml
Grafana 数据源：prometheus.yml
Grafana 看板：opc-devops-overview.json
一套流程怎么理解
先用最朴素的话解释给团队新人：

应用产生日志。
Filebeat 把日志送给 Logstash。
Logstash 做格式整理后写入 Elasticsearch。
Kibana 从 Elasticsearch 里查日志。
同时 Prometheus 定时去拉各服务指标。
Grafana 从 Prometheus 里读指标做统一看板。
快照调度器定时给 Elasticsearch 做备份。
所以：

Kibana 看“日志事件”
Grafana 看“运行指标”
Prometheus 是 Grafana 的指标后端
Elasticsearch 是 Kibana 的日志后端
这就是公司项目里最常见的“两条线”：

日志链路
指标链路
先怎么测试 ELK
先确认服务状态：
cd /Users/qpjoy/workspace/qpjoy/codex_projects/opc/archives/dock/devops/modules/elk
docker compose ps
你应该重点看到：

elasticsearch Up
kibana Up
logstash Up
filebeat Up
elk-setup Exited (0)
elk-snapshot-scheduler Up
再测 Elasticsearch：
curl http://localhost:9200
curl http://localhost:9200/_cluster/health?pretty
curl http://localhost:9200/_cat/indices?v
curl http://localhost:9200/_data_stream?pretty

再测初始化结果：

curl http://localhost:9200/_ilm/policy/opc-logs-policy?pretty
curl http://localhost:9200/_index_template/opc-logs-template?pretty
curl http://localhost:9200/_snapshot/opc_snapshots?pretty
再测 Kibana：

curl http://localhost:5601/api/status
浏览器打开：

http://localhost:5601

怎么做最小 Demo
最适合给新人演示的是“打一条日志，然后在 Kibana 里查到”。

方式一，直接打 TCP JSON 到 Logstash：

Git Bash:

printf '{"service":"demo-api","level":"info","env":"dev","message":"hello opc elk demo"}\n' | nc localhost 5000

Windows PowerShell:

$client = New-Object System.Net.Sockets.TcpClient('127.0.0.1',5000)
$stream = $client.GetStream()
$writer = New-Object System.IO.StreamWriter($stream)
$writer.WriteLine('{"service":"demo-api","level":"info","env":"dev","message":"hello opc elk demo"}')
$writer.Flush()
$writer.Dispose()
$client.Dispose()

然后查：

curl "http://localhost:9200/logs-opc-default/_search?pretty&size=5"
再到 Kibana 里：

进 Discover
选数据流 logs-opc-default
搜 service:"demo-api" 或 message:"hello opc elk demo"
这样新人就能立刻理解：

我发了一条日志
它进了 Logstash
被 Elasticsearch 存起来
Kibana 能查出来
方式二，用 Filebeat 样例日志：
样例文件在 app.json.log

你可以追加一行：

echo '{"@timestamp":"2026-03-11T12:00:00Z","service":"demo-filebeat","level":"info","env":"dev","message":"filebeat demo log"}' >> /Users/qpjoy/workspace/qpjoy/codex_projects/opc/archives/dock/devops/modules/elk/samples/logs/app.json.log
然后再查 logs-opc-default。

怎么测试备份
这是给团队说明“日志不是只存，不备份”。

手动创建一次快照：

curl -X PUT "http://localhost:9200/_snapshot/opc_snapshots/manual-001?wait_for_completion=true"
curl "http://localhost:9200/_cat/snapshots/opc_snapshots?v"
如果 scheduler 正常，也可以直接看：

docker compose logs --tail=100 elk-snapshot-scheduler
新人要理解的是：

Elasticsearch 存日志
snapshot repository 负责备份
scheduler 负责定期执行
怎么把 Kibana、Grafana、Prometheus 一起讲清楚
最简单的说法是：

Kibana 是“日志分析台”
Grafana 是“指标大屏”
Prometheus 是“指标数据库”
推荐演示顺序：

在应用里制造一条业务日志
在 Kibana 搜到这条日志
再看 Grafana 上 CPU、容器、HTTP 探针指标
最后讲：日志告诉你“发生了什么”，指标告诉你“系统状态如何”
你现在 Grafana 已经有预置数据源和总览盘，打开：

http://localhost:3000
默认账号看你的 .env，通常是 admin / admin123
Prometheus：

http://localhost:9090
Grafana 总览盘里重点看：

Targets Up
ES Health
Host CPU
Container Memory
Container CPU Usage
HTTP Probe Success
Prometheus 自己也可以直接查：

up
elasticsearch_cluster_health_status
rate(container_cpu_usage_seconds_total[5m])
这样新人能理解：

Prometheus 里是原始指标查询
Grafana 是更友好的图形化
Kibana 不看这些指标，它专门看日志

怎么整合成公司项目开发流程
推荐你按这个落地顺序推团队：

每个服务统一输出 JSON 日志。
所有服务至少带上这些字段：
service
env
level
message
traceId 或 requestId
@timestamp
Filebeat/Logstash 统一采集到 Elasticsearch。
Kibana 用于排查接口错误、业务异常、链路问题。
Prometheus 采集基础指标和服务健康。
Grafana 统一做项目看板。
重要环境定时快照备份。
对新人最关键的一句话是：
“查问题先看 Grafana 有没有资源或健康异常，再去 Kibana 查同一时间段的日志细节。”

这就是公司里很常见的排障路径。

建议你做的 3 个演示案例
最适合内部培训：

接口报错案例
说明：
模拟一条 level=error 的接口日志
Kibana 搜索错误日志
Grafana 同时看 CPU/内存/HTTP 探针
目标：
让新人理解“日志查原因，指标看背景”
服务变慢案例
说明：
连续打一些请求或模拟处理慢日志
Grafana 看容器 CPU 或内存变化
Kibana 看慢日志
目标：
让新人理解“指标先报警，日志再解释”
备份恢复意识案例
说明：
手动做一次 snapshot
查看 snapshot 列表
展示恢复文档 restore-drill.md
目标：
让团队从一开始就接受“运维不是只会启动服务，还要能恢复”

目前版本还需要优化的点
这是当前最值得继续做的部分：

Logstash 还比较轻。
建议：
增加标准字段清洗
统一 traceId/requestId
针对 Nginx、Node、Java、Python 分 pipeline
Kibana 侧还缺预置对象。
建议：
增加 saved search
增加常用 dashboard
增加 index pattern / data view 初始化说明
Prometheus 监控还偏基础。
建议：
增加 Elasticsearch 更细粒度 exporter 指标解释
增加 Alertmanager
增加 Node 应用自己的 /metrics
Grafana 看板还偏总览。
建议：
单独做 ELK 专题看板
做应用服务专题看板
做错误率 / 延迟 / 吞吐量看板
缺少业务应用接入样例。
这是最重要的缺口之一。
建议你下一步直接加一个 demo-app：
输出 JSON 日志
暴露 /metrics
提供几个故意报错和慢请求接口
这样新人一跑就懂整套链路。
Nginx 还没作为统一入口真正接管。
建议后面做：
/kibana
/grafana
/prometheus
统一反代
这样更像公司真实内网环境。
Windows 兼容虽然已增强，但仍要实机回归。
重点回归：
snapshot 卷权限
Docker Desktop 卷行为
Git Bash 与 PowerShell 的演示命令
我建议你下一步最值得做的事
不是先碰 Jenkins/GitLab，而是先把“新人可演示、团队可复用”的观测样板补齐：

加一个 demo-app
加一套 Kibana saved objects
加一套 Grafana ELK 专题 dashboard
加一份“10 分钟上手演示文档”
如果你愿意，我下一轮可以直接继续做这 4 项里的前 2 项，先给这个运维模块补一个真正可培训、可演示的最小业务样板。
