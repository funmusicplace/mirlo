import FormComponent from "components/common/FormComponent";
import ArtistSlugInput from "components/common/SlugInput";
import SavingInput from "components/ManageArtist/ManageTrackGroup/AlbumFormComponents/SavingInput";
import UploadArtistImage from "components/ManageArtist/UploadArtistImage";
import { ArtistFormSection } from "pages/manage/artists/{artistId}/customize/Index";
import React from "react";
import { useTranslation } from "react-i18next";

const ArtistIdentitySection: React.FC<{ artist: Artist }> = ({ artist }) => {
  const { t } = useTranslation("translation", { keyPrefix: "artistForm" });

  return (
    <ArtistFormSection>
      <div className="max-w-[15rem] mr-8">
        <FormComponent>
          <UploadArtistImage
            existing={artist}
            imageTypeDescription={t("yourAvatar")}
            imageType="avatar"
            height="auto"
            width="100%"
            maxDimensions="1500x1500"
            maxSize="15mb"
          />
        </FormComponent>
      </div>

      <div className="grow">
        <FormComponent>
          <label htmlFor="input-name">{t("displayName")} </label>
          <SavingInput
            formKey="name"
            id="input-name"
            url={`manage/artists/${artist.id}`}
            extraData={{}}
          />
        </FormComponent>
        <FormComponent className="w-full">
          <label htmlFor="input-slug">{t("urlSlug")} </label>
          <ArtistSlugInput
            currentArtistId={artist.id}
            id="input-slug"
            type="artist"
          />
        </FormComponent>
        <FormComponent>
          <label htmlFor="input-description">{t("shortDescription")}</label>
          <SavingInput
            formKey="shortDescription"
            id="input-description"
            maxLength={160}
            url={`manage/artists/${artist.id}`}
            extraData={{}}
          />
        </FormComponent>
        <FormComponent>
          <label htmlFor="textarea-bio">{t("bio")}</label>
          <SavingInput
            formKey="bio"
            id="textarea-bio"
            rows={7}
            url={`manage/artists/${artist.id}`}
            extraData={{}}
          />
        </FormComponent>
      </div>
    </ArtistFormSection>
  );
};

export default ArtistIdentitySection;
