// pos_api/src/modules/auth/auth.controller.ts
import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../../utils/api-response';
import { loginService, meService } from './auth.service';

type LoginBody = {
  email: string;
  password: string;
};

export async function loginController(
  req: Request<Record<string, never>, unknown, LoginBody>,
  res: Response
) {
  try {
    const { email, password } = req.body;
    const result = await loginService(email, password);

    return res.json(successResponse('Login berhasil', result));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login gagal';
    return res.status(401).json(errorResponse(message));
  }
}

export async function meController(req: Request, res: Response) {
  try {
    const userId = req.authUser?.userId;

    if (!userId) {
      return res.status(401).json(errorResponse('Unauthorized'));
    }

    const result = await meService(userId);

    return res.json(successResponse('Current user fetched', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'User tidak ditemukan';
    return res.status(404).json(errorResponse(message));
  }
}