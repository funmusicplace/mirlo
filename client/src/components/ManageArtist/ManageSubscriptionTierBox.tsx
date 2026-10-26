import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import Box from "components/common/Box";
import MarkdownContent from "components/common/MarkdownContent";
import { Money } from "components/common/Money";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";
import React from "react";
import { useTranslation } from "react-i18next";
import { AiOutlineDrag } from "react-icons/ai";
import { FaPen, FaTrash } from "react-icons/fa";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useAuthContext } from "state/AuthContext";
import { useSnackbar } from "state/SnackbarContext";
import { getArtistManageTiersUrl } from "utils/artist";

const ManageSubscriptionTierBox: React.FC<{
  tier: ArtistSubscriptionTier;
  artist: Artist;
  reload: () => Promise<unknown>;
}> = ({ tier, reload, artist }) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "subscriptionForm",
  });
  const { user } = useAuthContext();
  const snackbar = useSnackbar();

  const { artistId } = useParams();

  const userId = user?.id;

  const deleteTier = React.useCallback(
    async (tierId: number) => {
      try {
        await api.delete(
          `manage/artists/${artistId}/subscriptionTiers/${tierId}`
        );
        snackbar("Tier deleted", { type: "success" });
        reload();
      } catch (e) {
        console.error(e);
      }
    },
    [artistId, reload, snackbar, userId]
  );

  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: tier.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Box
        key={tier.id}
        className="bg-(--mi-tint-color) h-full"
        noPadding
      >
        {tier.images?.[0]?.image.sizes?.[625] && (
          <img
            src={tier.images[0].image.sizes[625] + `?updatedAt=${Date.now()}`}
            width="100%"
            height="180px"
            className="object-cover"
          />
        )}
        <div className="p-4">
          <SpaceBetweenDiv className="flex-col">
            <div className="my-2 w-full flex justify-between pb-4 items-center [border-bottom:var(--mi-border)]">
              <div className="w-[70%]">
                <strong className="uppercase">
                  {tier.name}:{" "}
                  <Money
                    amount={tier.minAmount ? tier.minAmount / 100 : 0}
                    currency={artist.user?.currency ?? "usd"}
                  />{" "}
                  {t(tier.interval === "MONTH" ? "monthly" : "yearly")}
                </strong>
              </div>
              <div className="flex">
                <ArtistButton
                  variant="dashed"
                  className="cursor-grab touch-none"
                  {...listeners}
                  ref={setActivatorNodeRef}
                  aria-label={t("reorderTier")}
                  startIcon={<AiOutlineDrag />}
                />

                <ArtistButtonLink
                  variant="dashed"
                  className="ml-2"
                  startIcon={<FaPen />}
                  to={getArtistManageTiersUrl(artist.id) + `/${tier.id}`}
                />

                <ArtistButton
                  className="ml-2"
                  startIcon={<FaTrash />}
                  onClick={() => deleteTier(tier.id)}
                />
              </div>
            </div>
          </SpaceBetweenDiv>

          <MarkdownContent content={tier.description} />
        </div>
      </Box>
    </div>
  );
};

export default ManageSubscriptionTierBox;
