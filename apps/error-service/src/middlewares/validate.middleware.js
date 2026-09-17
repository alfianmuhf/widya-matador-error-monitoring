import createError from "http-errors";

/**
 * Middleware factory for request validation using Zod
 * @param {import("zod").ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'query' | 'params'} source - Target request property (default: 'body')
 */
export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req[source]);

      if (!result.success) {
        const issues = result.error.issues || result.error.errors || [];
        const formattedErrors = issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));

        return next(
          createError(422, "Validation Error", {
            details: formattedErrors,
          })
        );
      }

      // Reassign validated/coerced data
      if (source === "query") {
        Object.assign(req.query, result.data);
      } else {
        req[source] = result.data;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
