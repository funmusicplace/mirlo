import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import LazyIframe from "components/common/LazyIframe";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaPlay } from "react-icons/fa";

const ImageGallery: React.FC<{
  images?: { id: string; sizes?: { [key: number]: string } }[];
  alt: string;
  video?: { src: string; title: string };
  aspect?: "square" | "video";
}> = ({ images = [], alt, video, aspect = "square" }) => {
  const { t } = useTranslation("translation", { keyPrefix: "merchDetails" });
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const slideCount = images.length + (video ? 1 : 0);
  const isVideoSelected = !!video && selectedIndex === 0;
  const selected = images[selectedIndex - (video ? 1 : 0)] ?? images[0];

  const thumbnailClass = (isSelected: boolean) =>
    `block h-16 w-16 overflow-hidden rounded border-2 ${
      isSelected
        ? "border-(--mi-button-color)"
        : "border-transparent opacity-70 hover:opacity-100"
    }`;

  return (
    <div className="flex w-full flex-col gap-2">
      {aspect === "video" ? (
        <div className="aspect-video w-full overflow-hidden bg-(--mi-darken-background-color)">
          {isVideoSelected ? (
            <LazyIframe
              src={video.src}
              title={video.title}
              className="h-full w-full border-0"
              allow="fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            selected && (
              <img
                src={selected.sizes?.[1280] ?? selected.sizes?.[960]}
                alt={alt}
                className="h-full w-full object-cover"
              />
            )
          )}
        </div>
      ) : (
        <ImageWithPlaceholder
          src={selected?.sizes?.[960]}
          alt={alt}
          size={960}
          square
          objectFit="cover"
        />
      )}
      {slideCount > 1 && (
        <ul className="flex flex-wrap gap-2">
          {video && (
            <li>
              <button
                type="button"
                onClick={() => setSelectedIndex(0)}
                aria-label={t("showVideo")}
                aria-pressed={isVideoSelected}
                className={`${thumbnailClass(isVideoSelected)} flex items-center justify-center bg-(--mi-darken-background-color)`}
              >
                <FaPlay aria-hidden />
              </button>
            </li>
          )}
          {images.map((image, i) => {
            const index = i + (video ? 1 : 0);
            return (
              <li key={image.id}>
                <button
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  aria-label={t("showImage", { number: i + 1 })}
                  aria-pressed={index === selectedIndex}
                  className={thumbnailClass(index === selectedIndex)}
                >
                  <img
                    src={image.sizes?.[120]}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ImageGallery;
