import type { NextFunction, Request, Response } from 'express';

describe('errorMiddleware', () => {
  const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns original message outside production', () => {
    jest.doMock('../../src/config/env', () => ({
      env: {
        nodeEnv: 'development',
      },
    }));

    const { errorMiddleware } = jest.requireActual('../../src/middlewares/error.middleware') as {
      errorMiddleware: (
        err: Error & { statusCode?: number },
        req: Request,
        res: Response,
        next: NextFunction,
      ) => Response;
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    errorMiddleware(
      Object.assign(new Error('bad request'), { statusCode: 400 }),
      {} as Request,
      res,
      jest.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'bad request',
      errors: null,
    });
  });

  it('forwards structured error payload when available', () => {
    jest.doMock('../../src/config/env', () => ({
      env: {
        nodeEnv: 'development',
      },
    }));

    const { errorMiddleware } = jest.requireActual('../../src/middlewares/error.middleware') as {
      errorMiddleware: (
        err: Error & { statusCode?: number; errors?: unknown },
        req: Request,
        res: Response,
        next: NextFunction,
      ) => Response;
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    errorMiddleware(
      Object.assign(new Error('limit reached'), {
        statusCode: 403,
        errors: {
          blockedAction: 'CREATE_PRODUCT',
          limit: 2,
          usage: 2,
        },
      }),
      {} as Request,
      res,
      jest.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'limit reached',
      errors: {
        blockedAction: 'CREATE_PRODUCT',
        limit: 2,
        usage: 2,
      },
    });
  });

  it('hides 500 error message in production', () => {
    jest.doMock('../../src/config/env', () => ({
      env: {
        nodeEnv: 'production',
      },
    }));

    const { errorMiddleware } = jest.requireActual('../../src/middlewares/error.middleware') as {
      errorMiddleware: (
        err: Error & { statusCode?: number },
        req: Request,
        res: Response,
        next: NextFunction,
      ) => Response;
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    errorMiddleware(new Error('sensitive'), {} as Request, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal server error',
      errors: null,
    });
  });
});

describe('notFoundMiddleware', () => {
  it('returns 404 response', () => {
    const { notFoundMiddleware } = jest.requireActual('../../src/middlewares/not-found.middleware') as {
      notFoundMiddleware: (req: Request, res: Response) => Response;
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    notFoundMiddleware({} as Request, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Route not found',
      errors: null,
    });
  });
});
