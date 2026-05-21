import { API_ORIGIN } from '@/lib/api-config';

const uploadsOrigin =
  (process.env.NEXT_PUBLIC_UPLOADS_ORIGIN ?? '').replace(/\/$/, '') || API_ORIGIN;

function isLocalhostUrl(url: string) {
  return url.startsWith('http://localhost:') || url.startsWith('http://127.0.0.1:');
}

export function resolveImageUrl(imageUrl?: string | null) {
  if (!imageUrl) {
    return '';
  }

  // Legacy data stored absolute localhost URLs — remap to the configured origin
  if (isLocalhostUrl(imageUrl)) {
    try {
      const { pathname } = new URL(imageUrl);
      return `${uploadsOrigin}${pathname}`;
    } catch {
      return imageUrl;
    }
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
