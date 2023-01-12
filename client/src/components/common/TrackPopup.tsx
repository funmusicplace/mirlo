// import React from "react";
// import { css } from "@emotion/css";
// import { FaCode, FaEllipsisV, FaFont, FaMinus, FaPlus } from "react-icons/fa";
// import IconButton from "./IconButton";
// import Modal from "./Modal";
// import ListButton, { NavLinkAsButton } from "./ListButton";
// import { AddToPlaylist } from "../AddToPlaylist";
// import { fetchTrack, fetchTrackGroup } from "../../services/Api";
// import { mapFavoriteAndPlaysToTracks } from "../../utils/tracks";
// import { SpinningStar } from "./FavoriteTrack";
// import { CenteredSpinner } from "./Spinner";
// import TrackPopupDetails from "./TrackPopupDetails";
// import SharePopUp from "./SharePopUp";
// import { useGlobalStateContext } from "../../contexts/globalState";
// import {
//   addTrackToUserFavorites,
//   removeTracksFromPlaylist,
// } from "services/api/User";
// import { useSnackbar } from "contexts/SnackbarContext";

// const TrackPopup: React.FC<{
//   trackId?: string;
//   groupId?: string;
//   compact?: boolean;
//   reload?: () => Promise<void>;
// }> = ({ trackId, groupId, compact, reload }) => {
//   const {
//     state: { user },
//   } = useGlobalStateContext();
//   const snackbar = useSnackbar();
//   const [isMenuOpen, setIsMenuOpen] = React.useState(false);
//   const [isFavorite, setIsFavorite] = React.useState(false);
//   const [artistId, setArtistId] = React.useState<string>();
//   const [trackgroup, setTrackgroup] = React.useState<Trackgroup>();
//   const [isLoadingFavorite, setIsLoadingFavorite] = React.useState(false);
//   const [track, setTrack] = React.useState<Track | TrackWithUserCounts>();
//   const [selectedTrackIds, setSelectedTrackIds] = React.useState<string[]>([]);
//   const [isPlaylistPickerOpen, setIsPlaylistPickerOpen] = React.useState(false);
//   const [isShareOpen, setIsShareOpen] = React.useState(false);
//   const userId = user?.id;

//   const openMenu = React.useCallback(
//     (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
//       e.stopPropagation();
//       setIsMenuOpen(true);
//     },
//     []
//   );

//   const openAddToPlaylist = React.useCallback(
//     (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
//       e.stopPropagation();
//       setIsMenuOpen(false);
//       setIsPlaylistPickerOpen(true);
//     },
//     []
//   );

//   const removeFromPlaylist = React.useCallback(
//     async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
//       e.stopPropagation();
//       if (user && groupId && trackId) {
//         await removeTracksFromPlaylist(groupId, {
//           tracks: [{ trackId }],
//         });
//         if (reload) {
//           reload();
//         }
//       }
//       setIsMenuOpen(false);
//     },
//     [user, groupId, reload, trackId]
//   );

//   const openShare = React.useCallback(
//     (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
//       e.stopPropagation();
//       setIsMenuOpen(false);
//       setIsShareOpen(true);
//     },
//     []
//   );

//   const onSongAdded = React.useCallback(() => {
//     setIsMenuOpen(false);
//     setIsPlaylistPickerOpen(false);
//   }, []);

//   const determineTracks = React.useCallback(
//     async (trackId?: string, groupId?: string) => {
//       let trackIds = [];
//       if (trackId) {
//         trackIds.push(trackId);
//         const t = await fetchTrack(trackId);
//         if (userId) {
//           const mapped = await mapFavoriteAndPlaysToTracks([t]);

//           setTrack(mapped[0]);
//           setIsFavorite(mapped[0]?.favorite ?? 0);
//         } else {
//           setTrack(t);
//         }
//         setArtistId(t.creatorId);
//       } else if (groupId) {
//         const result = await fetchTrackGroup(groupId);
//         setArtistId(result.creatorId);
//         setTrackgroup(result);
//         trackIds.push(...result.items.map((item) => item.track.id));
//       } else {
//         throw new Error(
//           "TrackPopup needs to include either trackId or groupId"
//         );
//       }

