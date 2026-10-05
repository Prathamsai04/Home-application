import { assertStorageProvider } from '../storage/MemoryStorageProvider.js';

/**
 * Generic repository implementing the standard data-access contract:
 * getAll, getById, create, update, delete. Contains no business rules.
 */
export class BaseRepository {
  constructor(storage, collection) {
    this.storage = assertStorageProvider(storage);
    this.collection = collection;
  }

  getAll() {
    return this.storage.list(this.collection);
  }

  getById(id) {
    return this.storage.findById(this.collection, id);
  }

  create(data) {
    return this.storage.insert(this.collection, data);
  }

  update(id, data) {
    return this.storage.update(this.collection, id, data);
  }

  delete(id) {
    return this.storage.remove(this.collection, id);
  }

  count() {
    return this.storage.count(this.collection);
  }

  findWhere(predicate) {
    return this.getAll().filter(predicate);
  }

  findOne(predicate) {
    return this.getAll().find(predicate) ?? null;
  }
}
