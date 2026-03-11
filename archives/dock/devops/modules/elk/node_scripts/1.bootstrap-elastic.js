const fs = require('fs/promises');

const esUrl = process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200';
const ilmPolicyName = process.env.ILM_POLICY_NAME || 'opc-logs-policy';
const ilmPolicyFile = process.env.ILM_POLICY_FILE || '/assets/ilm-policy.json';
const indexTemplateName = process.env.INDEX_TEMPLATE_NAME || 'opc-logs-template';
const indexTemplateFile = process.env.INDEX_TEMPLATE_FILE || '/assets/index-template.json';
const snapshotRepositoryName = process.env.SNAPSHOT_REPOSITORY_NAME || 'opc_snapshots';
const snapshotRepositoryFile = process.env.SNAPSHOT_REPOSITORY_FILE || '/assets/snapshot-repository.json';
const waitTimeoutMs = Number(process.env.ELASTICSEARCH_WAIT_TIMEOUT_MS || 180000);
const waitIntervalMs = Number(process.env.ELASTICSEARCH_WAIT_INTERVAL_MS || 5000);

function log(message) {
  console.log(`[elk-setup] ${message}`);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function request(method, path, body) {
  const response = await fetch(`${esUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    // Keep raw text when response is not JSON.
  }

  if (!response.ok) {
    const detail = typeof data === 'string' ? data : JSON.stringify(data);
    throw new Error(`${method} ${path} failed with ${response.status}: ${detail}`);
  }

  return data;
}

async function waitForElasticsearch() {
  const deadline = Date.now() + waitTimeoutMs;
  log(`waiting for Elasticsearch at ${esUrl}`);

  while (Date.now() < deadline) {
    try {
      const health = await request('GET', '/_cluster/health');
      log(`cluster status=${health.status || 'unknown'}`);
      return;
    } catch (error) {
      log(`cluster not ready: ${error.message}`);
      await sleep(waitIntervalMs);
    }
  }

  throw new Error(`timed out waiting for Elasticsearch after ${waitTimeoutMs}ms`);
}

async function ensureJsonResource(kind, name, path, filePath) {
  log(`applying ${kind} ${name} from ${filePath}`);
  const payload = await readJson(filePath);
  const result = await request('PUT', path, payload);
  log(`${kind} ${name} acknowledged=${result.acknowledged !== false}`);
}

async function verifySnapshotRepository() {
  log(`verifying snapshot repository ${snapshotRepositoryName}`);
  const result = await request('POST', `/_snapshot/${snapshotRepositoryName}/_verify`);
  const nodes = result.nodes ? Object.keys(result.nodes).length : 0;
  log(`snapshot repository ${snapshotRepositoryName} verified on ${nodes} node(s)`);
}

async function main() {
  await waitForElasticsearch();
  await ensureJsonResource('ILM policy', ilmPolicyName, `/_ilm/policy/${ilmPolicyName}`, ilmPolicyFile);
  await ensureJsonResource('index template', indexTemplateName, `/_index_template/${indexTemplateName}`, indexTemplateFile);
  await ensureJsonResource(
    'snapshot repository',
    snapshotRepositoryName,
    `/_snapshot/${snapshotRepositoryName}`,
    snapshotRepositoryFile
  );
  await verifySnapshotRepository();
  log('bootstrap complete');
}

main().catch((error) => {
  log(`bootstrap failed: ${error.message}`);
  process.exit(1);
});
