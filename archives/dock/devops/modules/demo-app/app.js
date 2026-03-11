const http = require('http');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { randomUUID } = require('crypto');

const port = Number(process.env.PORT || 8088);
const logDir = process.env.LOG_DIR || path.join(__dirname, 'runtime', 'logs');
const logFile = path.join(logDir, 'demo-app.log');

fs.mkdirSync(logDir, { recursive: true });

const counters = new Map();
const histograms = new Map();

const runtimeState = {
  jobQueueDepth: 3,
  lastOrderId: 1200,
  incidentMode: false,
};

function nowIso() {
  return new Date().toISOString();
}

function incCounter(name, labels, value = 1) {
  const key = `${name}|${JSON.stringify(labels)}`;
  counters.set(key, {
    name,
    labels,
    value: (counters.get(key)?.value || 0) + value,
  });
}

function observeHistogram(name, labels, value) {
  const key = `${name}|${JSON.stringify(labels)}`;
  const current = histograms.get(key) || {
    name,
    labels,
    sum: 0,
    count: 0,
  };
  current.sum += value;
  current.count += 1;
  histograms.set(key, current);
}

function escapeLabel(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function labelString(labels) {
  const entries = Object.entries(labels || {});
  if (!entries.length) return '';
  return `{${entries.map(([k, v]) => `${k}="${escapeLabel(v)}"`).join(',')}}`;
}

function metricsText() {
  const lines = [
    '# HELP demo_http_requests_total Total HTTP requests by route and status.',
    '# TYPE demo_http_requests_total counter',
  ];

  for (const metric of counters.values()) {
    lines.push(`${metric.name}${labelString(metric.labels)} ${metric.value}`);
  }

  lines.push(
    '# HELP demo_http_request_duration_seconds Request duration in seconds.',
    '# TYPE demo_http_request_duration_seconds summary'
  );

  for (const metric of histograms.values()) {
    lines.push(`${metric.name}_sum${labelString(metric.labels)} ${metric.sum}`);
    lines.push(`${metric.name}_count${labelString(metric.labels)} ${metric.count}`);
  }

  lines.push(
    '# HELP demo_job_queue_depth Simulated async job queue depth.',
    '# TYPE demo_job_queue_depth gauge',
    `demo_job_queue_depth ${runtimeState.jobQueueDepth}`,
    '# HELP demo_incident_mode Incident toggle for training demos.',
    '# TYPE demo_incident_mode gauge',
    `demo_incident_mode ${runtimeState.incidentMode ? 1 : 0}`
  );

  return `${lines.join('\n')}\n`;
}

function writeLog(entry) {
  const line = JSON.stringify({
    '@timestamp': nowIso(),
    service: 'demo-app',
    env: 'devops-demo',
    ...entry,
  });

  fs.appendFileSync(logFile, `${line}\n`, 'utf8');
  process.stdout.write(`${line}\n`);
}

function sendJson(res, statusCode, body, route, startedAt) {
  const durationSeconds = (performance.now() - startedAt) / 1000;
  const status = String(statusCode);
  incCounter('demo_http_requests_total', { route, status });
  observeHistogram('demo_http_request_duration_seconds', { route }, durationSeconds);
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function parseUrl(req) {
  return new URL(req.url, `http://${req.headers.host || 'localhost'}`);
}

function simulateCatalog() {
  return {
    products: [
      { id: 'sku-1001', name: 'ops-agent', price: 199, tags: ['logging', 'node'] },
      { id: 'sku-1002', name: 'metrics-proxy', price: 399, tags: ['prometheus', 'gateway'] },
      { id: 'sku-1003', name: 'event-stream', price: 299, tags: ['queue', 'analytics'] },
    ],
  };
}

function scheduleBackgroundLogs() {
  setInterval(() => {
    runtimeState.jobQueueDepth = (runtimeState.jobQueueDepth + 1) % 8;
    writeLog({
      level: 'info',
      category: 'scheduler',
      message: 'background reconciliation completed',
      queueDepth: runtimeState.jobQueueDepth,
      worker: 'reconcile-orders',
    });
  }, 20000);
}

const server = http.createServer(async (req, res) => {
  const startedAt = performance.now();
  const url = parseUrl(req);
  const route = url.pathname;
  const requestId = randomUUID();

  try {
    if (route === '/healthz') {
      writeLog({
        level: 'info',
        category: 'health',
        message: 'health check',
        requestId,
      });
      return sendJson(res, 200, { ok: true, requestId }, route, startedAt);
    }

    if (route === '/metrics') {
      res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' });
      return res.end(metricsText());
    }

    if (route === '/api/catalog') {
      const payload = simulateCatalog();
      writeLog({
        level: 'info',
        category: 'catalog',
        message: 'catalog requested',
        requestId,
        itemCount: payload.products.length,
      });
      return sendJson(res, 200, payload, route, startedAt);
    }

    if (route === '/api/orders') {
      runtimeState.lastOrderId += 1;
      runtimeState.jobQueueDepth += 1;
      const order = {
        id: runtimeState.lastOrderId,
        userId: `u-${runtimeState.lastOrderId % 5}`,
        amount: 120 + (runtimeState.lastOrderId % 7) * 35,
        status: 'created',
        tags: ['demo', 'order'],
      };
      writeLog({
        level: 'info',
        category: 'order',
        message: 'order created',
        requestId,
        order,
        queueDepth: runtimeState.jobQueueDepth,
      });
      return sendJson(res, 201, { ok: true, order, requestId }, route, startedAt);
    }

    if (route === '/api/slow') {
      const delayMs = Number(url.searchParams.get('delayMs') || 1800);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      writeLog({
        level: 'warn',
        category: 'performance',
        message: 'slow request simulated',
        requestId,
        delayMs,
      });
      return sendJson(res, 200, { ok: true, delayMs, requestId }, route, startedAt);
    }

    if (route === '/api/error') {
      runtimeState.incidentMode = true;
      writeLog({
        level: 'error',
        category: 'payment',
        message: 'simulated payment gateway timeout',
        requestId,
        errorCode: 'PAYMENT_TIMEOUT',
        upstream: 'gateway-x',
      });
      return sendJson(
        res,
        500,
        { ok: false, error: 'PAYMENT_TIMEOUT', message: 'simulated payment gateway timeout', requestId },
        route,
        startedAt
      );
    }

    if (route === '/api/batch') {
      const events = [
        { type: 'inventory.adjusted', sku: 'sku-1001', delta: -3 },
        { type: 'shipment.created', shipmentId: `ship-${Date.now()}` },
        { type: 'customer.tagged', customerId: 'c-204', tag: 'vip' },
      ];
      writeLog({
        level: 'info',
        category: 'batch',
        message: 'batch events emitted',
        requestId,
        events,
      });
      return sendJson(res, 202, { ok: true, events, requestId }, route, startedAt);
    }

    if (route === '/api/reset') {
      runtimeState.incidentMode = false;
      runtimeState.jobQueueDepth = 2;
      writeLog({
        level: 'info',
        category: 'control',
        message: 'demo runtime reset',
        requestId,
      });
      return sendJson(res, 200, { ok: true, requestId }, route, startedAt);
    }

    writeLog({
      level: 'warn',
      category: 'http',
      message: 'route not found',
      requestId,
      route,
    });
    return sendJson(res, 404, { ok: false, message: 'not found', requestId }, route, startedAt);
  } catch (error) {
    writeLog({
      level: 'error',
      category: 'server',
      message: 'unhandled demo-app exception',
      requestId,
      error: {
        name: error.name,
        message: error.message,
      },
    });
    return sendJson(res, 500, { ok: false, message: error.message, requestId }, route, startedAt);
  }
});

server.listen(port, '0.0.0.0', () => {
  writeLog({
    level: 'info',
    category: 'bootstrap',
    message: 'demo-app started',
    port,
    logFile,
  });
});

scheduleBackgroundLogs();
