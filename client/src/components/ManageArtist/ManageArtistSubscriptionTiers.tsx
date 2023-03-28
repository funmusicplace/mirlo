import { css } from "@emotion/css";
import Box from "components/common/Box";
import Button from "components/common/Button";
import React from "react";
import { FaPen, FaTrash } from "react-icons/fa";
import { useParams } from "react-router-dom";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import SubscriptionForm from "./SubscriptionForm";

const ManageArtistSubscriptionTiers: React.FC<{}> = () => {
  const {
    state: { user },
  } = useGlobalStateContext();
  const { artistId } = useParams();
  const [artist, setArtist] = React.useState<Artist>();

  const [subscriptions, setSubscriptions] = React.useState<
    ArtistSubscriptionTier[]
  >([]);

  const userId = user?.id;

  const loadSubscriptions = React.useCallback(async () => {
    if (userId) {
      const result = await api.get<{ artist: Artist }>(
        `users/${userId}/artists/${artistId}`
      );
      setArtist(result.artist);
      const fetchedSubscriptions = await api.get<{
        results: ArtistSubscriptionTier[];
      }>(`users/${userId}/artists/${artistId}/subscriptions`);
      setSubscriptions(fetchedSubscriptions.results);
    }
  }, [artistId, userId]);

  React.useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  if (!artist) {
    return null;
  }

  return (
    <div
      className={css`
        margin-bottom: 2rem;
        margin-top: 2rem;
      `}
    >
      <h2>Your subscription tiers</h2>
      <div
        className={css`
          margin-bottom: 1rem;
        `}
      >
        {subscriptions?.map((subscription) => (
          <Box
            key={subscription.id}
            className={css`
              margin-bottom: 0.5rem;
            `}
          >
            <div
              className={css`
                display: flex;
                justify-content: space-between;
              `}
            >
              <strong>{subscription.name}:</strong>
              <div>
                <Button compact startIcon={<FaPen />}>
                  Edit
                </Button>
                <Button
                  className={css`
                    margin-left: 0.5rem;
                  `}
                  compact
                  startIcon={<FaTrash />}
                >
                  Delete
                </Button>
              </div>
            </div>
            <div>{subscription.description}</div>
          </Box>
        ))}
      </div>
      <div></div>

      <SubscriptionForm artist={artist} reload={loadSubscriptions} />
    </div>
  );
};

export default ManageArtistSubscriptionTiers;
