import { API_ORIGIN } from '@/lib/api-config';

const uploadsOrigin =
  (process.env.NEXT_PUBLIC_UPLOADS_ORIGIN ?? '').replace(/\/$/, '') || API_ORIGIN;

export function resolveImageUrl(imageUrl?: string | null) {
  if (!imageUrl) {
    return '';
  }

  if (
    imageUrl.startsWith('http://') ||
    imageUrl.startsWith('https://') ||
    imageUrl.startsWith('data:')
  ) {
    return imageUrl;
  }

  if (imageUrl.startsWith('/')) {
    return `${uploadsOrigin}${imageUrl}`;
  }

  return `${uploadsOrigin}/${imageUrl}`;
}
