import ArtistSquare from "components/Artist/ArtistSquare";
import Box from "components/common/Box";
import Pill from "components/common/Pill";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import WidthContainer from "components/common/WidthContainer";
import FilterGroup from "components/Profile/UserNotificationFeed/FilterGroup";
import React from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "state/AuthContext";

type Filter = "all" | "follows" | "subscriptions";

function Index() {
  const { t } = useTranslation("translation", { keyPrefix: "profile" });
  const { user } = useAuthContext();
  const [filter, setFilter] = React.useState<Filter>("all");

  if (!user) {
    return null;
  }

  const subs = user.artistUserSubscriptions ?? [];
  const items = subs.filter((s) => {
    if (filter === "all") return true;
    if (filter === "follows") return s.artistSubscriptionTier.isDefaultTier;
    return !s.artistSubscriptionTier.isDefaultTier;
  });

  const emptyKey =
    filter === "subscriptions" ? "noSubscriptionsYet" : "noFollowedArtistsYet";

  return (
    <div className="p-(--mi-side-paddings-xsmall)">
      <WidthContainer variant="big" justify="center">
        <h1>{t("followedArtists")}</h1>
        <FilterGroup
          legend={t("profileFilterLegend")}
          name="profile-filter"
          options={[
            { value: "all", label: t("filterAll") },
            { value: "follows", label: t("filterFollows") },
            { value: "subscriptions", label: t("filterSubscriptions") },
          ]}
          value={filter}
          onChange={(value) => setFilter(value as Filter)}
        />
        {items.length === 0 ? (
          <Box>{t(emptyKey)}</Box>
        ) : (
          <TrackgroupGrid gridNumber="6">
            {items.map((s) => {
              const tier = s.artistSubscriptionTier;
              return (
                <div key={tier.artist.id} className="relative">
                  <ArtistSquare artist={tier.artist} />
                  {!tier.isDefaultTier && (
                    <Pill
                      className="absolute top-2 right-2 max-w-[60%] bg-(--mi-off-white)!"
                      title={tier.name}
                    >
                      <span className="truncate">{tier.name}</span>
                    </Pill>
                  )}
                </div>
              );
            })}
          </TrackgroupGrid>
        )}
      </WidthContainer>
    </div>
  );
}

export default Index;
