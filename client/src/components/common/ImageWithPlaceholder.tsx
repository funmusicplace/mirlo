import React from "react";

export const ImageWithPlaceholder: React.FC<{
  src?: string;
  alt: string;
  size: number;
  className?: string;
}> = ({ src, alt, size, className }) => {
  const [checkedSrc, setCheckedSrc] = React.useState<string>();

  // FIXME: this is less than elegant. For every image we're
  // checking if it is a real image or whether it returns a 404.
  // why is the API returning 404s on images? If they don't
  // exist we shouldn't be returning them on the API.
  React.useEffect(() => {
    const prefetchSrc = async () => {
      try {
        if (src) {
          const img = new Image();
          img.src = src;
          img.onload = () => {
            setCheckedSrc(src);
          };
        }
      } catch {
        console.error("src returns 404", src);
      }
    };

    prefetchSrc();
  }, [src]);

  return (
    <>
      {checkedSrc && (
        <img
          src={checkedSrc}
          alt={alt}
          width={size}
          height={size}
          className={className}
          style={{
            width: `${size}px`,
            height: `${size}px`,
          }}
        />
      )}
      {!checkedSrc && (
        <div
          style={{
            backgroundColor: "#c1006d",
            display: "block",
            width: `${size}px`,
            height: `${size}px`,
          }}
          className={className}
        />
      )}
    </>
  );
};

export default ImageWithPlaceholder;
