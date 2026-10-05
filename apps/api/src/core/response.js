/** Writes the standard success envelope: { success, data, meta, errors }. */
export function sendSuccess(res, data, { status = 200, meta = {} } = {}) {
  res.status(status).json({
    success: true,
    data,
    meta: { correlationId: res.locals.correlationId, ...meta },
    errors: [],
  });
}

/** Writes the standard error envelope. */
export function sendError(res, status, errors) {
  res.status(status).json({
    success: false,
    data: null,
    meta: { correlationId: res.locals.correlationId },
    errors,
  });
}

/** Sends a paginated service result ({ items, pagination }) with pagination in meta. */
export function sendPage(res, result, extraMeta = {}) {
  sendSuccess(res, result.items, { meta: { pagination: result.pagination, ...extraMeta } });
}
