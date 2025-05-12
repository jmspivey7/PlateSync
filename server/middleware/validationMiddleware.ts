import { Request, Response, NextFunction } from "express";
import { z } from "zod";

/**
 * Creates a middleware function that validates the request body against a Zod schema
 * @param schema Zod schema to validate against
 */
export const validateSchema = (schema: z.ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        // Format the validation errors
        const formattedErrors = result.error.format();
        return res.status(400).json({
          message: "Validation error",
          errors: formattedErrors
        });
      }
      
      // Validation passed, continue
      next();
    } catch (error) {
      console.error("Error in schema validation middleware:", error);
      res.status(500).json({ message: "Server error during validation" });
    }
  };
};