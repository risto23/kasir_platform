import { Request, Response } from 'express';
import { OutletStatus } from '@prisma/client';
import { successResponse, errorResponse } from '../../utils/api-response';
import {
  createOutletService,
  getOutletByIdService,
  listOutletsService,
  updateOutletService,
  updateOutletStatusService,
} from './platform-outlet.service';

type OutletIdParams = {
  id: string;
};

type CreateOutletBody = {
  businessId: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
};

type UpdateOutletBody = {
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
};

type UpdateOutletStatusBody = {
  status: OutletStatus;
};

export async function listOutletsController(_req: Request, res: Response) {
  try {
    const result = await listOutletsService();
    return res.json(successResponse('Outlets fetched', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch outlets';
    return res.status(500).json(errorResponse(message));
  }
}

export async function getOutletByIdController(
  req: Request<OutletIdParams>,
  res: Response
) {
  try {
    const result = await getOutletByIdService(req.params.id);
    return res.json(successResponse('Outlet fetched', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch outlet';
    return res.status(404).json(errorResponse(message));
  }
}

export async function createOutletController(
  req: Request<Record<string, never>, unknown, CreateOutletBody>,
  res: Response
) {
  try {
    const result = await createOutletService(req.body);
    return res.status(201).json(successResponse('Outlet created', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to create outlet';
    return res.status(400).json(errorResponse(message));
  }
}

export async function updateOutletController(
  req: Request<OutletIdParams, unknown, UpdateOutletBody>,
  res: Response
) {
  try {
    const result = await updateOutletService(req.params.id, req.body);
    return res.json(successResponse('Outlet updated', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update outlet';
    return res.status(400).json(errorResponse(message));
  }
}

export async function updateOutletStatusController(
  req: Request<OutletIdParams, unknown, UpdateOutletStatusBody>,
  res: Response
) {
  try {
    const result = await updateOutletStatusService(
      req.params.id,
      req.body.status
    );
    return res.json(successResponse('Outlet status updated', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to update outlet status';
    return res.status(400).json(errorResponse(message));
  }
}