import { css } from "@emotion/css";
import Box from "components/common/Box";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import React from "react";
import api from "services/api";
import { Trans, useTranslation } from "react-i18next";
import WidthContainer from "components/common/WidthContainer";
import { useAuthContext } from "state/AuthContext";
import ReleaseCard from "components/common/ReleaseCard";
import TrackCard from "components/common/TrackCard";
import {
  isTrackGroupPurchase,
  isTrackPurchase,
  isUserTransaction,
} from "types/typeguards";
import { Link } from "react-router-dom";

type UserPurchase = UserTrackGroupPurchase | UserTrackPurchase;

function Index() {
  const { user } = useAuthContext();
  const userId = user?.id;

  const [purchases, setPurchases] = React.useState<UserPurchase[]>();
  const { t } = useTranslation("translation", { keyPrefix: "profile" });

  const fetchCollection = React.useCallback(async () => {
    const { results } = await api.getMany<UserPurchase>(
      `users/${userId}/collection`
    );
    setPurchases(results);
  }, [userId]);

  React.useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  if (!user) {
    return null;
  }

  return (
    <>
      <div
        className={css`
          padding: var(--mi-side-paddings-xsmall);
        `}
      >
        <WidthContainer variant="big" justify="center">
          <h1>{t("yourCollection")}</h1>
          <div
            className={css`
              display: flex;
              width: 100%;
              flex-direction: row;
              flex-wrap: wrap;
            `}
          >
            {!purchases ||
              (purchases?.length === 0 && (
                <Box
                  className={css`
                    border: 1px solid var(--mi-darken-x-background-color);
                  `}
                >
                  <Trans
                    t={t}
                    i18nKey="collectionEmpty"
                    components={{
                      releases: <Link to="/releases"></Link>,
                      artists: <Link to="/artists"></Link>,
                      tags: <Link to="/tags"></Link>,
                    }}
                  />
                </Box>
              ))}
            <TrackgroupGrid gridNumber={"4"}>
              {purchases?.map((purchase) => {
                if (isTrackGroupPurchase(purchase) && purchase.trackGroup) {
                  return (
                    <ReleaseCard
                      trackGroup={purchase.trackGroup}
                      key={purchase.trackGroupId}
                      showArtist
                      showWishlist={false}
                      headingLevel="h2"
                    />
                  );
                } else if (isTrackPurchase(purchase) && purchase.track) {
                  return (
                    <TrackCard
                      track={purchase.track}
                      key={purchase.track.id}
                      showArtist
                      headingLevel="h2"
                    />
                  );
                }
              })}
            </TrackgroupGrid>
          </div>
        </WidthContainer>
      </div>
    </>
  );
}

export default Index;
