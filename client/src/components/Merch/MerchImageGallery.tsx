import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import React from "react";
import { useTranslation } from "react-i18next";

const MerchImageGallery: React.FC<{ merch: Merch }> = ({ merch }) => {
  const { t } = useTranslation("translation", { keyPrefix: "merchDetails" });
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const images = merch.images ?? [];
  const selected = images[selectedIndex] ?? images[0];

  return (
    <div className="flex w-full flex-col gap-2">
      <ImageWithPlaceholder
        src={selected?.sizes?.[960]}
        alt={merch.title}
        size={960}
        square
        objectFit="cover"
      />
      {images.length > 1 && (
        <ul className="flex flex-wrap gap-2">
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setSelectedIndex(i)}
                aria-label={t("showImage", { number: i + 1 })}
                aria-pressed={i === selectedIndex}
                className={`block h-16 w-16 overflow-hidden rounded border-2 ${
                  i === selectedIndex
                    ? "border-(--mi-button-color)"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img
                  src={image.sizes?.[120]}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MerchImageGallery;
