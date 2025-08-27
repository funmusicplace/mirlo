import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { Money } from "components/common/Money";
import {
  queryArtistSupporters,
  queryTrackGroup,
  queryUserSales,
} from "queries";
import { useParams } from "react-router-dom";
import useArtistQuery from "utils/useArtistQuery";

function Thermometer({
  current,
  goal,
  artist,
  trackGroup,
}: {
  current: number;
  goal: number;
  artist: Artist;
  trackGroup: TrackGroup;
}) {
  const {
    data: { results, total, totalAmount, totalSupporters } = {
      results: [],
      total: 0,
      totalAmount: 0,
      totalSupporters: 0,
    },
    isLoading,
  } = useQuery(
    queryArtistSupporters({
      artistId: artist.id,
      trackGroupIds: [trackGroup.id],
    })
  );
  console.log({ results, total, totalAmount, totalSupporters });

  const percent = Math.min(totalAmount / goal, 100);
  return (
    <div>
      <div
        className={css`
          position: relative;
          width: 100%;
          height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        `}
      >
        <div
          className={css`
            display: flex;
            flex-direction: row;
            align-items: flex-end;
          `}
        >
          <span
            className={css`
              font-size: 1rem;
            `}
          >
            raised:{" "}
            <Money amount={totalAmount / 100} currency={trackGroup?.currency} />
          </span>
          <span
            className={css`
              margin-top: 0.35rem;
              font-style: italic;
              margin-left: 0.25rem;
            `}
          >
            from {totalSupporters} supporters
          </span>
        </div>
        <div
          className={css`
            margin-left: 0.5rem;
            font-size: 1rem;
            margin-top: 0.35rem;
          `}
        >
          of{" "}
          <span
            className={css`
              font-weight: bold;
            `}
          >
            ${goal.toLocaleString()}
          </span>{" "}
          goal
        </div>
      </div>
      <div
        className={css`
          position: relative;
          width: 100%;
          height: 1.25rem;
          background-color: rgba(156, 163, 175, 0.2);
          border-radius: 0.25rem;
          overflow: hidden;
        `}
      >
        <div
          className={css`
            height: 100%;
            background-color: ${artist?.properties?.colors?.primary};
            transition: all 0.5s;
            position: relative;
            width: ${percent}%;
          `}
          aria-valuenow={totalAmount / 100}
          aria-valuemax={goal}
          aria-valuemin={0}
          role="progressbar"
        ></div>
      </div>
    </div>
  );
}
export default Thermometer;
