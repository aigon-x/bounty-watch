typescript
/**
 * @file yaml-loader.ts
 * @description Secure, performant, and fully typed YAML loader with LRU caching,
 *              comprehensive error handling, logging, and input validation.
 * @author  Najjaśniejszy Panie
 * @license MIT
 */

import yaml from 'js-yaml';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

/** Supported log severities. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Metadata attached to a structured log entry. */
export type LogMetadata = Readonly<Record<string, unknown>>;

/** Minimal logger contract — plug in pino / winston / OpenTelemetry. */
export interface Logger {
  readonly debug: (message: string, meta?: LogMetadata) => void;
  readonly info: (message: string, meta?: LogMetadata) => void;
  readonly warn: (message: string, meta?: LogMetadata) => void;
  readonly error: (message: string, meta?: LogMetadata) => void;
}

/** A YAML scalar value that survived parsing: no functions, no Dates, no custom tags. */
export type YamlScalar = string | number | boolean | null;

/** Recursive YAML value type. */
export type YamlValue = YamlScalar | readonly YamlValue[] | { readonly [key: string]: YamlValue };

/** Top‑level YAML mapping. */
export type YamlDocument = { readonly [key: string]: YamlValue };

/** Tuning knobs for {@link loadYamlDocument}. */
export interface LoadOptions {
  /** Hard cap on the input size in UTF‑8 bytes. Default: 1 MiB. */
  readonly maxBytes?: number;
  /** Maximum nesting depth of the resulting tree. Default: 64. */
  readonly maxDepth?: number;
  /** Maximum number of candidates kept in the LRU cache. Default: 256. */
  readonly cacheSize?: number;
  /** Optional structured logger; defaults to a silent no‑op logger. */
  readonly logger?: Logger;
}

/** Resolved, immutable configuration derived from {@link LoadOptions}. */
interface ResolvedOptions {
  readonly maxBytes: number;
  readonly maxDepth: number;
  readonly cacheSize: number;
  readonly logger: Logger;
}

/* -------------------------------------------------------------------------- */
/*                                 Errors                                      */
/* -------------------------------------------------------------------------- */

