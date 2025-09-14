export function getPaginationParams(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPagedResponse({ items, total, page, limit }) {
  const pageCount = Math.ceil(total / limit) || 1;
  return {
    data: items,
    meta: { page, limit, total, pageCount }
  };
}
