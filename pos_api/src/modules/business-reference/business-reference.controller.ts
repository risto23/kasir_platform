import type { NextFunction, Request, Response } from 'express';
import {
  getBusinessPermissionsReference,
  getBusinessRolesReference,
} from './business-reference.service';

export async function getBusinessRolesController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await getBusinessRolesReference();

    return res.status(200).json({
      success: true,
      message: 'Business roles fetched successfully',
      data,
    });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function getBusinessPermissionsController(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = await getBusinessPermissionsReference();

    return res.status(200).json({
      success: true,
      message: 'Business permissions fetched successfully',
      data,
    });
  } catch (error: unknown) {
    return next(error);
  }
}