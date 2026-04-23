import fs from 'fs/promises';
import type { NextFunction, Request, Response } from 'express';
import { errorResponse } from '../utils/api-response';

const IMAGE_SIGNATURES = {
  jpeg: Buffer.from([0xff, 0xd8, 0xff]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  webp: {
    riff: Buffer.from('RIFF'),
    webp: Buffer.from('WEBP'),
  },
};

function startsWith(buffer: Buffer, signature: Buffer) {
  return buffer.length >= signature.length && buffer.subarray(0, signature.length).equals(signature);
}

function hasValidImageSignature(buffer: Buffer) {
  if (startsWith(buffer, IMAGE_SIGNATURES.jpeg)) {
    return true;
  }

  if (startsWith(buffer, IMAGE_SIGNATURES.png)) {
    return true;
  }

  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).equals(IMAGE_SIGNATURES.webp.riff) &&
    buffer.subarray(8, 12).equals(IMAGE_SIGNATURES.webp.webp)
  );
}

async function removeUploadedFile(path: string) {
  try {
    await fs.unlink(path);
  } catch {
    // Best effort cleanup; the response should still be based on validation.
  }
}

export async function validateUploadedImage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.file) {
    return next();
  }

  try {
    const fileHandle = await fs.open(req.file.path, 'r');
    const buffer = Buffer.alloc(16);
    const { bytesRead } = await fileHandle.read(buffer, 0, buffer.length, 0);
    await fileHandle.close();

    if (!hasValidImageSignature(buffer.subarray(0, bytesRead))) {
      await removeUploadedFile(req.file.path);
      return res
        .status(400)
        .json(errorResponse('File foto produk tidak valid.'));
    }

    return next();
  } catch {
    await removeUploadedFile(req.file.path);
    return res
      .status(400)
      .json(errorResponse('Gagal memvalidasi file foto produk.'));
  }
}
