import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

/**
 * Middleware that validates request data against a Zod schema
 * @param schema The Zod schema to validate against
 * @param source Where to find data to validate (body, query, params)
 */
export const validateSchema = (schema: AnyZodObject, source: 'body' | 'query' | 'params' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      await schema.parseAsync(data);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format the error messages in a structured way
        const formattedErrors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          message: "Validation error",
          errors: formattedErrors
        });
      }
      
      // For other types of errors, pass to the error handler
      next(error);
    }
  };
};