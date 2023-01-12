// import { css } from "@emotion/css";
// import { useGlobalStateContext } from "contexts/globalState";
// import { useSnackbar } from "contexts/SnackbarContext";
// import React from "react";
// import { FaStar, FaRegStar } from "react-icons/fa";
// import {
//   addTrackToUserFavorites,
//   checkTrackIdsForFavorite,
// } from "../../services/api/User";
// import IconButton from "./IconButton";

// export const spinner = css`
//   > svg {
//     position: relative;
//     animation-name: spinning;
//     animation-duration: 0.5s;
//     animation-iteration-count: infinite;
//     /* linear | ease | ease-in | ease-out | ease-in-out */
//     animation-timing-function: linear;
//   }
// `;

// export const SpinningStar: React.FC<{ spinning: boolean; full: boolean }> = ({
//   spinning,
//   full,
// }) => {
//   return (
//     <div className={spinning ? spinner : ""}>
//       {full && <FaStar />}
//       {!full && <FaRegStar />}
//     </div>
//   );
// };

// export const FavoriteTrack: React.FC<{ track: TrackWithUserCounts }> = ({
//   track,
// }) => {
//   const {
//     state: { checkFavoriteStatusFlag },
//     dispatch,
//   } = useGlobalStateContext();
//   const snackbar = useSnackbar();

//   const [isFavorite, setIsFavorite] = React.useState(track.favorite);
//   const [loadingFavorite, setLoadingFavorite] = React.useState(false);

//   const onClickStar = React.useCallback(
//     async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
//       e.preventDefault();
//       e.stopPropagation();
//       try {
//         setLoadingFavorite(true);

//         await addTrackToUserFavorites(track.id);
//         setIsFavorite((val) => !val);
//         dispatch({ type: "incrementFavoriteStatusFlag" });
//       } catch (e: any) {
//         snackbar(e.message, {
//           type: "warning",
//         });
//       } finally {
//         setLoadingFavorite(false);
//       }
//     },
//     [track.id, dispatch, snackbar]
//   );

//   const onFavoriteStatusFlagChange = React.useCallback(async () => {
//     const resolution = await checkTrackIdsForFavorite([track.id]);
//     if (resolution.length > 0 && resolution[0].trackId === track.id) {
//       setIsFavorite(true);
//     } else {
//       setIsFavorite(false);
//     }
//   }, [track]);

//   React.useEffect(() => {
//     if (checkFavoriteStatusFlag) {
//       onFavoriteStatusFlagChange();
//     }
//   }, [checkFavoriteStatusFlag, onFavoriteStatusFlagChange]);

//   return (
//     <IconButton compact onClick={onClickStar}>
//       <SpinningStar spinning={loadingFavorite} full={isFavorite} />
//     </IconButton>
//   );
// };

export {};
