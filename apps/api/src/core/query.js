import { PAGINATION } from '@homestay/shared';

function readField(item, field) {
  if (typeof field === 'function') return field(item);
  return field.split('.').reduce((value, key) => (value == null ? undefined : value[key]), item);
}

function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' });
}

/**
 * Applies filtering, free-text search, whitelisted sorting and pagination to an
 * array of records. Storage-agnostic: works on any repository result.
 *
 * filters: { field: value | (item) => boolean } - undefined values are ignored.
 * sortFields: { publicName: field | accessor }
 */
export function applyQuery(items, options = {}) {
  const {
    search,
    searchFields = [],
    filters = {},
    sortBy,
    sortOrder = 'asc',
    sortFields = {},
    defaultSort,
    page = 1,
    pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  } = options;

  let result = items.filter((item) =>
    Object.entries(filters).every(([field, expected]) => {
      if (expected === undefined || expected === null || expected === '') return true;
      if (typeof expected === 'function') return expected(item);
      return readField(item, field) === expected;
    }),
  );

  const term = search?.trim().toLowerCase();
  if (term) {
    result = result.filter((item) =>
      searchFields.some((field) => {
        const value = readField(item, field);
        return value != null && String(value).toLowerCase().includes(term);
      }),
    );
  }

  const sortKey = sortBy && sortFields[sortBy] ? sortBy : defaultSort?.field;
  const direction = (sortBy && sortFields[sortBy] ? sortOrder : defaultSort?.order ?? sortOrder) === 'desc' ? -1 : 1;
  if (sortKey && sortFields[sortKey]) {
    const accessor = sortFields[sortKey];
    result = [...result].sort((a, b) => compareValues(readField(a, accessor), readField(b, accessor)) * direction);
  }

  const total = result.length;
  const size = Math.min(Math.max(1, pageSize), PAGINATION.MAX_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / size));
  const currentPage = Math.max(1, page);
  const start = (currentPage - 1) * size;

  return {
    items: result.slice(start, start + size),
    pagination: { page: currentPage, pageSize: size, total, totalPages },
    filtered: result,
  };
}
