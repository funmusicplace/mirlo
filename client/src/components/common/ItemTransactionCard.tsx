import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const ItemTransactionCard: React.FC<
  React.PropsWithChildren<{
    header: React.ReactNode;
    cover?: string;
    title?: string;
    titleLink?: string;
    artistName?: string;
    artistUrl?: string;
  }>
> = ({
  header,
  cover,
  title,
  titleLink,
  artistName,
  artistUrl,
  children,
}) => {
  const { t: tPost } = useTranslation("translation", { keyPrefix: "post" });

  return (
    <div className="flex flex-col items-center text-center gap-4 py-8 px-6 bg-(--mi-button-tint-color) border border-(--mi-tint-color) rounded-[var(--mi-border-radius-x)] max-w-2xl mx-auto w-full">
      <h2 className="m-0! flex items-center gap-2">{header}</h2>

      {cover && (
        <div className="w-60 mt-2">
          <ImageWithPlaceholder
            src={cover}
            alt=""
            size={300}
            className="w-full"
          />
        </div>
      )}

      {title && (
        <div className="flex flex-col gap-1">
          {titleLink ? (
            <p className="font-bold text-lg m-0!">
              <Link to={titleLink} className="no-underline! text-inherit!">
                {title}
              </Link>
            </p>
          ) : (
            <p className="font-bold text-lg m-0!">{title}</p>
          )}
          {artistName && artistUrl && (
            <p className="text-sm text-(--mi-secondary-text-color) m-0!">
              {tPost("postByPrefix")}{" "}
              <Link to={artistUrl} className="text-(--mi-button-color)!">
                {artistName}
              </Link>
            </p>
          )}
        </div>
      )}

      {children}
    </div>
  );
};

export default ItemTransactionCard;
