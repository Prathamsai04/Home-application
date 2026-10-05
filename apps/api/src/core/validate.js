import { ValidationError } from './errors.js';

/** Parses input with a Zod schema and converts issues into a structured ValidationError. */
export function validate(schema, input) {
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    throw new ValidationError(
      result.error.issues.map((issue) => ({
        code: 'INVALID_FIELD',
        field: issue.path.length ? issue.path.join('.') : undefined,
        message: issue.message,
      })),
    );
  }
  return result.data;
}
