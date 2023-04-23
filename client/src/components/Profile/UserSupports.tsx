import { css } from "@emotion/css";
import React from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useGlobalStateContext } from "../../state/GlobalState";
import Box from "../common/Box";
import Money from "../common/Money";
import Pill from "../common/Pill";

const UserSupports: React.FC<{
  artistUserSubscriptions: ArtistUserSubscription[];
}> = ({ artistUserSubscriptions }) => {
  const {
    state: { user },
    dispatch,
  } = useGlobalStateContext();

  const fetchProfile = React.useCallback(async () => {
    const { result } = await api.get<LoggedInUser>("profile");
    dispatch({
      type: "setLoggedInUser",
      user: result,
    });
  }, [dispatch]);

  React.useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (!user) {
    return null;
  }

  return (
    <Box
      className={css`
        margin-top: 1rem;
      `}
    >
      <h2>Artists you support</h2>
      {(artistUserSubscriptions?.length ?? 0) > 0 && (
        <ul
          className={css`
            margin-top: 1rem;
            list-style: none;

            li {
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
          `}
        >
          {artistUserSubscriptions?.map((s) => (
            <li>
              <span>
                <strong>
                  <Link to={`/artist/${s.artistSubscriptionTier.artist.id}`}>
                    {s.artistSubscriptionTier.artist.name}
                  </Link>
                </strong>
                : <Money amount={s.amount / 100} />
                /month
              </span>
              <Pill>tier: {s.artistSubscriptionTier.name}</Pill>
            </li>
          ))}
        </ul>
      )}
      {artistUserSubscriptions?.length === 0 && (
        <>You don't support any artists yet</>
      )}
    </Box>
  );
};

export default UserSupports;
