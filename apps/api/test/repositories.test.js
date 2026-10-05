import { describe, expect, it } from 'vitest';
import { MemoryStorageProvider, assertStorageProvider } from '../src/storage/MemoryStorageProvider.js';
import { BaseRepository } from '../src/repositories/BaseRepository.js';
import { ReservationRepository, UserRepository, createRepositories } from '../src/repositories/index.js';
import { applyQuery } from '../src/core/query.js';

describe('MemoryStorageProvider', () => {
  it('satisfies the storage provider contract', () => {
    expect(() => assertStorageProvider(new MemoryStorageProvider())).not.toThrow();
    expect(() => assertStorageProvider({ list() {} })).toThrow(/missing required methods/);
  });

  it('isolates stored records from caller mutations', () => {
    const storage = new MemoryStorageProvider();
    const record = { id: 'a', nested: { value: 1 } };
    storage.insert('things', record);
    record.nested.value = 99;
    const read = storage.findById('things', 'a');
    expect(read.nested.value).toBe(1);
    read.nested.value = 42;
    expect(storage.findById('things', 'a').nested.value).toBe(1);
  });

  it('rejects duplicate ids and records without ids', () => {
    const storage = new MemoryStorageProvider();
    storage.insert('things', { id: 'a' });
    expect(() => storage.insert('things', { id: 'a' })).toThrow(/Duplicate/);
    expect(() => storage.insert('things', { name: 'x' })).toThrow(TypeError);
  });

  it('supports documents, replaceAll and clear', () => {
    const storage = new MemoryStorageProvider();
    storage.replaceAll({ collections: { things: [{ id: '1' }, { id: '2' }] }, documents: { settings: { a: 1 } } });
    expect(storage.count('things')).toBe(2);
    expect(storage.getDocument('settings')).toEqual({ a: 1 });
    storage.clear();
    expect(storage.count('things')).toBe(0);
    expect(storage.getDocument('settings')).toBeNull();
  });
});

describe('BaseRepository CRUD behaviour', () => {
  const repo = new BaseRepository(new MemoryStorageProvider(), 'guests');

  it('creates, reads, updates and deletes records', () => {
    repo.create({ id: 'g1', name: 'Ana' });
    repo.create({ id: 'g2', name: 'Ben' });
    expect(repo.getAll()).toHaveLength(2);
    expect(repo.getById('g1').name).toBe('Ana');
    expect(repo.update('g1', { name: 'Anna', id: 'hijack' })).toEqual({ id: 'g1', name: 'Anna' });
    expect(repo.update('missing', { name: 'x' })).toBeNull();
    expect(repo.delete('g2')).toBe(true);
    expect(repo.delete('g2')).toBe(false);
    expect(repo.getById('g2')).toBeNull();
    expect(repo.count()).toBe(1);
    expect(repo.findOne((g) => g.name === 'Anna').id).toBe('g1');
  });

  it('requires a valid storage provider', () => {
    expect(() => new BaseRepository({}, 'x')).toThrow(TypeError);
  });
});

describe('domain repositories', () => {
  it('finds overlapping reservations using exclusive checkout', () => {
    const repo = new ReservationRepository(new MemoryStorageProvider());
    repo.create({ id: 'r1', roomId: 'room_1', checkIn: '2026-04-01', checkOut: '2026-04-05', status: 'confirmed' });
    repo.create({ id: 'r2', roomId: 'room_1', checkIn: '2026-04-10', checkOut: '2026-04-12', status: 'cancelled' });
    expect(repo.findOverlapping('room_1', '2026-04-05', '2026-04-07')).toHaveLength(0);
    expect(repo.findOverlapping('room_1', '2026-04-04', '2026-04-07')).toHaveLength(1);
    expect(repo.findOverlapping('room_1', '2026-04-04', '2026-04-07', 'r1')).toHaveLength(0);
    expect(repo.findOverlapping('room_1', '2026-04-10', '2026-04-12')).toHaveLength(0);
  });

  it('looks up users by email case-insensitively', () => {
    const repo = new UserRepository(new MemoryStorageProvider());
    repo.create({ id: 'u1', email: 'owner@homestay.demo' });
    expect(repo.findByEmail('OWNER@homestay.demo').id).toBe('u1');
  });

  it('builds every repository from one provider', () => {
    const repos = createRepositories(new MemoryStorageProvider());
    expect(Object.keys(repos)).toEqual(
      expect.arrayContaining(['properties', 'rooms', 'guests', 'reservations', 'payments', 'housekeeping', 'maintenance', 'users', 'settings']),
    );
  });
});

describe('applyQuery', () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: `i${i}`, name: `Item ${i}`, group: i % 2 ? 'odd' : 'even', score: i }));

  it('filters, searches, sorts and paginates', () => {
    const result = applyQuery(items, {
      filters: { group: 'odd' },
      search: 'item 1',
      searchFields: ['name'],
      sortBy: 'score',
      sortOrder: 'desc',
      sortFields: { score: 'score' },
      page: 1,
      pageSize: 3,
    });
    expect(result.pagination).toEqual({ page: 1, pageSize: 3, total: 6, totalPages: 2 });
    expect(result.items.map((i) => i.score)).toEqual([19, 17, 15]);
  });

  it('ignores non-whitelisted sort fields', () => {
    const result = applyQuery(items, { sortBy: 'secret', sortFields: { score: 'score' }, defaultSort: { field: 'score', order: 'desc' } });
    expect(result.items[0].score).toBe(24);
  });
});
