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
      // Get the data from the appropriate request property
      const data = req[source];
      
      // Validate data against schema
      await schema.parseAsync(data);
      
      // Validation passed, continue
      next();
    } catch (error) {
      // If Zod validation error, send formatted response
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors.map(err => ({
            path: err.path,
            message: err.message
          }))
        });
      }
      
      // For any other error, send generic error response
      console.error("Validation middleware error:", error);
      return res.status(500).json({ 
        message: "Internal server error during request validation" 
      });
    }
  };
};