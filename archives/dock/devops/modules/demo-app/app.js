'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

const port = Number(process.env.PORT || 8088);
const envName = process.env.APP_ENV || 'dev';
const serviceVersion = process.env.SERVICE_VERSION || '0.1.0';
const serviceName = 'demo-app';
const logFile = process.env.LOG_FILE || '/var/log/demo-app/demo-app.ndjson';

fs.mkdirSync(path.dirname(logFile), { recursive: true });

const state = {
  requestCount: 0,
  orderCount: 0,
  errorCount: 0,
};

function randomId(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

function nowIso() {
  return new Date().toISOString();
}

function writeLog(payload) {
  const entry = {
    '@timestamp': nowIso(),
    ecs: { version: '8.11.0' },
    service: {
      name: serviceName,
      version: serviceVersion,
      environment: envName,
    },
    host: { hostname: process.env.HOSTNAME || 'demo-app' },
    labels: {
      environment: envName,
    },
    ...payload,
  };

  const line = `${JSON.stringify(entry)}\n`;
  process.stdout.write(line);
  fs.appendFileSync(logFile, line, 'utf8');
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body, null, 2));
}

function sendHtml(response, fileName) {
  const filePath = path.join(__dirname, 'public', fileName);
  const html = fs.readFileSync(filePath, 'utf8');
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end(html);
}

function baseContext(request, urlObject) {
  const requestId = request.headers['x-request-id'] || randomId('req');
  const traceId = request.headers['x-trace-id'] || crypto.randomBytes(16).toString('hex');

  return {
    requestId,
    trace: { id: traceId },
    url: {
      path: urlObject.pathname,
      query: urlObject.searchParams.toString(),
    },
    http: {
      request: {
        method: request.method,
      },
    },
    client: {
      ip: request.socket.remoteAddress,
    },
  };
}

function logRequest(request, urlObject, statusCode, startedAt, extra = {}) {
  const durationMs = Date.now() - startedAt;
  const context = baseContext(request, urlObject);
  writeLog({
    ...context,
    message: extra.message || `Handled ${request.method} ${urlObject.pathname}`,
    log: { level: extra.level || 'info' },
    event: {
      category: extra.category || 'web',
      action: extra.action || urlObject.pathname,
      outcome: statusCode >= 500 ? 'failure' : 'success',
      duration: durationMs * 1000000,
    },
    http: {
      ...context.http,
      response: {
        status_code: statusCode,
      },
    },
    labels: {
      ...extra.labels,
      environment: envName,
      demo_scenario: extra.demoScenario || (extra.labels && extra.labels.demo_scenario) || 'default',
    },
    tags: extra.tags || ['demo'],
    related: extra.related,
    error: extra.error,
    order: extra.order,
    inventory: extra.inventory,
    security: extra.security,
    metrics: extra.metrics,
  });
}

async function handleCatalog(request, response, urlObject) {
  const startedAt = Date.now();
  state.requestCount += 1;
  const products = [
    { sku: 'opc-keyboard', price: 299, stock: 12, category: 'hardware' },
    { sku: 'opc-monitor', price: 1499, stock: 4, category: 'hardware' },
    { sku: 'opc-support', price: 999, stock: 999, category: 'service' },
  ];
  logRequest(request, urlObject, 200, startedAt, {
    category: 'catalog',
    action: 'catalog.list',
    message: 'Catalog loaded',
    labels: { catalog_size: String(products.length) },
    metrics: { result_count: products.length },
  });
  sendJson(response, 200, { ok: true, products });
}

async function handleOrders(request, response, urlObject) {
  const startedAt = Date.now();
  state.requestCount += 1;
  state.orderCount += 1;
  const orderId = randomId('ord');
  const userId = randomId('user');
  const order = {
    id: orderId,
    userId,
    amount: 1888,
    currency: 'CNY',
    items: [
      { sku: 'opc-monitor', quantity: 1 },
      { sku: 'opc-support', quantity: 1 },
    ],
  };

  logRequest(request, urlObject, 201, startedAt, {
    category: 'order',
    action: 'order.create',
    message: 'Order placed',
    demoScenario: 'order-flow',
    labels: {
      order_status: 'confirmed',
    },
    tags: ['demo', 'order'],
    order,
    inventory: {
      warehouse: 'hz-a1',
      reservationId: randomId('res'),
      reservedSkus: ['opc-monitor'],
    },
    related: { user: [userId] },
  });

  sendJson(response, 201, { ok: true, order });
}

async function handleSlow(request, response, urlObject) {
  const startedAt = Date.now();
  state.requestCount += 1;
  const delayMs = Math.max(100, Number(urlObject.searchParams.get('delayMs') || 2200));

  await new Promise((resolve) => setTimeout(resolve, delayMs));

  logRequest(request, urlObject, 200, startedAt, {
    level: 'warn',
    category: 'performance',
    action: 'request.slow',
    message: 'Slow request simulated',
    demoScenario: 'slow-request',
    tags: ['demo', 'performance'],
    metrics: {
      delay_ms: delayMs,
      threshold_ms: 1000,
    },
  });

  sendJson(response, 200, { ok: true, delayMs });
}

