import produce from "immer";
import React, { createContext } from "react";
import { useLocation, useParams } from "react-router-dom";
import api from "services/api";

export interface ArtistState {
  artist?: Artist;
  isLoading?: boolean;
  userStripeStatus?: AccountStatus;
  isArtistContext?: boolean;
}

type SetState = {
  type: "setState";
  state: ArtistState;
};

type SetArtist = {
  type: "setArtist";
  artist?: Artist;
};

type SetLoading = {
  type: "setIsLoading";
  isLoading: boolean;
};

type Actions = SetArtist | SetLoading | SetState;

export const fetchArtist = async (
  artistId?: string,
  managedArtist?: boolean
) => {
  let artist;
  if (artistId) {
    const { result } = await api.get<Artist>(`artists/${artistId}`);
    const publicArtist = result;

    if (managedArtist) {
      const { result } = await api.get<Artist>(
        `users/${publicArtist.userId}/artists/${artistId}`
      );
      artist = result;
    } else {
      artist = publicArtist;
    }
  }

  return artist;
};

export const checkArtistStripeStatus = async (artistUserId?: number) => {
  if (!artistUserId) {
    return;
  }
  let checkAccountStatus;
  try {
    checkAccountStatus = await api.get<AccountStatus>(
      `users/${artistUserId}/stripe/checkAccountStatus`
    );
  } catch (e) {
    console.error("Stripe didn't work", e);
  }
  return checkAccountStatus;
};

export const stateReducer = produce((draft: ArtistState, action: Actions) => {
  switch (action.type) {
    case "setState":
      draft = action.state;
      break;
    case "setArtist":
      draft = {
        ...draft,
        artist: action.artist,
      };
      break;
    case "setIsLoading":
      draft = {
        ...draft,
        isLoading: action.isLoading,
      };
      break;
    default:
      break;
  }

  return { ...draft, isArtistContext: true };
});

const ArtistContext = createContext(
  {} as [ArtistState, React.Dispatch<Actions>, () => Promise<void>]
);

export const ArtistProvider: React.FC<{
  children: React.ReactNode;
  managedArtist?: boolean;
}> = ({ children, managedArtist }) => {
  const { pathname } = useLocation();
  const { artistId } = useParams();
  const [state, dispatch] = React.useReducer(stateReducer, {
    isArtistContext: artistId ? true : false,
    isLoading: true,
  });

  const refreshArtist = React.useCallback(async () => {
    const artist = await fetchArtist(artistId, managedArtist);
    if (artist) {
      dispatch({
        type: "setArtist",
        artist,
      });
    }
  }, [artistId, managedArtist]);

  const initialLoad = React.useCallback(
    async (newPathname: string) => {
      if (artistId) {
        dispatch({ type: "setIsLoading", isLoading: true });
        const artist = await fetchArtist(
          artistId,
          newPathname.includes("manage")
        );

        const checkAccountStatus = await checkArtistStripeStatus(
          artist?.userId
        );

        if (artist) {
          dispatch({
            type: "setState",
            state: {
              isLoading: false,
              artist,
              userStripeStatus: checkAccountStatus?.result ?? {
                detailsSubmitted: false,
                chargesEnabled: false,
              },
              isArtistContext: true,
            },
          });
        }
      } else {
        dispatch({
          type: "setState",
          state: {
            isLoading: false,
            artist: undefined,
            userStripeStatus: undefined,
            isArtistContext: false,
          },
        });
      }
    },
    [artistId]
  );

  React.useEffect(() => {
    initialLoad(pathname);
  }, [initialLoad, pathname]);

  return (
    <ArtistContext.Provider value={[state, dispatch, refreshArtist]}>
      {children}
    </ArtistContext.Provider>
  );
};

export const useArtistContext = () => {
  const artistContext = React.useContext(ArtistContext);
  return {
    state: artistContext[0],
    dispatch: artistContext[1],
    refresh: artistContext[2],
  };
};
