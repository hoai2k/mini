import type { ImgHTMLAttributes } from 'react';

// The shared page requests unoptimized local images. Pages has no image server.
export default function Image({
  unoptimized: _unoptimized,
  alt,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) {
  // Static Pages serves the pre-generated local assets without an image server.
  // eslint-disable-next-line next/no-img-element
  return <img {...props} alt={alt} />;
}
