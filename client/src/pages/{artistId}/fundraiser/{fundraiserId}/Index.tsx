import { useQuery } from "@tanstack/react-query";
import ArtistRouterLink from "components/Artist/ArtistButtons";
import AvatarLink from "components/Artist/AvatarLink";
import Box from "components/common/Box";
import FullPageLoadingSpinner from "components/common/FullPageLoadingSpinner";
import ImageGallery from "components/common/ImageGallery";
import { MetaCard } from "components/common/MetaCard";
import RichTextContent from "components/common/RichTextContent";
import ShareButton from "components/common/ShareButton";
import WidthContainer from "components/common/WidthContainer";
import FundraiserGauge from "components/Fundraiser/FundraiserGauge";
import FundraiserRecentPledges, {
  FundraiserPledgeTicker,
} from "components/Fundraiser/FundraiserRecentPledges";
import FundraiserSupport from "components/Fundraiser/FundraiserSupport";
import { queryPublicFundraiser } from "queries";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { getArtistUrl, getFundraiserUrl, getReleaseUrl } from "utils/artist";
import { getHtmlExcerpt } from "utils/getHtmlExcerpt";

function Index() {
  const { t } = useTranslation("translation", {
    keyPrefix: "fundraiserPage",
  });
  const { artistId, fundraiserId } = useParams();
  const { data: fundraiser, isLoading } = useQuery(
    queryPublicFundraiser({
      fundraiserId: fundraiserId ?? "",
      artistId: artistId ?? "",
    })
  );

  if (isLoading) {
    return <FullPageLoadingSpinner />;
  }
  if (!fundraiser) {
    return <Box>{t("doesNotExist")}</Box>;
  }

  const { artist } = fundraiser;
  const currency = fundraiser.currency ?? artist.user?.currency;
  const hasMedia = !!fundraiser.videoEmbedUrl || fundraiser.images.length > 0;

  return (
    <WidthContainer variant="big" justify="center">
      <MetaCard
        title={fundraiser.name}
        description={
          getHtmlExcerpt(fundraiser.description ?? "")[0] ??
          t("fundraiserByArtist", { artistName: artist.name })
        }
        image={fundraiser.images[0]?.sizes?.[600]}
      />
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-6 p-4 lg:grid-cols-[3fr_2fr] lg:gap-10">
        <div className="lg:col-start-1">
          <h1 className="mb-1! font-black!">{fundraiser.name}</h1>
          <div className="text-sm">
            <AvatarLink
              avatar={artist.avatar?.sizes?.[60]}
              name={artist.name}
              to={getArtistUrl(artist)}
            />
          </div>
        </div>
        {hasMedia && (
          <div className="lg:col-start-1">
            <ImageGallery
              aspect="video"
              images={fundraiser.images}
              alt={fundraiser.name}
              video={
                fundraiser.videoEmbedUrl
                  ? { src: fundraiser.videoEmbedUrl, title: t("video") }
                  : undefined
              }
            />
          </div>
        )}
        <aside
          className={`flex flex-col gap-6 rounded-lg border border-(--mi-tint-x-color) p-6 lg:sticky lg:top-4 lg:col-start-2 ${hasMedia ? "lg:row-span-3 lg:row-start-2" : "lg:row-span-4 lg:row-start-1"}`}
        >
          <FundraiserGauge
            amountRaised={fundraiser.amountRaised}
            goalAmount={fundraiser.goalAmount}
            currency={currency}
            pledgeCount={
              fundraiser.isAllOrNothing ? fundraiser.pledgeCount : undefined
            }
            className="-mx-6 -mt-6 rounded-t-lg bg-(--mi-tint-color) p-6"
            endDate={fundraiser.endDate}
          />
          <FundraiserPledgeTicker
            pledges={fundraiser.recentPledges}
            currency={currency}
            className="lg:hidden"
          />
          <div className="flex flex-wrap items-center gap-2 ">
            <FundraiserSupport fundraiser={fundraiser} />
            <ShareButton
              showLabel
              title={fundraiser.name}
              modalTitle={t("shareFundraiser")}
              url={`${window.location.origin}${getFundraiserUrl(artist, fundraiser)}`}
              size="big"
              variant="outlined"
              rounded
            />
          </div>
          <FundraiserRecentPledges
            pledges={fundraiser.recentPledges}
            currency={currency}
            className="hidden lg:block"
          />
        </aside>
        {fundraiser.description && (
          <RichTextContent
            html={fundraiser.description}
            className="lg:col-start-1"
          />
        )}
        {fundraiser.trackGroups.length > 0 && (
          <div className="lg:col-start-1">
            <h2 className="text-base! mb-1!">{t("releases")}</h2>
            <ul className="list-disc pl-6">
              {fundraiser.trackGroups.map((trackGroup) => (
                <li key={trackGroup.id}>
                  <ArtistRouterLink to={getReleaseUrl(artist, trackGroup)}>
                    {trackGroup.title}
                  </ArtistRouterLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </WidthContainer>
  );
}

export default Index;
