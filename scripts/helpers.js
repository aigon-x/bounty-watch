const debounce = (fn, delay, options = {}) => {
  let timeoutId;
  let lastArgs;
  let lastThis;
  let result;
  const { leading = false, trailing = true, maxWait } = options;

  const invokeFunc = () => {
    result = fn.apply(lastThis, lastArgs);
    timeoutId = null;
  };

  const debounced = function (...args) {
    lastArgs = args;
    lastThis = this;

    const callNow = leading && !timeoutId;

    if (maxWait && !timeoutId) {
      setTimeout(() => {
        if (timeoutId) {
          invokeFunc();
        }
      }, maxWait);
    }

    clearTimeout(timeoutId);

    if (trailing) {
      timeoutId = setTimeout(invokeFunc, delay);
    }

    if (callNow) {
      invokeFunc();
    }

    return result;
  };

  debounced.cancel = () => {
    clearTimeout(timeoutId);
    timeoutId = null;
  };

  debounced.flush = () => {
    if (timeoutId) {
      invokeFunc();
    }
    return result;
  };

  debounced.pending = () => !!timeoutId;

  return debounced;
};

const throttle = (fn, limit, options = {}) => {
  let lastCall = 0;
  let timeoutId;
  let lastArgs;
  let lastThis;
  let result;
  const { leading = true, trailing = true } = options;

  const invokeFunc = () => {
    lastCall = Date.now();
    timeoutId = null;
    result = fn.apply(lastThis, lastArgs);
  };

  const throttled = function (...args) {
    const now = Date.now();
    lastArgs = args;
    lastThis = this;

    if (!lastCall && !leading) {
      lastCall = now;
    }

    const remaining = limit - (now - lastCall);

    if (remaining <= 0 || remaining > limit) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      result = fn.apply(lastThis, lastArgs);
    } else if (trailing && !timeoutId) {
      timeoutId = setTimeout(invokeFunc, remaining);
    }

    return result;
  };

  throttled.cancel = () => {
    clearTimeout(timeoutId);
    lastCall = 0;
    timeoutId = null;
  };

  throttled.flush = () => {
    if (timeoutId) {
      invokeFunc();
    }
    return result;
  };

  throttled.pending = () => !!timeoutId;

  return throttled;
};

const validateEmail = (email) => {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email) && email.length <= 254;
};

const validateUrl = (url, options = {}) => {
  if (typeof url !== 'string') return false;
  const { requireProtocol = true, allowLocalhost = false } = options;
  try {
    const parsed = new URL(url);
    if (!allowLocalhost && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1')) {
      return false;
    }
    if (requireProtocol && !['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const validateRequired = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};

const validateMinLength = (value, min) => {
  if (typeof value !== 'string') return false;
  return value.length >= min;
};

const validateMaxLength = (value, max) => {
  if (typeof value !== 'string') return false;
  return value.length <= max;
};

const validatePattern = (value, pattern) => {
  if (typeof value !== 'string') return false;
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  return regex.test(value);
};

const validateNumber = (value, options = {}) => {
  const { min, max, integer = false } = options;
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return false;
  if (integer && !Number.isInteger(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
};

const validateDate = (value, options = {}) => {
  const { min, max } = options;
  const date = new Date(value);
  if (isNaN(date.getTime())) return false;
  if (min && date < new Date(min)) return false;
  if (max && date > new Date(max)) return false;
  return true;
};

const createValidator = (rules) => {
  return (values) => {
    const errors = {};
    let isValid = true;

    for (const [field, fieldRules] of Object.entries(rules)) {
      const value = values[field];
      const ruleArray = Array.isArray(fieldRules) ? fieldRules : [fieldRules];

      for (const rule of ruleArray) {
        let result = true;
        let message = `Validation failed for ${field}`;

        if (typeof rule === 'function') {
          result = rule(value, values);
        } else if (rule && typeof rule === 'object') {
          const { validator, message: customMessage, ...params } = rule;
          if (typeof validator === 'function') {
            result = validator(value, params, values);
          }
          message = customMessage || message;
        }

        if (!result) {
          errors[field] = message;
          isValid = false;
          break;
        }
      }
    }

    return { isValid, errors };
  };
};

const sanitizeHtml = (html) => {
  if (typeof html !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

const escapeHtml = (text) => {
  if (typeof text !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;'
  };
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
};

const formatNumber = (num, options = {}) => {
  const { locale = 'en-US', style = 'decimal', minimumFractionDigits, maximumFractionDigits, currency } = options;
  return new Intl.NumberFormat(locale, {
    style,
    currency,
    minimumFractionDigits,
    maximumFractionDigits
  }).format(num);
};

const formatDate = (date, options = {}) => {
  const { locale = 'en-US', ...formatOptions } = options;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, formatOptions).format(d);
};

const generateId = (prefix = '', length = 8) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix;
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof RegExp) return new RegExp(obj);
  if (Array.isArray(obj)) return obj.map(deepClone);
  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

const deepMerge = (target, source) => {
  const result = deepClone(target);
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && !(source[key] instanceof Date)) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = deepClone(source[key]);
      }
    }
  }
  return result;
};

const pick = (obj, keys) => {
  const result = {};
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
};

const omit = (obj, keys) => {
  const keySet = new Set(keys);
  const result = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && !keySet.has(key)) {
      result[key] = obj[key];
    }
  }
  return result;
};

const groupBy = (array, keyFn) => {
  return array.reduce((groups, item) => {
    const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {});
};

const sortBy = (array, keyFn, order = 'asc') => {
  const sorted = [...array];
  sorted.sort((a, b) => {
    const aVal = typeof keyFn === 'function' ? keyFn(a) : a[keyFn];
    const bVal = typeof keyFn === 'function' ? keyFn(b) : b[keyFn];
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
  return sorted;
};

const uniqueBy = (array, keyFn) => {
  const seen = new Set();
  return array.filter((item) => {
    const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const retry = async (fn, options = {}) => {
  const { retries = 3, delay = 1000, backoff = 2, shouldRetry = () => true } = options;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !shouldRetry(error)) break;
      await sleep(delay * Math.pow(backoff, attempt));
    }
  }

  throw lastError;
};

const memoize = (fn, options = {}) => {
  const { maxSize = 100, equals = (a, b) => a === b } = options;
  const cache = new Map();

  const memoized = function (...args) {
    const key = args.length === 1 ? args[0] : args;

    for (const [cachedKey, cachedValue] of cache.entries()) {
      if (equals(cachedKey, key)) {
        return cachedValue;
      }
    }

    const result = fn.apply(this, args);

    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(key, result);
    return result;
  };

  memoized.clear = () => cache.clear();
  memoized.cache = cache;

  return memoized;
};

export {
  debounce,
  throttle,
  validateEmail,
  validateUrl,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validatePattern,
  validateNumber,
  validateDate,
  createValidator,
  sanitizeHtml,
  escapeHtml,
  formatNumber,
  formatDate,
  generateId,
  deepClone,
  deepMerge,
  pick,
  omit,
  groupBy,
  sortBy,
  uniqueBy,
  clamp,
  sleep,
  retry,
  memoize
};