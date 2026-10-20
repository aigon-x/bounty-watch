/**
 * Default per-entry validator.
 * @param {unknown} entry
 * @param {number} index
 * @returns {WatchlistEntry}
 */
const defaultEntryValidator = (entry, index) => {
  if (!isPlainObject(entry)) {
    throw new ValidationError(`Entry #${index} must be an object, received ${typeOf(entry)}`);
  }
  const keys = Object.keys(entry);
  if (keys.length === 0) throw new ValidationError(`Entry #${index} is empty`);
  const { id, url } = entry;
  if (id !== undefined && (typeof id !== 'string' || id.trim() === '')) {
    throw new ValidationError(`Entry #${index} has an invalid "id": expected a non-empty string, received ${typeOf(id)}`);
  }
  if (url !== undefined) {
    if (typeof url !== 'string') throw ...
    assertSafeUrl(url, index)  // must be http/https
  }
  return entry;
};