'use client';

import { useState } from "react";

export function OrgLogo({ src, alt, className, fallbackClassName, initials }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <span className={fallbackClassName || className}>
        {(initials || (alt || "FL").slice(0, 2)).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
