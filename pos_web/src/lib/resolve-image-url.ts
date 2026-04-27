import { API_ORIGIN } from '@/lib/api-config';

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
    return `${API_ORIGIN}${imageUrl}`;
  }

  return `${API_ORIGIN}/${imageUrl}`;
}
