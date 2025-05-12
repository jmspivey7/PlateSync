import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

export function validateSchema(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validData = schema.parse(req.body);
      req.body = validData;
      next();
    } catch (error: any) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors || error.message
      });
    }
  };
}