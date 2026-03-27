import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../../utils/api-response';
import {
  getBusinessFeatureFlagsService,
  listFeatureFlagsService,
  updateBusinessFeatureFlagsService,
} from './platform-feature-flag.service';

type BusinessIdParams = {
  id: string;
};

type UpdateBusinessFeatureFlagsBody = {
  featureFlagKeys: string[];
};

export async function listFeatureFlagsController(_req: Request, res: Response) {
  try {
    const result = await listFeatureFlagsService();
    return res.json(successResponse('Feature flags fetched', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch feature flags';
    return res.status(500).json(errorResponse(message));
  }
}

export async function getBusinessFeatureFlagsController(
  req: Request<BusinessIdParams>,
  res: Response
) {
  try {
    const result = await getBusinessFeatureFlagsService(req.params.id);
    return res.json(successResponse('Business feature flags fetched', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch business feature flags';
    return res.status(404).json(errorResponse(message));
  }
}

export async function updateBusinessFeatureFlagsController(
  req: Request<BusinessIdParams, unknown, UpdateBusinessFeatureFlagsBody>,
  res: Response
) {
  try {
    const result = await updateBusinessFeatureFlagsService(
      req.params.id,
      req.body.featureFlagKeys
    );

    return res.json(successResponse('Business feature flags updated', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to update business feature flags';
    return res.status(400).json(errorResponse(message));
  }
}