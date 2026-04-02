import { Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  createPromo,
  getPromoById,
  getPromoFormMeta,
  listPromos,
  updatePromo,
  updatePromoStatus,
} from './promo.service';
import {
  createPromoSchema,
  getPromoByIdSchema,
  listPromosSchema,
  updatePromoSchema,
  updatePromoStatusSchema,
} from './promo.validation';
import type {
  PromoBody,
  PromoListQuery,
  PromoParams,
  PromoStatusBody,
} from './promo.types';

function getBusinessId(req: Request): string {
  const businessId = req.businessAccess?.businessId;

  if (!businessId) {
    throw new Error('Business access context belum tersedia');
  }

  return businessId;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan';
}

function getValidationMessage(error: ZodError): string {
  const firstIssue = error.issues[0];

  if (!firstIssue) {
    return 'Validation error';
  }

  return firstIssue.message;
}

function parseListPromoQuery(req: Request, res: Response): PromoListQuery {
  if (res.locals.validatedQuery) {
    return res.locals.validatedQuery as PromoListQuery;
  }

  const parsed = listPromosSchema.parse({
    query: req.query,
  });

  return parsed.query;
}

function parsePromoParams(req: Request, res: Response): PromoParams {
  if (res.locals.validatedParams) {
    return res.locals.validatedParams as PromoParams;
  }

  const parsed = getPromoByIdSchema.parse({
    params: req.params,
  });

  return parsed.params;
}

function parseCreatePromoBody(req: Request, res: Response): PromoBody {
  if (res.locals.validatedBody) {
    return res.locals.validatedBody as PromoBody;
  }

  const parsed = createPromoSchema.parse({
    body: req.body,
  });

  return parsed.body;
}

function parseUpdatePromoInput(
  req: Request,
  res: Response,
): {
  params: PromoParams;
  body: PromoBody;
} {
  if (res.locals.validatedParams && res.locals.validatedBody) {
    return {
      params: res.locals.validatedParams as PromoParams,
      body: res.locals.validatedBody as PromoBody,
    };
  }

  const parsed = updatePromoSchema.parse({
    params: req.params,
    body: req.body,
  });

  return {
    params: parsed.params,
    body: parsed.body,
  };
}

function parseUpdatePromoStatusInput(
  req: Request,
  res: Response,
): {
  params: PromoParams;
  body: PromoStatusBody;
} {
  if (res.locals.validatedParams && res.locals.validatedBody) {
    return {
      params: res.locals.validatedParams as PromoParams,
      body: res.locals.validatedBody as PromoStatusBody,
    };
  }

  const parsed = updatePromoStatusSchema.parse({
    params: req.params,
    body: req.body,
  });

  return {
    params: parsed.params,
    body: parsed.body,
  };
}

export async function getPromoFormMetaController(req: Request, res: Response) {
  try {
    const businessId = getBusinessId(req);
    const data = await getPromoFormMeta(businessId);

    return res.json({
      success: true,
      message: 'Form meta promo berhasil diambil',
      data,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const statusCode = message.includes('tidak ditemukan') ? 404 : 500;

    return res.status(statusCode).json({
      success: false,
      message,
      errors: null,
    });
  }
}

export async function listPromosController(req: Request, res: Response) {
  try {
    const businessId = getBusinessId(req);
    const validatedQuery = parseListPromoQuery(req, res);

    const data = await listPromos({
      businessId,
      search: validatedQuery.search,
      targetType: validatedQuery.targetType,
      effectiveStatus: validatedQuery.effectiveStatus,
      status: validatedQuery.status,
      outletScope: validatedQuery.outletScope,
    });

    return res.json({
      success: true,
      message: 'Daftar promo berhasil diambil',
      data,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: getValidationMessage(error),
        errors: error.flatten(),
      });
    }

    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
      errors: null,
    });
  }
}

export async function getPromoByIdController(req: Request, res: Response) {
  try {
    const businessId = getBusinessId(req);
    const validatedParams = parsePromoParams(req, res);

    const data = await getPromoById(businessId, validatedParams.id);

    return res.json({
      success: true,
      message: 'Detail promo berhasil diambil',
      data,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: getValidationMessage(error),
        errors: error.flatten(),
      });
    }

    const message = getErrorMessage(error);
    const statusCode = message.includes('tidak ditemukan') ? 404 : 500;

    return res.status(statusCode).json({
      success: false,
      message,
      errors: null,
    });
  }
}

export async function createPromoController(req: Request, res: Response) {
  try {
    const businessId = getBusinessId(req);
    const validatedBody = parseCreatePromoBody(req, res);

    const data = await createPromo(businessId, validatedBody);

    return res.status(201).json({
      success: true,
      message: 'Promo berhasil dibuat',
      data,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: getValidationMessage(error),
        errors: error.flatten(),
      });
    }

    const message = getErrorMessage(error);
    const statusCode = message.includes('tidak ditemukan') ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message,
      errors: null,
    });
  }
}

export async function updatePromoController(req: Request, res: Response) {
  try {
    const businessId = getBusinessId(req);
    const validatedInput = parseUpdatePromoInput(req, res);

    const data = await updatePromo(
      businessId,
      validatedInput.params.id,
      validatedInput.body,
    );

    return res.json({
      success: true,
      message: 'Promo berhasil diubah',
      data,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: getValidationMessage(error),
        errors: error.flatten(),
      });
    }

    const message = getErrorMessage(error);
    const statusCode = message.includes('tidak ditemukan') ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message,
      errors: null,
    });
  }
}

export async function updatePromoStatusController(
  req: Request,
  res: Response,
) {
  try {
    const businessId = getBusinessId(req);
    const validatedInput = parseUpdatePromoStatusInput(req, res);

    const data = await updatePromoStatus(
      businessId,
      validatedInput.params.id,
      validatedInput.body.status,
    );

    return res.json({
      success: true,
      message: 'Status promo berhasil diubah',
      data,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: getValidationMessage(error),
        errors: error.flatten(),
      });
    }

    const message = getErrorMessage(error);
    const statusCode = message.includes('tidak ditemukan') ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message,
      errors: null,
    });
  }
}