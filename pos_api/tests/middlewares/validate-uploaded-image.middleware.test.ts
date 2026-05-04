import type { Request } from 'express';
import { validateUploadedImage } from '../../src/middlewares/validate-uploaded-image.middleware';
import { createMockRequest, createMockResponse, createNext } from '../helpers/express';

jest.mock('fs/promises', () => ({
  open: jest.fn(),
  unlink: jest.fn(),
}));

type FileHandleMock = {
  read: jest.Mock;
  close: jest.Mock;
};

type FsPromisesMock = {
  open: jest.Mock;
  unlink: jest.Mock;
};

describe('validateUploadedImage', () => {
  const fsMock = jest.requireMock('fs/promises') as FsPromisesMock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('passes through when request has no file', async () => {
    const req = createMockRequest() as Request;
    const resp = createMockResponse();
    const next = createNext();

    await validateUploadedImage(req, resp.res, next);

    expect(next).toHaveBeenCalled();
    expect(fsMock.open).not.toHaveBeenCalled();
  });

  it('accepts valid jpeg signature', async () => {
    const fileHandle: FileHandleMock = {
      read: jest.fn(),
      close: jest.fn().mockResolvedValueOnce(undefined),
    };

    fsMock.open.mockResolvedValueOnce(fileHandle);
    fileHandle.read.mockImplementationOnce(
      async (buffer: Buffer) => {
        Buffer.from([0xff, 0xd8, 0xff]).copy(buffer, 0);
        return { bytesRead: 3 };
      },
    );

    const req = createMockRequest({
      file: {
        path: 'image.jpg',
      },
    }) as Request;
    const resp = createMockResponse();
    const next = createNext();

    await validateUploadedImage(req, resp.res, next);

    expect(next).toHaveBeenCalled();
    expect(fsMock.unlink).not.toHaveBeenCalled();
  });

  it('rejects invalid image signature and removes uploaded file', async () => {
    const fileHandle: FileHandleMock = {
      read: jest.fn().mockImplementationOnce(
        async (buffer: Buffer) => {
          Buffer.from('NOT-AN-IMAGE').copy(buffer, 0);
          return { bytesRead: 12 };
        },
      ),
      close: jest.fn().mockResolvedValueOnce(undefined),
    };

    fsMock.open.mockResolvedValueOnce(fileHandle);

    const req = createMockRequest({
      file: {
        path: 'invalid.bin',
      },
    }) as Request;
    const resp = createMockResponse();
    const next = createNext();

    await validateUploadedImage(req, resp.res, next);

    expect(fsMock.unlink).toHaveBeenCalledWith('invalid.bin');
    expect(resp.statusCode).toBe(400);
    expect(resp.jsonBody).toEqual({
      success: false,
      message: 'File foto produk tidak valid.',
      errors: null,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when file read fails', async () => {
    fsMock.open.mockRejectedValueOnce(new Error('cannot open file'));

    const req = createMockRequest({
      file: {
        path: 'broken.jpg',
      },
    }) as Request;
    const resp = createMockResponse();
    const next = createNext();

    await validateUploadedImage(req, resp.res, next);

    expect(fsMock.unlink).toHaveBeenCalledWith('broken.jpg');
    expect(resp.statusCode).toBe(400);
    expect(resp.jsonBody).toEqual({
      success: false,
      message: 'Gagal memvalidasi file foto produk.',
      errors: null,
    });
    expect(next).not.toHaveBeenCalled();
  });
});
