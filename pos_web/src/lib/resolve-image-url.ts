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

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

  const baseUrl = apiBaseUrl.replace(/\/api\/?$/, '');

  if (imageUrl.startsWith('/')) {
    return `${baseUrl}${imageUrl}`;
  }

  return `${baseUrl}/${imageUrl}`;
}