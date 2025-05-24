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
      // Get the data from the specified source
      const data = req[source];
      
      // Validate the data against the schema
      await schema.parseAsync(data);
      
      // If validation passes, continue to the next middleware
      next();
    } catch (error) {
      // If validation fails, format and return the error
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        
        return res.status(400).json({
          message: "Validation failed",
          errors: formattedErrors,
        });
      }
      
      // If some other error occurred, pass it to the error handler
      next(error);
    }
  };
};