/**
 * Storage provider contract. Any provider (memory today; PostgreSQL, MongoDB,
 * Redis or Supabase in future) must expose these methods. Repositories depend
 * only on this contract, and services depend only on repositories.
 */
export const STORAGE_PROVIDER_METHODS = Object.freeze([
  'list',
  'findById',
  'insert',
  'update',
  'remove',
  'count',
  'getDocument',
  'setDocument',
  'replaceAll',
  'clear',
]);

export function assertStorageProvider(provider) {
  const missing = STORAGE_PROVIDER_METHODS.filter((method) => typeof provider?.[method] !== 'function');
  if (missing.length) {
    throw new TypeError(`Storage provider is missing required methods: ${missing.join(', ')}`);
  }
  return provider;
}

const clone = (value) => (value === undefined ? undefined : structuredClone(value));

/**
 * In-memory storage provider.
 *
 * Serverless note: each Vercel function instance owns its own copy of this
 * store. Data is lost when the instance is recycled and is not shared between
 * concurrent instances. The container re-seeds deterministically on cold start.
 * Records are cloned on every read and write so callers can never mutate
 * stored state by reference.
 */
export class MemoryStorageProvider {
  constructor() {
    this.name = 'memory';
    this.collections = new Map();
    this.documents = new Map();
  }

  #collection(name) {
    if (!this.collections.has(name)) this.collections.set(name, new Map());
    return this.collections.get(name);
  }

  list(collection) {
    return Array.from(this.#collection(collection).values(), clone);
  }

  findById(collection, id) {
    const record = this.#collection(collection).get(id);
    return record ? clone(record) : null;
  }

  insert(collection, record) {
    if (!record?.id) throw new TypeError('Records must have an id');
    const store = this.#collection(collection);
    if (store.has(record.id)) throw new Error(`Duplicate id ${record.id} in ${collection}`);
    store.set(record.id, clone(record));
    return clone(record);
  }

  update(collection, id, patch) {
    const store = this.#collection(collection);
    const existing = store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...clone(patch), id };
    store.set(id, updated);
    return clone(updated);
  }

  remove(collection, id) {
    return this.#collection(collection).delete(id);
  }

  count(collection) {
    return this.#collection(collection).size;
  }

  getDocument(key) {
    return this.documents.has(key) ? clone(this.documents.get(key)) : null;
  }

  setDocument(key, value) {
    this.documents.set(key, clone(value));
    return clone(value);
  }

  replaceAll({ collections = {}, documents = {} }) {
    this.clear();
    for (const [name, records] of Object.entries(collections)) {
      const store = this.#collection(name);
      for (const record of records) store.set(record.id, clone(record));
    }
    for (const [key, value] of Object.entries(documents)) this.documents.set(key, clone(value));
  }

  clear() {
    this.collections.clear();
    this.documents.clear();
  }
}
