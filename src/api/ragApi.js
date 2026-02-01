/**
 * RAG API client – ingest, query, health.
 * Base URL: REACT_APP_RAG_API_BASE_URL (CRA).
 */

const BASE_URL =
  (typeof process !== "undefined" && process.env?.REACT_APP_RAG_API_BASE_URL) ||
  "http://127.0.0.1:8000";

function getBaseUrl() {
  return BASE_URL.replace(/\/$/, "");
}

/**
 * POST /rag/ingest – multipart/form-data, field "file".
 * @param {File} file
 * @returns {Promise<{ status: string, chunks_added: number }>}
 */
export async function ingestDocument(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${getBaseUrl()}/rag/ingest`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const j = JSON.parse(text);
      if (j.detail) msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch (_) {}
    throw new Error(msg || `Upload failed: ${res.status}`);
  }
  return res.json();
}

/**
 * POST /rag/query – JSON { query, k }.
 * @param {string} query
 * @param {number} [k=4]
 * @returns {Promise<{ answer: string, sources: Array<{ source: string, page?: number, snippet: string }>, used_llm?: boolean }>}
 */
export async function queryRag(query, k = 4) {
  const res = await fetch(`${getBaseUrl()}/rag/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, k }),
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const j = JSON.parse(text);
      if (j.detail) msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch (_) {}
    throw new Error(msg || `Query failed: ${res.status}`);
  }
  return res.json();
}

/**
 * GET /health
 * @returns {Promise<{ status: string }>}
 */
export async function healthCheck() {
  const res = await fetch(`${getBaseUrl()}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}
