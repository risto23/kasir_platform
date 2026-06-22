import type { NextConfig } from 'next';

type ImageRemotePattern = Exclude<
  NonNullable<NonNullable<NextConfig['images']>['remotePatterns']>[number],
  URL
>;

function toRemotePattern(urlValue: string): ImageRemotePattern | null {
  try {
    const url = new URL(urlValue.replace(/\/api\/?$/, ''));

    return {
      protocol: url.protocol === 'https:' ? 'https' : 'http',
      hostname: url.hostname,
      port: url.port,
      pathname: '/**',
    };
  } catch {
    return null;
  }
}

const remotePatterns = [
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  process.env.NEXT_PUBLIC_API_URL,
  process.env.NEXT_PUBLIC_API_BASE_URL,
  process.env.NEXT_PUBLIC_UPLOADS_ORIGIN,
]
  .filter((value): value is string => Boolean(value))
  .map(toRemotePattern)
  .filter((value): value is NonNullable<ReturnType<typeof toRemotePattern>> => value !== null)
  .filter(
    (value, index, list) =>
      list.findIndex(
        (item) =>
          item.protocol === value.protocol &&
          item.hostname === value.hostname &&
          item.port === value.port,
      ) === index,
  );

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.88.160', 'localhost', '127.0.0.1'],
  // allowedDevOrigins: ['192.168.1.3'],
  images: {
    remotePatterns,
  },
};

export default nextConfig;
