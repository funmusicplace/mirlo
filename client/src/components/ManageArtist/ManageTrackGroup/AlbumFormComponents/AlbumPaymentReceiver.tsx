import {
  ArtistButton,
  ArtistButtonLink,
} from "components/Artist/ArtistButtons";
import AutoComplete from "components/common/AutoComplete";
import FormComponent from "components/common/FormComponent";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import api from "services/api";
import { getArtistManageUrl } from "utils/artist";
import useManagedArtistQuery from "utils/useManagedArtistQuery";
import { hasId } from "./ManageTags";
import { queryManagedTrackGroup, queryTrackGroup } from "queries";
import { useQuery } from "@tanstack/react-query";
import Pill from "components/common/Pill";
import { FaTimes } from "react-icons/fa";
import { css } from "@emotion/css";
import { useAuthContext } from "state/AuthContext";

const AlbumPaymentReceiver = () => {
  const { trackGroupId } = useParams();
  const { data: trackGroup, refetch } = useQuery(
    queryManagedTrackGroup(Number(trackGroupId) || 0)
  );
  const { user } = useAuthContext();
  const { data: artist } = useManagedArtistQuery();
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });

  const searchUsers = React.useCallback(async (search: string) => {
    const trimmedSearch = search.trim().toLowerCase();
    const labels = (artist?.artistLabels ?? []).filter(
      (label) =>
        label.isArtistApproved &&
        label.isLabelApproved &&
        (label.labelUser?.name?.toLowerCase().includes(trimmedSearch) ||
          label.labelUser?.email?.toLowerCase().includes(trimmedSearch) ||
          label.labelUser?.artists?.some((a) =>
            a.name.toLowerCase().includes(trimmedSearch)
          ))
    );

    return labels.map((label) => ({
      id: label.labelUserId,
      name: label.labelUser.name,
      isLabel: true,
    }));
  }, []);

  const setLabelForPayment = React.useCallback(
    async (
      label: string | number | { id: string | number | null; name: string }
    ) => {
      try {
        // Handle the selection of a label for payment
        if (hasId(label)) {
          await api.put(`manage/trackGroups/${trackGroupId}`, {
            paymentToUserId: label.id,
            artistId: artist?.id,
          });
        }
        refetch();
      } catch (error) {
        console.error("Error setting label for payment:", error);
      }
    },
    []
  );

  const isLabelUser =
    user && artist?.artistLabels?.some((al) => al.labelUserId === user.id);

  if (!artist) {
    return null;
  }

  if ((artist.artistLabels ?? []).length === 0) {
    return null;
  }

  return (
    <div>
      <FormComponent>
        <label>{t("nameOfAccountToReceivePayment")}</label>
        <small
          className={css`
            display: block;
            margin-bottom: 0.5rem;
          `}
        >
          <Trans
            t={t}
            i18nKey={
              isLabelUser
                ? "labelReceivePaymentDescription"
                : "receivePaymentDescription"
            }
            components={{
              artistPage: (
                <ArtistButtonLink
                  variant="link"
                  to={getArtistManageUrl(artist.id)}
                ></ArtistButtonLink>
              ),
              labelPage: (
                <ArtistButtonLink
                  variant="link"
                  to={"/profile/label"}
                ></ArtistButtonLink>
              ),
            }}
          />
        </small>
        {trackGroup?.paymentToUser && (
          <Pill>
            {trackGroup.paymentToUser.name}{" "}
            <ArtistButton
              variant="dashed"
              startIcon={<FaTimes />}
              onClick={() => {
                setLabelForPayment({ id: null, name: "" });
              }}
            />
          </Pill>
        )}
        {!trackGroup?.paymentToUser && (
          <AutoComplete
            getOptions={searchUsers}
            onSelect={setLabelForPayment}
          />
        )}
      </FormComponent>
    </div>
  );
};

export default AlbumPaymentReceiver;