async function handleError(request, response, urlObject) {
  const startedAt = Date.now();
  state.requestCount += 1;
  state.errorCount += 1;
  const errorCode = 'PAYMENT_TIMEOUT';

  logRequest(request, urlObject, 500, startedAt, {
    level: 'error',
    category: 'payment',
    action: 'payment.capture',
    message: 'Downstream payment gateway timeout',
    demoScenario: 'error',
    tags: ['demo', 'error', 'payment'],
    error: {
      type: 'GatewayTimeoutError',
      code: errorCode,
      message: 'Payment gateway timeout after 3 retries',
      stack_trace: 'GatewayTimeoutError: Payment gateway timeout after 3 retries',
    },
    related: { hosts: ['payments.internal'] },
  });

  sendJson(response, 500, {
    ok: false,
    errorCode,
    message: 'Payment gateway timeout after 3 retries',
  });
}

async function handleSecurity(request, response, urlObject) {
  const startedAt = Date.now();
  state.requestCount += 1;
  const outcome = urlObject.searchParams.get('outcome') || 'failure';
  const allowed = outcome === 'success';

  logRequest(request, urlObject, allowed ? 200 : 401, startedAt, {
    level: allowed ? 'info' : 'warn',
    category: 'authentication',
    action: 'user.login',
    message: allowed ? 'Login accepted' : 'Login rejected due to invalid token',
    demoScenario: 'security',
    tags: ['demo', 'security'],
    security: {
      outcome,
      reason: allowed ? 'token-valid' : 'token-expired',
    },
  });

  sendJson(response, allowed ? 200 : 401, {
    ok: allowed,
    outcome,
  });
}

async function handleBatch(request, response, urlObject) {
  const startedAt = Date.now();
  state.requestCount += 1;

  writeLog({
    message: 'Nightly reconciliation batch finished',
    log: { level: 'info' },
    event: {
      category: 'batch',
      action: 'billing.reconcile',
      outcome: 'success',
    },
    labels: {
      environment: envName,
      demo_scenario: 'batch-job',
      batch_name: 'billing-reconcile',
    },
    metrics: {
      processed_records: 1280,
      failed_records: 3,
      duration_ms: 932,
    },
    batch: {
      jobId: randomId('job'),
      workerCount: 4,
      partitions: ['p0', 'p1', 'p2', 'p3'],
    },
  });

  logRequest(request, urlObject, 200, startedAt, {
    category: 'batch',
    action: 'batch.trigger',
    message: 'Batch scenario emitted',
    demoScenario: 'batch-job',
    tags: ['demo', 'batch'],
  });

  sendJson(response, 200, { ok: true, emitted: 'batch-job' });
}

async function handleReset(request, response, urlObject) {
  const startedAt = Date.now();
  state.requestCount = 0;
  state.orderCount = 0;
  state.errorCount = 0;
  logRequest(request, urlObject, 200, startedAt, {
    category: 'ops',
    action: 'demo.reset',
    message: 'Demo state reset',
    demoScenario: 'reset',
    tags: ['demo', 'ops'],
  });
  sendJson(response, 200, { ok: true, state });
}

async function handleHealth(request, response, urlObject) {
  const startedAt = Date.now();
  logRequest(request, urlObject, 200, startedAt, {
    category: 'health',
    action: 'health.check',
    message: 'Health check',
    demoScenario: 'health',
    tags: ['demo', 'health'],
  });
  sendJson(response, 200, { ok: true, service: serviceName, version: serviceVersion });
}

function route(request, response) {
  const urlObject = new URL(request.url, `http://${request.headers.host || `127.0.0.1:${port}`}`);
  const run = (handler) => {
    Promise.resolve(handler(request, response, urlObject)).catch((error) => {
      writeLog({
        message: 'Demo app handler failed',
        log: { level: 'error' },
        event: {
          category: 'ops',
          action: 'request.unhandled',
          outcome: 'failure',
        },
        error: {
          type: error.name,
          message: error.message,
          stack_trace: error.stack,
        },
        labels: {
          environment: envName,
          demo_scenario: 'unhandled',
        },
      });
      sendJson(response, 500, { ok: false, message: 'Unhandled demo-app error' });
    });
  };

  if (request.method === 'GET' && urlObject.pathname === '/') {
    sendHtml(response, 'index.html');
    return;
  }

  if (request.method === 'GET' && urlObject.pathname === '/healthz') {
    run(handleHealth);
    return;
  }

  if (request.method === 'GET' && urlObject.pathname === '/api/catalog') {
    run(handleCatalog);
    return;
  }

  if (request.method === 'POST' && urlObject.pathname === '/api/orders') {
    run(handleOrders);
    return;
  }

  if (request.method === 'GET' && urlObject.pathname === '/api/slow') {
    run(handleSlow);
    return;
  }

  if (request.method === 'GET' && urlObject.pathname === '/api/error') {
    run(handleError);
    return;
  }

  if (request.method === 'GET' && urlObject.pathname === '/api/security') {
    run(handleSecurity);
    return;
  }

  if (request.method === 'GET' && urlObject.pathname === '/api/batch') {
    run(handleBatch);
    return;
  }

  if (request.method === 'POST' && urlObject.pathname === '/api/reset') {
    run(handleReset);
    return;
  }

  sendJson(response, 404, { ok: false, message: 'Not found' });
}

writeLog({
  message: 'Demo app booted',
  log: { level: 'info' },
  event: {
    category: 'ops',
    action: 'service.start',
    outcome: 'success',
  },
  labels: {
    environment: envName,
    demo_scenario: 'startup',
  },
});

http.createServer(route).listen(port, '0.0.0.0', () => {
  console.log(`[demo-app] listening on ${port}`);
});
