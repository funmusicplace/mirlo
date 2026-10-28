import React from "react";

const SplashBackgroundImage: React.FC<{ sizes: Record<string, string> }> = ({
  sizes,
}) => (
  <img
    src={sizes[1920] ?? sizes.original}
    srcSet={Object.entries(sizes)
      .filter(([width]) => Number(width) > 0)
      .map(([width, url]) => `${url} ${width}w`)
      .join(", ")}
    sizes="100vw"
    alt=""
    className="absolute inset-0 z-0 h-full w-full object-cover"
  />
);

export default SplashBackgroundImage;
