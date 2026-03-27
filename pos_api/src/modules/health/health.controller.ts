import { Request, Response } from 'express';

export function healthController(_req: Request, res: Response) {
  return res.json({
    success: true,
    message: 'API is running',
  });
}