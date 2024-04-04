import { css } from "@emotion/css";
import ArtistTrackGroup from "components/Artist/ArtistTrackGroup";
import Box from "components/common/Box";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import React from "react";
import api from "../../../services/api";
import { useTranslation } from "react-i18next";
import WidthContainer from "components/common/WidthContainer";
import { useAuthContext } from "state/AuthContext";

function Profile() {
  const { user } = useAuthContext();
  const userId = user?.id;

  const [purchases, setPurchases] = React.useState<UserTrackGroupPurchase[]>();
  const { t } = useTranslation("translation", { keyPrefix: "profile" });

  const fetchTrackGroups = React.useCallback(async () => {
    const { results } = await api.getMany<UserTrackGroupPurchase>(
      `users/${userId}/purchases`
    );
    setPurchases(results);
  }, [userId]);

  React.useEffect(() => {
    fetchTrackGroups();
  }, [fetchTrackGroups]);

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
              (purchases?.length === 0 && <Box>{t("collectionEmpty")}</Box>)}
            <TrackgroupGrid gridNumber={"4"}>
              {purchases?.map(
                (purchase) =>
                  purchase.trackGroup && (
                    <ArtistTrackGroup
                      trackGroup={purchase.trackGroup}
                      key={purchase.trackGroupId}
                    />
                  )
              )}
            </TrackgroupGrid>
          </div>
        </WidthContainer>
      </div>
    </>
  );
}

export default Profile;
