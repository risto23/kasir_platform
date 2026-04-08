import type { Request, Response, NextFunction } from 'express';

export function createMockResponse() {
  let statusCode = 200;
  let body: any;
  const res: Partial<Response> = { locals: {} as any };
  const status = jest.fn().mockImplementation((code: number) => {
    statusCode = code;
    return res as Response;
  });
  const json = jest.fn().mockImplementation((payload: any) => {
    body = payload;
    return res as Response;
  });
  (res as any).status = status;
  (res as any).json = json;
  return {
    res: res as Response,
    status,
    json,
    get statusCode() {
      return statusCode;
    },
    get jsonBody() {
      return body;
    },
  };
}

export function createMockRequest(opts: Partial<Request> = {}): Request {
  const base: Partial<Request> = {
    headers: {},
    body: {},
    params: {},
    query: {},
  };
  return { ...(base as any), ...(opts as any) } as Request;
}

export function createNext(): NextFunction {
  return jest.fn();
}