//       setSelectedTrackIds(trackIds);
//     },
//     [userId]
//   );

//   const onClickFavorite = React.useCallback(
//     async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
//       e.stopPropagation();
//       try {
//         setIsLoadingFavorite(true);
//         await Promise.all(
//           selectedTrackIds.map((id) => addTrackToUserFavorites(id))
//         );
//         setIsFavorite((val) => !val);
//       } catch (e: any) {
//         snackbar(e.message, { type: "warning" });
//       } finally {
//         setIsLoadingFavorite(false);
//       }
//     },
//     [selectedTrackIds, snackbar]
//   );

//   React.useEffect(() => {
//     if (isMenuOpen) {
//       determineTracks(trackId, groupId);
//     }
//   }, [trackId, groupId, determineTracks, isMenuOpen]);

//   return (
//     <>
//       <div
//         className={css`
//           display: flex;
//           align-items: center;
//         `}
//       >
//         <IconButton
//           onClick={(e) => openMenu(e)}
//           compact={compact}
//           aria-label="open track actions"
//         >
//           <FaEllipsisV />
//         </IconButton>
//       </div>

//       {selectedTrackIds.length > 0 && (
//         <Modal
//           open={isPlaylistPickerOpen}
//           onClose={() => setIsPlaylistPickerOpen(false)}
//           size="small"
//         >
//           <AddToPlaylist
//             selectedTrackIds={selectedTrackIds}
//             onSongAdded={onSongAdded}
//           />
//         </Modal>
//       )}

//       <SharePopUp
//         open={isShareOpen}
//         onClose={() => setIsShareOpen(false)}
//         track={track}
//         trackgroup={trackgroup}
//       />

//       {selectedTrackIds.length > 0 && (
//         <Modal
//           open={isPlaylistPickerOpen}
//           onClose={() => setIsPlaylistPickerOpen(false)}
//           size="small"
//         >
//           <AddToPlaylist
//             selectedTrackIds={selectedTrackIds}
//             onSongAdded={onSongAdded}
//           />
//         </Modal>
//       )}

//       {isMenuOpen && (
//         <Modal
//           open={isMenuOpen}
//           onClose={() => setIsMenuOpen(false)}
//           size="small"
//         >
//           {trackId && !track && <CenteredSpinner />}
//           {track && <TrackPopupDetails track={track} />}
//           <ul
//             className={css`
//               list-style: none;
//               @media (prefers-color-scheme: dark) {
//                 filter: invert(1);
//               }
//             `}
//           >
//             {userId && track && (
//               <li>
//                 <ListButton onClick={onClickFavorite}>
//                   <SpinningStar
//                     spinning={isLoadingFavorite}
//                     full={isFavorite}
//                   />
//                   {isFavorite ? "Remove from favorites" : "Add to favorites"}
//                 </ListButton>
//               </li>
//             )}
//             <li>
//               <ListButton onClick={openShare}>
//                 <FaCode /> Share &amp; embed
//               </ListButton>
//             </li>
//             {userId && (
//               <li>
//                 <ListButton onClick={openAddToPlaylist}>
//                   <FaPlus /> Add to playlist
//                 </ListButton>
//               </li>
//             )}
//             {userId && trackId && groupId && (
//               <li>
//                 <ListButton onClick={removeFromPlaylist}>
//                   <FaMinus /> Remove from playlist
//                 </ListButton>
//               </li>
//             )}
//             {artistId && (
//               <li>
//                 <NavLinkAsButton
//                   to={`/library/artist/${artistId}`}
//                   onClick={() => {
//                     setIsMenuOpen(false);
//                   }}
//                 >
//                   <FaFont />
//                   Artist page
//                 </NavLinkAsButton>
//               </li>
//             )}
//           </ul>
//         </Modal>
//       )}
//     </>
//   );
// };

// export default TrackPopup;

export {};
