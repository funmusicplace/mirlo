import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import ImageWithPlaceholder from "components/common/ImageWithPlaceholder";
import Pill from "components/common/Pill";
import React from "react";
import { useTranslation } from "react-i18next";
import { AiOutlineDrag } from "react-icons/ai";
import { FaEye, FaPen } from "react-icons/fa";
import { ImWarning } from "react-icons/im";
import { getMerchUrl } from "utils/artist";

const SortableMerchItem: React.FC<{ artist: Artist; item: Merch }> = ({
  artist,
  item,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "manageMerch" });
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const cover = item.images?.[0]?.sizes?.[60];

  return (
    <li ref={setNodeRef} style={style} {...attributes}>
      <div
        className={`flex items-center [&>span]:ml-4${
          !cover ? " first:max-w-[60px]" : ""
        }`}
      >
        <ArtistButton
          className="mr-2 cursor-grab touch-none"
          {...listeners}
          ref={setActivatorNodeRef}
          startIcon={<AiOutlineDrag />}
          aria-label={t("reorder") ?? "reorder"}
        />
        <ImageWithPlaceholder
          src={item.images?.[0]?.sizes?.[60]}
          alt={item.title}
          size={60}
          square
          objectFit="contain"
        />
        <span className="max-md:text-sm">{item.title}</span>
        {!item.isPublic && (
          <Pill variant="warning">
            <ImWarning />
            {t("notPublic")}
          </Pill>
        )}
      </div>
      <div className="max-md:text-sm">{item.catalogNumber}</div>
      <div className="flex gap-2">
        <ArtistButtonLink
          to={getMerchUrl(artist, item)}
          startIcon={<FaEye />}
        />
        <ArtistButtonLink to={item.id} startIcon={<FaPen />} />
      </div>
    </li>
  );
};

export default SortableMerchItem;
