import { useQuery } from "@tanstack/react-query";
import LoadingBlocks from "components/Artist/LoadingBlocks";
import BackToArtistLink from "components/ManageArtist/BackToArtistLink";
import FundraiserForm from "components/ManageArtist/Fundraisers/FundraiserForm";
import { queryManagedArtist, queryManagedFundraiser } from "queries";
import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

const Index: React.FC = () => {
  const { artistId, fundraiserId } = useParams();
  const { t } = useTranslation("translation", {
    keyPrefix: "manageFundraiser",
  });
  const navigate = useNavigate();

  const { data: artist } = useQuery(queryManagedArtist(Number(artistId)));
  const { data: fundraiser, isLoading } = useQuery(
    queryManagedFundraiser(Number(fundraiserId))
  );

  if (isLoading || !artist) {
    return <LoadingBlocks rows={5} />;
  }

  if (!fundraiser) {
    return null;
  }

  return (
    <div className="p-4">
      <BackToArtistLink subPage="tiers" />
      <h1 className="text-xl font-bold mb-6!">
        {fundraiser.name || t("untitledFundraiser")}
      </h1>
      <FundraiserForm
        key={fundraiser.id}
        artistId={artist.id}
        fundraiser={fundraiser}
        currency={artist.user?.currency}
        defaultPlatformFee={artist.defaultPlatformFee}
        onRemoved={() => navigate(`/manage/artists/${artist.id}/tiers`)}
      />
    </div>
  );
};

export default Index;
