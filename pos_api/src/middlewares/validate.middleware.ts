import { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';
import { errorResponse } from '../utils/api-response';

export const validate =
  (schema: z.ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json(
          errorResponse(
            'Validation error',
            error.flatten()
          )
        );
      }

      return res.status(400).json(errorResponse('Invalid request'));
    }
  };
