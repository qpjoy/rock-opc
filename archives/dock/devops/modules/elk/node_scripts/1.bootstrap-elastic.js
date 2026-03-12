'use strict';

const { readJson, requestJson, waitForHttp } = require('./bootstrap-lib');

async function putJson(url, body, label) {
  console.log(`[elk-setup] applying ${label}`);
  await requestJson(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  console.log(`[elk-setup] applied ${label}`);
}

async function postJson(url, label) {
  console.log(`[elk-setup] running ${label}`);
  await requestJson(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  });
  console.log(`[elk-setup] finished ${label}`);
}

async function main() {
  const esUrl = process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200';
  const ilmPolicyName = process.env.ILM_POLICY_NAME;
  const ilmPolicyFile = process.env.ILM_POLICY_FILE;
  const indexTemplateName = process.env.INDEX_TEMPLATE_NAME;
  const indexTemplateFile = process.env.INDEX_TEMPLATE_FILE;
  const snapshotRepositoryName = process.env.SNAPSHOT_REPOSITORY_NAME;
  const snapshotRepositoryFile = process.env.SNAPSHOT_REPOSITORY_FILE;

  if (!ilmPolicyName || !ilmPolicyFile || !indexTemplateName || !indexTemplateFile) {
    throw new Error('Missing ELK bootstrap environment variables');
  }

  console.log(`[elk-setup] waiting for Elasticsearch at ${esUrl}`);
  await waitForHttp(
    `${esUrl}/_cluster/health`,
    (body) => body && typeof body.status === 'string',
    'Elasticsearch cluster health'
  );
  console.log('[elk-setup] Elasticsearch is ready');

  await putJson(
    `${esUrl}/_ilm/policy/${encodeURIComponent(ilmPolicyName)}`,
    await readJson(ilmPolicyFile),
    `ILM policy ${ilmPolicyName}`
  );

  await putJson(
    `${esUrl}/_index_template/${encodeURIComponent(indexTemplateName)}`,
    await readJson(indexTemplateFile),
    `index template ${indexTemplateName}`
  );

  if (snapshotRepositoryName && snapshotRepositoryFile) {
    await putJson(
      `${esUrl}/_snapshot/${encodeURIComponent(snapshotRepositoryName)}`,
      await readJson(snapshotRepositoryFile),
      `snapshot repository ${snapshotRepositoryName}`
    );

    await postJson(
      `${esUrl}/_snapshot/${encodeURIComponent(snapshotRepositoryName)}/_verify`,
      `snapshot repository verification for ${snapshotRepositoryName}`
    );
  }

  console.log('[elk-setup] bootstrap complete');
}

main().catch((error) => {
  console.error(`[elk-setup] ${error.message}`);
  process.exit(1);
});
