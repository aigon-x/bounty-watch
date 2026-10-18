/**
 * assets/js/api.js
 *
 * Utility module for calling the GitHub Bounty‑Watch API and caching results.
 * --------------------------------------------------------------
 * • Uses axios for HTTP requests.
 * • Caches successful GET responses in `localStorage` with a configurable TTL.
 * • Provides a thin wrapper around the API endpoints used by the UI.
 * • Handles network errors, JSON parsing errors and cache‑expiry gracefully.
 *
 * @module BountyWatchAPI
 */

import axios from 'axios';
import { addSeconds, isAfter } from 'date-fns';

/**
 * Default configuration – can be overridden by `setConfig`.
 * @type {Object}
 */
const DEFAULT_CONFIG = {
  /** Base URL of the public Bounty‑Watch API */
  baseURL: 'https://api.bountywatch.dev/v1',
  /** Request timeout (ms) */
  timeout: 10_000,
  /** Cache time‑to‑live (seconds) – 5 minutes by default */
  cacheTTL: 300,
  /** Prefix for localStorage keys to avoid collisions */
  cachePrefix: 'bountywatch:',
};

/** Current runtime configuration (starts as a copy of defaults) */
let config = { ...DEFAULT_CONFIG };

/**
 * Update the module configuration.
 *
 * @param {Partial<typeof DEFAULT_CONFIG>} newConfig
 */
export function setConfig(newConfig) {
  config = { ...config, ...newConfig };
}

/**
 * Build a cache key from the request URL and query parameters.
 *
 * @param {string} url
 * @param {Object} [params]
 * @returns {string}
 */
function makeCacheKey(url, params) {
  const paramString = params
    ? Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&')
    : '';
  return `${config.cachePrefix}${url}${paramString ? `?${paramString}` : ''}`;
}

/**
 * Store a value in localStorage with an expiry timestamp.
 *
 * @param {string} key
 * @param {any} value
 */
function setCache(key, value) {
  const expires = addSeconds(new Date(), config.cacheTTL).toISOString();
  const payload = JSON.stringify({ expires, value });
  try {
    localStorage.setItem(key, payload);
  } catch (e) {
    // Storage quota exceeded – fall back to a no‑op.
    console.warn('BountyWatchAPI: Unable to write cache', e);
  }
}

/**
 * Retrieve a cached value if it hasn't expired.
 *
 * @param {string} key
 * @returns {any|null}
 */
function getCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const { expires, value } = JSON.parse(raw);
    if (isAfter(new Date(), new Date(expires))) {
      // Expired – clean up.
      localStorage.removeItem(key);
      return null;
    }
    return value;
  } catch (e) {
    console.warn('BountyWatchAPI: Unable to read cache', e);
    return null;
  }
}

/**
 * Perform a GET request with caching.
 *
 * @param {string} endpoint   Relative endpoint (e.g. '/programs')
 * @param {Object} [params]   Query parameters
 * @param {boolean} [force]   Bypass cache when true
 * @returns {Promise<any>}
 */
async function cachedGet(endpoint, params = {}, force = false) {
  const url = `${config.baseURL}${endpoint}`;
  const cacheKey = makeCacheKey(url, params);

  if (!force) {
    const cached = getCache(cacheKey);
    if (cached !== null) return cached;
  }

  try {
    const response = await axios.get(url, {
      params,
      timeout: config.timeout,
    });
    setCache(cacheKey, response.data);
    return response.data;
  } catch (err) {
    // Normalise error for callers.
    const msg = err.response
      ? `API error ${err.response.status}: ${err.response.statusText}`
      : err.message;
    throw new Error(`BountyWatchAPI: ${msg}`);
  }
}

/**
 * Clear the entire Bounty‑Watch cache (useful for debugging or manual refresh).
 */
export function clearCache() {
  const prefix = config.cachePrefix;
  Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix))
    .forEach((k) => localStorage.removeItem(k));
}

/* -------------------------------------------------------------------------- */
/* Specific API helpers – expose only what the UI needs.                       */
/* -------------------------------------------------------------------------- */

/**
 * Get the latest daily scope digest.
 *
 * @param {Object} [options]
 * @param {boolean} [options.force]  Bypass cache.
 * @returns {Promise<Object>} The digest JSON.
 */
export function getDailyDigest({ force = false } = {}) {
  return cachedGet('/digest/daily', {}, force);
}

/**
 * Get a list of all bug‑bounty programs known to Bounty‑Watch.
 *
 * @param {Object} [options]
 * @param {boolean} [options.force]  Bypass cache.
 * @returns {Promise<Array>} Array of program objects.
 */
export function getProgramList({ force = false } = {}) {
  return cachedGet('/programs', {}, force);
}

/**
 * Get scope changes for a specific program.
 *
 * @param {string} programId   Program identifier (e.g. 'h1:1win_com')
 * @param {Object} [options]
 * @param {boolean} [options.force]  Bypass cache.
 * @returns {Promise<Object>} Scope‑change payload.
 */
export function getProgramScopeChanges(programId, { force = false } = {}) {
  if (!programId) {
    throw new Error('BountyWatchAPI: programId is required');
  }
  return cachedGet(`/programs/${encodeURIComponent(programId)}/scope`, {}, force);
}

/**
 * Generic raw request – for future endpoints that don't need caching.
 *
 * @param {string} endpoint
 * @param {Object} [params]
 * @returns {Promise<any>}
 */
export async function rawGet(endpoint, params = {}) {
  const url = `${config.baseURL}${endpoint}`;
  try {
    const { data } = await axios.get(url, {
      params,
      timeout: config.timeout,
    });
    return data;
  } catch (err) {
    const msg = err.response
      ? `API error ${err.response.status}: ${err.response.statusText}`
      : err.message;
    throw new Error(`BountyWatchAPI: ${msg}`);
  }
}

/* -------------------------------------------------------------------------- */
/* Export a default object for convenient destructuring in legacy code.       */
/* -------------------------------------------------------------------------- */
export default {
  setConfig,
  clearCache,
  getDailyDigest,
  getProgramList,
  getProgramScopeChanges,
  rawGet,
};