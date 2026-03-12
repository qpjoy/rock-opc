'use strict';

const fs = require('fs/promises');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  let body = text;

  if (text && contentType.includes('application/json')) {
    try {
      body = JSON.parse(text);
    } catch (_error) {
      body = text;
    }
  }

  if (!response.ok) {
    const detail = typeof body === 'string' ? body : JSON.stringify(body);
    throw new Error(`${options.method || 'GET'} ${url} failed: ${response.status} ${detail}`);
  }

  return body;
}

async function waitForHttp(url, checker, label) {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const body = await requestJson(url);
      if (checker(body)) {
        return body;
      }
      console.log(`[bootstrap] ${label} is reachable but not ready yet, attempt ${attempt}/60`);
    } catch (error) {
      if (attempt === 60) {
        throw error;
      }
      console.log(`[bootstrap] waiting for ${label}, attempt ${attempt}/60`);
    }
    await sleep(3000);
  }

  throw new Error(`Timed out waiting for ${label}`);
}

module.exports = {
  readJson,
  requestJson,
  sleep,
  waitForHttp,
};
