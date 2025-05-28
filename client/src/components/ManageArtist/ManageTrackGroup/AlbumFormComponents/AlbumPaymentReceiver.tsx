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
import useArtistQuery from "utils/useArtistQuery";
import { hasId } from "./ManageTags";
import { queryManagedTrackGroup, queryTrackGroup } from "queries";
import { useQuery } from "@tanstack/react-query";
import Pill from "components/common/Pill";
import { FaTimes } from "react-icons/fa";

const AlbumPaymentReceiver = () => {
  const { trackGroupId } = useParams();
  const { data: trackGroup, refetch } = useQuery(
    queryManagedTrackGroup(Number(trackGroupId) || 0)
  );
  const { data: artist } = useArtistQuery();
  const { t } = useTranslation("translation", { keyPrefix: "manageAlbum" });

  const searchUsers = React.useCallback(async (search: string) => {
    const labels = await api.getMany<Label>(`labels`, {
      name: search.trim(),
    });

    return labels.results.map((label) => ({
      id: label.id,
      name: label.name,
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

  if (!artist) {
    return null;
  }

  return (
    <div>
      <FormComponent>
        <label>{t("nameOfAccountToReceivePayment")}</label>
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
        <small>
          <Trans
            t={t}
            i18nKey={"receivePaymentDescription"}
            components={{
              artistPage: (
                <ArtistButtonLink
                  to={getArtistManageUrl(artist.id)}
                ></ArtistButtonLink>
              ),
            }}
          />
        </small>
      </FormComponent>
    </div>
  );
};

export default AlbumPaymentReceiver;
