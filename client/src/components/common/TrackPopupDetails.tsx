// import { css } from "@emotion/css";
// import React from "react";
// import { isTrackWithUserCounts } from "typeguards";
// import { useGlobalStateContext } from "../../contexts/globalState";
// import { buyTrack } from "../../services/api/User";
// import {
//   calculateRemainingCost,
//   formatCredit,
//   calculateCost,
//   buildStreamURL,
//   downloadFile,
// } from "../../utils/tracks";
// import Button from "./Button";
// import LoadingSpinner from "./LoadingSpinner";

// export const TrackPopupDetails: React.FC<{
//   track: Track;
// }> = ({ track }) => {
//   return (
//     <div
//       className={css`
//         margin-bottom: 1rem;
//         display: flex;
//         flex-direction: column;
//       `}
//     >
//       <div
//         className={css`
//           margin-bottom: 1rem;
//           display: flex;
//           align-items: center;
//         `}
//       >
//         <img
//           src={track.images.small?.url ?? track.cover}
//           alt={track.title}
//           width={100}
//           height={100}
//           className={css`
//             margin-right: 1rem;
//           `}
//         />
//         <div>
//           <p
//             className={css`
//               font-size: 1.1rem;
//             `}
//           >
//             {track.title}
//           </p>
//           <p
//             className={css`
//               color: #444;
//               font-size: 1rem;
//             `}
//           >
//             {track.creator?.displayName}
//           </p>
//         </div>
//       </div>
//       {isTrackWithUserCounts(track) && <TrackOwnerhsip track={track} />}
//     </div>
//   );
// };

// const TrackOwnerhsip: React.FC<{ track: TrackWithUserCounts }> = ({
//   track,
// }) => {
//   const {
//     state: { user },
//   } = useGlobalStateContext();
//   const userId = user?.id;
//   const remainingCost = calculateRemainingCost(track.plays);
//   const [isDownloading, setIsDownloading] = React.useState(false);
//   const [purchaseSuccess, setPurchaseSuccess] = React.useState(false);

//   const enoughCredit =
//     0 < +(user?.credit.total ?? "0") - +formatCredit(remainingCost);

//   const download = React.useCallback(async () => {
//     setIsDownloading(true);
//     await downloadFile(
//       buildStreamURL(track.id, !!userId),
//       `${track.creator?.displayName} - ${track.title}`
//     );
//     setIsDownloading(false);
//   }, [track.id, track.creator?.displayName, track.title, userId]);

//   const onBuyClick = React.useCallback(async () => {
//     if (userId) {
//       await buyTrack(track.id);
//       setPurchaseSuccess(true);
//     }
//   }, [userId, track.id]);

//   return (
//     <>
//       {purchaseSuccess && (
//         <>
//           <h4>Congrats!</h4>
//         </>
//       )}
//       <div
//         className={css`
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//         `}
//       >
//         {!purchaseSuccess && track.plays !== 9 && (
//           <>
//             <p>
//               You're <strong>{9 - track.plays}</strong> plays away from owning
//               this song
//             </p>
//             {enoughCredit && (
//               <Button compact onClick={onBuyClick}>
//                 Buy now
//               </Button>
//             )}
//             {!enoughCredit && (
//               <a href="https://stream.resonate.coop/discover">Add credits</a>
//             )}
//           </>
//         )}
//         {(purchaseSuccess || track.plays === 9) && (
//           <>
//             <p>You own this song!</p>
//             <Button
//               onClick={download}
//               compact
//               startIcon={isDownloading ? <LoadingSpinner /> : undefined}
//             >
//               Download
//             </Button>
//           </>
//         )}
//       </div>
//       <div
//         className={css`
//           margin-top: 0.75rem;
//           display: flex;
//           justify-content: space-between;

//           dl {
//           }
//           dt {
//           }
//           dd {
//             font-weight: bold;
//           }
//         `}
//       >
//         <dl>
//           <dt>Total remaining cost</dt>
//           <dd>
//             {formatCredit(remainingCost)}{" "}
//             <small>
//               (€
//               {((remainingCost / 1022) * 1.25).toFixed(2)})
//             </small>
//           </dd>
//         </dl>
//         <dl>
//           <dt>Current stream</dt>
//           <dd>{formatCredit(calculateCost(track.plays))}</dd>
//         </dl>
//         <dl>
//           <dt>Next stream</dt>
//           <dd>{formatCredit(calculateCost(track.plays + 1))}</dd>
//         </dl>
//       </div>
//     </>
//   );
// };

// export default TrackPopupDetails;

export {};