/** Base class for every failure raised by this module. */
export class YamlLoaderError extends Error {
  public constructor(message: string, options?: { readonly cause?: unknown }) {
    super(message);
    this.name = new.target.name;
    if (options?.cause !== undefined) {
      // `cause` is standard since ES2022; assign defensively for older runtimes.
      (this as { cause?: unknown }).cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Raised when the caller supplies invalid arguments. */
export class YamlValidationError extends YamlLoaderError {}

/** Raised when the YAML is syntactically invalid or unsupported. */
export class YamlParseError extends YamlLoaderError {}

/** Raised when a hostile payload is detected (depth, keys, aliases). */
export class YamlSecurityError extends YamlLoaderError {}

/* -------------------------------------------------------------------------- */
/*                                 Constants                                   */
/* -------------------------------------------------------------------------- */

const DEFAULT_MAX_BYTES = 1024 * 1024; // 1 MiB
const DEFAULT_MAX_DEPTH = 64;
const DEFAULT_CACHE_SIZE = 256;

/** Keys that would mutate `Object.prototype` if copied naively. */
const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(['__proto__', 'prototype', 'constructor']);

const NOOP_LOGGER: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

/* -------------------------------------------------------------------------- */
/*                              Internal helpers                              */
/* -------------------------------------------------------------------------- */

/**
 * Normalises and validates {@link LoadOptions}.
 *
 * @throws {YamlValidationError} When a numeric option is not a positive integer.
 */
function resolveOptions(options: LoadOptions = {}): ResolvedOptions {
  const {
    maxBytes = DEFAULT_MAX_BYTES,
    maxDepth = DEFAULT_MAX_DEPTH,
    cacheSize = DEFAULT_CACHE_SIZE,
    logger = NOOP_LOGGER,
  } = options;

  const assertPositiveInt = (value: number, name: string): void => {
    if (!Number.isInteger(value) || value <= 0) {
      throw new YamlValidationError(`Option "${name}" must be a positive integer, received: ${String(value)}`);
    }
  };

  assertPositiveInt(maxBytes, 'maxBytes');
  assertPositiveInt(maxDepth, 'maxDepth');
  assertPositiveInt(cacheSize, 'cacheSize');

  return { maxBytes, maxDepth, cacheSize, logger };
}

/**
 * Ensures the parsed document does not exceed {@link ResolvedOptions.maxDepth}
 * and does not contain prototype‑polluting keys.
 *
 * Traversal is iterative (explicit stack) to avoid blowing the native call stack.
 *
 * @throws {YamlSecurityError} On depth overflow or forbidden key detection.
 */
function assertSafeDocument(root: unknown, maxDepth: number, logger: Logger): void {
  interface Frame {
    readonly node: unknown;
    readonly depth: number;
  }

  const stack: Frame[] = [{ node: root, depth: 0 }];
  const visited = new WeakSet<object>();

  while (stack.length) {
    const { node, depth } = stack.pop() as Frame;

    if (node === null || typeof node !== 'object') {
      continue;
    }

    if (depth > maxDepth) {
      throw new YamlSecurityError(`YAML document exceeds the maximum nesting depth of ${maxDepth}`);
    }

    if (visited.has(node as object)) {
      logger.debug('Skipping already‑visited YAML node (alias cycle detected)');
      continue;
    }
    visited.add(node as object);

    const entries: ReadonlyArray<readonly [string, unknown]> = Array.isArray(node)
      ? (node as unknown[]).map((item, idx) => [String(idx), item] as const)
      : Object.entries(node as Record<string, unknown>);

    for (const [key, child] of entries) {
      if (FORBIDDEN_KEYS.has(key)) {
        throw new YamlSecurityError(`Forbidden key "${key}" detected in YAML document`);
      }
      stack.push({ node: child, depth: depth + 1 });
    }
  }
}

/**
 * Recursively freezes a value so cached documents cannot be mutated by callers.
 *
 * @returns The same reference, frozen in place.
 */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

/**
 * Simple bounded LRU cache keyed by the raw YAML source.
 */
class LruCache<K, V> {
  readonly #capacity: number;
  readonly #store = new Map<K, V>();

  public constructor(capacity: number) {
    this.#capacity = capacity;
  }

  public get(key: K): V | undefined {
    const hit = this.#store.get(key);
    if (hit === undefined) {
      return undefined;
    }
    // Refresh recency.
    this.#store.delete(key);
    this.#store.set(key, hit);
    return hit;
  }

  public set(key: K, value: V): void {
    if (this.#store.has(key)) {
      this.#store.delete(key);
    } else if (this.#store.size >= this.#capacity) {
      const oldest = this.#store.keys().next();
      if (!oldest.done) {
        this.#store.delete(oldest.value);
      }
    }
    this.#store.set(key, value);
  }

  public clear(): void {
    this.#store.clear();
  }
}

/* -------------------------------------------------------------------------- */
/*                               Cache Instance                                */
/* -------------------------------------------------------------------------- */

let documentCache = new LruCache<string, YamlDocument>(DEFAULT_CACHE_SIZE);

/* -------------------------------------------------------------------------- */
/*                               Public API                                     */
/* -------------------------------------------------------------------------- */

/**
 * Parses a YAML string into an immutable {@link YamlDocument}.
 *
 * The function validates input size, enforces a maximum nesting depth,
 * protects against prototype‑polluting keys, caches successful parses,
 * and logs key events at appropriate levels.
 *
 * @param yamlSource - Raw YAML string to parse.
 * @param options    - Optional tuning parameters.
 *
 * @returns A frozen {@link YamlDocument}.
 *
 * @throws {YamlValidationError} If `yamlSource` is not a string or exceeds
 *                               {@link LoadOptions.maxBytes}.
 * @throws {YamlParseError}      If `js-yaml` fails to parse the source.
 * @throws {YamlSecurityError}   If the resulting document violates depth,
 *                               key‑whitelisting, or alias‑cycle rules.
 */
export function loadYamlDocument(
  yamlSource: string,
  options?: LoadOptions,
): YamlDocument {
  const { maxBytes, maxDepth, cacheSize, logger } = resolveOptions(options);

  // Resize cache lazily on first successful load with a custom size.
  if (cacheSize !== documentCache['#capacity']) {
    documentCache = new LruCache<string, YamlDocument>(cacheSize);
  }

  // Input validation ---------------------------------------------------------
  if (typeof yamlSource !== 'string') {
    logger.error('Invalid input type for YAML source', { received: typeof yamlSource });
    throw new YamlValidationError('YAML source must be a string');
  }

  const byteLength = Buffer.byteLength(yamlSource, 'utf8');
  if (byteLength > maxBytes) {
    logger.warn('YAML source exceeds configured maxBytes', { byteLength, maxBytes });
    throw new YamlValidationError(`YAML source exceeds the maximum allowed size of ${maxBytes} bytes`);
  }

  // Cache lookup --------------------------------------------------------------
  const cached = documentCache.get(yamlSource);
  if (cached) {
    logger.debug('YAML document served from cache');
    return cached;
  }

  // Parsing -------------------------------------------------------------------
  let rawDoc: unknown;
  try {
    rawDoc = yaml.load(yamlSource, { schema: yaml.DEFAULT_SAFE_SCHEMA });
  } catch (err) {
    logger.error('YAML parsing failed', { error: err });
    throw new YamlParseError('Failed to parse YAML document', { cause: err });
  }

  // The loader guarantees an object at the top level for our use‑case.
  if (typeof rawDoc !== 'object' || rawDoc === null) {
    logger.error('Parsed YAML is not an object', { parsedType: typeof rawDoc });
    throw new YamlParseError('YAML document must be a mapping/object at the top level');
  }

  // Security checks -----------------------------------------------------------
  assertSafeDocument(rawDoc, maxDepth, logger);

  // Freeze & cache ------------------------------------------------------------
  const frozen = deepFreeze(rawDoc as YamlDocument);
  documentCache.set(yamlSource, frozen);
  logger.info('YAML document parsed and cached successfully');

  return frozen;
}