'use strict';

const { readJson, requestJson, waitForHttp } = require('./bootstrap-lib');

async function ensureDataView(kibanaUrl, title, name, timeFieldName) {
  const existing = await requestJson(
    `${kibanaUrl}/api/saved_objects/_find?type=index-pattern&search_fields=title&search=${encodeURIComponent(title)}`,
    {
      headers: { 'kbn-xsrf': 'bootstrap' },
    }
  );

  const hit = existing.saved_objects && existing.saved_objects.find((item) => item.attributes && item.attributes.title === title);
  if (hit) {
    console.log(`[kibana-setup] found existing data view ${title} (${hit.id})`);
    return hit.id;
  }

  const created = await requestJson(`${kibanaUrl}/api/data_views/data_view`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'kbn-xsrf': 'bootstrap',
    },
    body: JSON.stringify({
      data_view: {
        name,
        title,
        timeFieldName,
      },
    }),
  });

  const dataViewId = created && created.data_view && created.data_view.id;
  if (!dataViewId) {
    throw new Error(`Data view creation for ${title} did not return an id`);
  }

  console.log(`[kibana-setup] created data view ${title} (${dataViewId})`);
  return dataViewId;
}

async function setDefaultDataView(kibanaUrl, dataViewId) {
  await requestJson(`${kibanaUrl}/api/data_views/default`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'kbn-xsrf': 'bootstrap',
    },
    body: JSON.stringify({
      data_view_id: dataViewId,
      force: true,
    }),
  });

  console.log(`[kibana-setup] set default data view to ${dataViewId}`);
}

async function ensureDataViews(kibanaUrl, filePath, fallbackDefinition) {
  const definitions = filePath
    ? await readJson(filePath)
    : [fallbackDefinition];

  let defaultId = null;

  for (const definition of definitions) {
    const id = await ensureDataView(
      kibanaUrl,
      definition.title,
      definition.name,
      definition.timeFieldName || '@timestamp'
    );

    if (definition.setDefault) {
      defaultId = id;
    }
  }

  if (!defaultId && definitions[0]) {
    defaultId = await ensureDataView(
      kibanaUrl,
      definitions[0].title,
      definitions[0].name,
      definitions[0].timeFieldName || '@timestamp'
    );
  }

  return defaultId;
}

async function upsertSavedQuery(kibanaUrl, queryDefinition) {
  await requestJson(`${kibanaUrl}/api/saved_objects/query/${encodeURIComponent(queryDefinition.id)}?overwrite=true`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'kbn-xsrf': 'bootstrap',
    },
    body: JSON.stringify({
      attributes: {
        title: queryDefinition.title,
        description: queryDefinition.description,
        query: {
          language: 'kuery',
          query: queryDefinition.query,
        },
        filters: [],
      },
    }),
  });

  console.log(`[kibana-setup] saved query ready: ${queryDefinition.title}`);
}

async function main() {
  const kibanaUrl = process.env.KIBANA_URL || 'http://kibana:5601';
  const dataViewName = process.env.KIBANA_DATA_VIEW_NAME || 'OPC Logs';
  const dataViewTitle = process.env.KIBANA_DATA_VIEW_TITLE || 'logs-opc-*';
  const timeFieldName = process.env.KIBANA_DATA_VIEW_TIME_FIELD || '@timestamp';
  const dataViewsFile = process.env.KIBANA_DATA_VIEWS_FILE;
  const savedQueriesFile = process.env.KIBANA_SAVED_QUERIES_FILE;

  console.log(`[kibana-setup] waiting for Kibana at ${kibanaUrl}`);
  await waitForHttp(
    `${kibanaUrl}/api/status`,
    (body) => body && body.status && body.status.overall && body.status.overall.level === 'available',
    'Kibana status'
  );
  console.log('[kibana-setup] Kibana is ready');

  const dataViewId = await ensureDataViews(kibanaUrl, dataViewsFile, {
    name: dataViewName,
    title: dataViewTitle,
    timeFieldName,
    setDefault: true,
  });
  await setDefaultDataView(kibanaUrl, dataViewId);

  if (savedQueriesFile) {
    const queries = await readJson(savedQueriesFile);
    for (const queryDefinition of queries) {
      await upsertSavedQuery(kibanaUrl, queryDefinition);
    }
  }

  console.log('[kibana-setup] bootstrap complete');
}

main().catch((error) => {
  console.error(`[kibana-setup] ${error.message}`);
  process.exit(1);
});
