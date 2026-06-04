import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { css } from "@emotion/css";
import {
  ArtistButton,
  ArtistButtonAnchor,
} from "components/Artist/ArtistButtons";
import {
  linkCardClass,
  linkCardOnTransparentClass,
} from "components/Artist/linkCardStyle";
import LinkPageHeader from "components/Artist/LinkPageHeader";
import { useTransparentContainer } from "components/ArtistColorsProvider";
import {
  findOutsideSite,
  linkUrlDisplay,
  linkUrlHref,
} from "components/common/LinkIconDisplay";
import WidthContainer from "components/common/WidthContainer";
import { useUpdateArtistMutation } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { AiOutlineDrag } from "react-icons/ai";
import { FaExternalLinkAlt, FaEyeSlash, FaPen, FaPlus } from "react-icons/fa";
import useErrorHandler from "services/useErrorHandler";
import { useSnackbar } from "state/SnackbarContext";
import { transformFromLinks } from "utils/links";
import useManagedArtistQuery from "utils/useManagedArtistQuery";

import { bp } from "../../constants";

import LinkEditModal from "./LinkEditModal";

const linkKey = (link: Link, index: number) =>
  `${link.url || "new"}-${link.linkType || ""}-${index}`;

const SortableLinkCard: React.FC<{
  link: Link;
  sortableId: string;
  onEdit: () => void;
}> = ({ link, sortableId, onEdit }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const transparent = useTransparentContainer();
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 1 : undefined,
  };

  const site = findOutsideSite(link);
  const isHidden = !link.inHeader;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`${linkCardClass} ${transparent ? linkCardOnTransparentClass : ""} flex items-stretch`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={t("reorderLinks")}
        className="cursor-grab touch-none px-3 text-(--mi-light-foreground-color) shrink-0"
        {...listeners}
      >
        <AiOutlineDrag />
      </button>

      <button
        type="button"
        onClick={onEdit}
        aria-label={t("editLink")}
        className="flex-1 min-w-0 flex items-center justify-center gap-3 p-6 max-md:p-4 text-lg text-(--mi-button-color) hover:bg-(--mi-tint-color) cursor-pointer border-0 bg-transparent"
      >
        <span aria-hidden className="text-xl shrink-0 flex items-center">
          {link.iconUrl ? (
            <img
              src={link.iconUrl}
              alt=""
              className="w-5 h-5 rounded object-cover"
            />
          ) : (
            site.icon
          )}
        </span>
        <span className="truncate">{linkUrlDisplay(link) || link.url}</span>
        {isHidden && (
          <span
            className="inline-flex items-center gap-1 text-xs text-(--mi-text-color) bg-(--mi-tint-x-color) rounded-full px-2 py-0.5 shrink-0 ml-2"
            title={t("linkHiddenFromHeader")}
          >
            <FaEyeSlash aria-hidden />
            <span className="max-md:hidden">{t("linkHiddenFromHeader")}</span>
          </span>
        )}
      </button>

      <div className="flex items-stretch shrink-0">
        {link.url && (
          <ArtistButtonAnchor
            href={linkUrlHref(link.url, true)}
            target="_blank"
            rel="noreferrer"
            size="compact"
            variant="transparent"
            aria-label={link.url}
            startIcon={<FaExternalLinkAlt />}
            className="h-full rounded-none!"
          />
        )}
        <ArtistButton
          size="compact"
          variant="transparent"
          onClick={onEdit}
          aria-label={t("editLink")}
          startIcon={<FaPen />}
          className="h-full rounded-none!"
        />
      </div>
    </div>
  );
};

const ManageArtistLinks: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const { data: artist } = useManagedArtistQuery();
  const { mutateAsync: updateArtist, isPending } = useUpdateArtistMutation();
  const snackbar = useSnackbar();
  const errorHandler = useErrorHandler();

  const serverLinks = React.useMemo<Link[]>(
    () => (artist ? transformFromLinks(artist).linkArray : []),
    [artist]
  );

  const [orderedLinks, setOrderedLinks] = React.useState<Link[]>(serverLinks);

  React.useEffect(() => {
    setOrderedLinks(serverLinks);
  }, [serverLinks]);

  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const persistLinks = React.useCallback(
    async (next: Link[]) => {
      if (!artist) return;
      try {
        await updateArtist({
          userId: artist.userId,
          artistId: artist.id,
          body: { linksJson: next, links: [] },
        });
        snackbar(t("updatedLinks"), { type: "success" });
      } catch (e) {
        errorHandler(e);
      }
    },
    [artist, updateArtist, snackbar, t, errorHandler]
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedLinks.findIndex(
      (l, i) => linkKey(l, i) === active.id
    );
    const newIndex = orderedLinks.findIndex(
      (l, i) => linkKey(l, i) === over.id
    );
    if (oldIndex === -1 || newIndex === -1) return;

    const next = [...orderedLinks];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    setOrderedLinks(next);
    await persistLinks(next);
  };

  const handleSaveExisting = async (index: number, link: Link) => {
    const next = orderedLinks.map((l, i) => (i === index ? link : l));
    setOrderedLinks(next);
    await persistLinks(next);
  };

  const handleDeleteExisting = async (index: number) => {
    const next = orderedLinks.filter((_, i) => i !== index);
    setOrderedLinks(next);
    await persistLinks(next);
  };

  const handleAddNew = async (link: Link) => {
    const next = [...orderedLinks, link];
    setOrderedLinks(next);
    await persistLinks(next);
  };

  if (!artist) {
    return null;
  }

  const editingLink =
    editingIndex !== null ? orderedLinks[editingIndex] : undefined;

  return (
    <WidthContainer variant="medium">
      <div
        className={css`
          padding: 3rem;

          @media screen and (max-width: ${bp.medium}px) {
            width: 90%;
            margin: 0 auto;
            padding: 2rem var(--mi-side-paddings-small);
          }
        `}
      >
        <LinkPageHeader artist={artist} />

        {orderedLinks.length > 0 && (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext
              items={orderedLinks.map((l, i) => linkKey(l, i))}
              strategy={verticalListSortingStrategy}
            >
              <ul className="list-none p-0 m-0">
                {orderedLinks.map((link, index) => {
                  const id = linkKey(link, index);
                  return (
                    <li key={id}>
                      <SortableLinkCard
                        link={link}
                        sortableId={id}
                        onEdit={() => setEditingIndex(index)}
                      />
                    </li>
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>
        )}

        <ArtistButton
          wrap
          type="button"
          variant="dashed"
          onClick={() => setIsAddOpen(true)}
          disabled={isPending}
          startIcon={<FaPlus />}
          className="w-full my-2"
        >
          {t("addNewLink")}
        </ArtistButton>

        <LinkEditModal
          open={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onSave={handleAddNew}
        />

        <LinkEditModal
          open={editingIndex !== null}
          link={editingLink}
          onClose={() => setEditingIndex(null)}
          onSave={(link) => {
            if (editingIndex !== null) {
              return handleSaveExisting(editingIndex, link);
            }
          }}
          onDelete={() => {
            if (editingIndex !== null) {
              return handleDeleteExisting(editingIndex);
            }
          }}
        />
      </div>
    </WidthContainer>
  );
};

export default ManageArtistLinks;
