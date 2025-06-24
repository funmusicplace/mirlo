import React from "react";
import styled from "@emotion/styled";
import { css } from "@emotion/css";

const ImageContainer = styled.div`
  display: block;
  max-width: 100%;
  background-color: var(--mi-darken-background-color);
  aspect-ratio: 1 / 1;
  height: 100%;

  img {
    transition: opacity 0.25s;
    max-width: 100%;
    height: 100%;
  }
`;

export const ImageWithPlaceholder: React.FC<{
  src?: string;
  alt: string;
  size: number;
  className?: string;
  square?: boolean;
}> = ({ src, alt, size, square, className }) => {
  const [isLoading, setLoading] = React.useState(true);
  const [isError, setError] = React.useState(false);

  return (
    <ImageContainer className={className + " image-container"}>
      {src && (
        <img
          src={src}
          alt={alt}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoading(false)}
          onError={() => setError(true)}
          style={{
            aspectRatio: square ? "1" : "unset",
            objectFit: square ? "contain" : "unset",
            opacity: isLoading || isError ? 0 : 1,
          }}
        />
      )}
      {!src && (
        <div
          className={css`
            width: ${size}px;
            display: block;
            aspect-ratio: 1 / 1;
            height: 100%;
          `}
        />
      )}
    </ImageContainer>
  );
};

export default ImageWithPlaceholder;
