import React from "react";

export const ImageWithPlaceholder: React.FC<{
  src?: string;
  alt: string;
  size: number;
  className?: string;
}> = ({ src, alt, size, className }) => {
  const [isChecking, setIsChecking] = React.useState(false);
  const [checkedSrc, setCheckedSrc] = React.useState<string>();

  // FIXME: this is less than elegant. For every image we're
  // checking if it is a real image or whether it returns a 404.
  // why is the API returning 404s on images? If they don't
  // exist we shouldn't be returning them on the API.
  React.useEffect(() => {
    const prefetchSrc = async () => {
      setIsChecking(true);
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
      } finally {
        setIsChecking(false);
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
            width: "100%",
            maxWidth: `${size}px`,
            height: `100%`,
          }}
        />
      )}
      {!checkedSrc && (
        <div
          style={{
            backgroundColor: "var(--mi-shade-background-color)",
            display: "block",
            width: `100%`,
            height: `100%`,
            aspectRatio: "1/1",
          }}
          className={className}
        />
      )}
    </>
  );
};

export default ImageWithPlaceholder;
