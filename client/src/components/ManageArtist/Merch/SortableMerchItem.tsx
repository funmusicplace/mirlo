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

  return (
    <li ref={setNodeRef} style={style} className="gap-4" {...attributes}>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <ArtistButton
          className="cursor-grab touch-none"
          {...listeners}
          ref={setActivatorNodeRef}
          startIcon={<AiOutlineDrag />}
          aria-label={t("reorder") ?? "reorder"}
        />
        <ImageWithPlaceholder
          src={item.images?.[0]?.sizes?.[60]}
          alt={item.title}
          size={60}
          className="w-[60px] shrink-0"
          square
          objectFit="contain"
        />
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
          <span className="break-words max-md:text-sm">{item.title}</span>
          {!item.isPublic && (
            <Pill variant="warning" className="max-w-full">
              <ImWarning />
              {t("notPublic")}
            </Pill>
          )}
          {item.catalogNumber && (
            <span className="w-full text-sm md:hidden">
              {item.catalogNumber}
            </span>
          )}
        </div>
      </div>
      <div className="w-32 shrink-0 max-md:hidden">{item.catalogNumber}</div>
      <div className="flex shrink-0 gap-2">
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
