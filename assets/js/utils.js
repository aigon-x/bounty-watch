// assets/js/utils.js
import { format as formatDateFns } from 'date-fns';

/**
 * Creates a debounced version of a function.
 *
 * The returned function delays invoking `fn` until after `wait` milliseconds
 * have elapsed since the last time the debounced function was called.
 *
 * @param {Function} fn               The function to debounce.
 * @param {number}   wait             Number of milliseconds to delay.
 * @param {Object}   [options]        Optional configuration.
 * @param {boolean}  [options.leading=false]  Invoke on the leading edge.
 * @param {boolean}  [options.trailing=true]  Invoke on the trailing edge.
 * @returns {Function} A new debounced function with `.cancel()` and `.flush()` methods.
 */
export function debounce(fn, wait, options = {}) {
  let timeoutId = null;
  let lastArgs = null;
  let lastThis = null;
  let result;

  const { leading = false, trailing = true } = options;

  const invoke = () => {
    result = fn.apply(lastThis, lastArgs);
    lastThis = lastArgs = null;
  };

  const startTimer = () => {
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (trailing && lastArgs) {
        invoke();
      }
    }, wait);
  };

  const debounced = function (...args) {
    lastThis = this;
    lastArgs = args;

    const callNow = leading && !timeoutId;
    if (timeoutId) clearTimeout(timeoutId);
    startTimer();

    if (callNow) invoke();

    return result;
  };

  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
    lastArgs = lastThis = null;
  };

  debounced.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (lastArgs) invoke();
    return result;
  };

  return debounced;
}

/**
 * Formats a date using `date-fns`.
 *
 * @param {Date|number|string} date   Date instance, timestamp, or ISO string.
 * @param {string} [pattern='yyyy-MM-dd HH:mm:ss'] Desired output format.
 * @param {Object} [options]          `date-fns` format options.
 * @returns {string} Formatted date string.
 * @throws {Error} If the supplied value cannot be parsed as a valid date.
 */
export function formatDate(date, pattern = 'yyyy-MM-dd HH:mm:ss', options) {
  let d;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'number' || typeof date === 'string') {
    d = new Date(date);
  } else {
    throw new Error('Invalid date argument');
  }

  if (Number.isNaN(d.getTime())) {
    throw new Error('Invalid date value');
  }

  return formatDateFns(d, pattern, options);
}

/**
 * Copies a string to the clipboard.
 *
 * Tries the modern asynchronous Clipboard API first; if unavailable,
 * falls back to the legacy `execCommand('copy')` technique.
 *
 * @param {string} text Text to copy.
 * @returns {Promise<boolean>} Resolves to `true` on success, otherwise `false`.
 */
export async function copyToClipboard(text) {
  if (!text) return false;

  // Modern async Clipboard API (requires a secure context)
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // fall back to legacy method
    }
  }

  // Legacy fallback using a temporary textarea
  return new Promise((resolve) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    let succeeded = false;
    try {
      succeeded = document.execCommand('copy');
    } catch (_) {
      succeeded = false;
    }

    document.body.removeChild(textarea);
    resolve(succeeded);
  });
}