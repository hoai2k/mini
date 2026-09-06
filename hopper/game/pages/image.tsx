import type { ImgHTMLAttributes } from 'react';

// The shared page requests unoptimized local images. Pages has no image server.
export default function Image({
  unoptimized: _unoptimized,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) {
  return <img {...props} />;
}
