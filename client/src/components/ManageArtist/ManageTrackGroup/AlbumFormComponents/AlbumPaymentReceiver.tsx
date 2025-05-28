import { ArtistButtonLink } from "components/Artist/ArtistButtons";
import AutoComplete from "components/common/AutoComplete";
import FormComponent from "components/common/FormComponent";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import api from "services/api";
import { getArtistManageUrl } from "utils/artist";
import useArtistQuery from "utils/useArtistQuery";

const AlbumPaymentReceiver = () => {
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
    (label: string | number | { id: string | number; name: string }) => {
      // Handle the selection of a label for payment
      console.log("Selected label for payment:", label);
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
        <AutoComplete
          getOptions={searchUsers}
          onSelect={setLabelForPayment}
        ></AutoComplete>
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
