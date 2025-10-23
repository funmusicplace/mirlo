import { css } from "@emotion/css";
import Box from "components/common/Box";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import React from "react";
import api from "../../../services/api";
import { Trans, useTranslation } from "react-i18next";
import WidthContainer from "components/common/WidthContainer";
import { useAuthContext } from "state/AuthContext";
import CollectionPurchaseSquare from "./CollectionPurchaseSquare";
import {
  isTrackGroupPurchase,
  isTrackPurchase,
  isUserTransaction,
} from "types/typeguards";
import { Link } from "react-router-dom";

function Profile() {
  const { user } = useAuthContext();
  const userId = user?.id;

  const [purchases, setPurchases] = React.useState<UserTransaction[]>();
  const { t } = useTranslation("translation", { keyPrefix: "profile" });

  const fetchTrackGroups = React.useCallback(async () => {
    const { results } = await api.getMany<UserTransaction>(
      `users/${userId}/purchases`
    );
    setPurchases(
      results.filter((r) => {
        const isNotMerch = r.merchPurchases?.length === 0;
        return isNotMerch;
      })
    );
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
                if (
                  isUserTransaction(purchase) &&
                  purchase.trackGroupPurchases
                ) {
                  return (
                    <CollectionPurchaseSquare
                      trackGroup={purchase.trackGroupPurchases[0].trackGroup}
                      key={purchase.id}
                    />
                  );
                } else if (
                  isUserTransaction(purchase) &&
                  purchase.trackPurchases?.[0]?.track
                ) {
                  return (
                    <CollectionPurchaseSquare
                      trackGroup={purchase.trackPurchases[0].track?.trackGroup}
                      track={purchase.trackPurchases[0].track}
                      key={purchase.id}
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

export default Profile;
