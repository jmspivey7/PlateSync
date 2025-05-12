import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Middleware that validates request data against a Zod schema
 * @param schema The Zod schema to validate against
 * @param source Where to find data to validate (body, query, params)
 */
export const validateSchema = (schema: AnyZodObject, source: 'body' | 'query' | 'params' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and validate the request data against the schema
      const data = await schema.parseAsync(req[source]);
      
      // Replace the request data with the validated data
      req[source] = data;
      
      // Continue to the next middleware/route handler
      return next();
    } catch (error) {
      // If validation fails, format and return the errors
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          message: 'Validation failed',
          errors: formattedErrors
        });
      }
      
      // For any other errors, pass to the error handler
      console.error('Validation middleware error:', error);
      return res.status(500).json({ message: 'Server error during validation' });
    }
  };
};