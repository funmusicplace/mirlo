import React from "react";
import TrackgroupGrid from "components/common/TrackgroupGrid";
import api from "services/api";
import { css } from "@emotion/css";
import { useTranslation } from "react-i18next";
import { bp } from "../constants";
import WidthContainer from "./common/WidthContainer";
import { SectionHeader } from "./Home/Home";

import usePagination from "utils/usePagination";
import ArtistSquare from "./Artist/ArtistSquare";

const pageSize = 20;

const Artists = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artists" });
  const [artists, setArtists] = React.useState<Artist[]>([]);
  const { page, PaginationComponent } = usePagination({ pageSize });

  React.useEffect(() => {
    const callback = async () => {
      const results = await api.getMany<Artist>(
        `artists?skip=${pageSize * page}&take=${pageSize}`
      );
      setArtists(results.results);
    };

    callback();
  }, [page]);

  return (
    <div
      className={css`
        a {
          color: var(--mi-normal-foreground-color);
        }
        @media screen and (max-width: ${bp.medium}px) {
          margin-bottom: 0rem;
        }
      `}
    >
      <SectionHeader>
        <WidthContainer variant="big" justify="center">
          <h5>{t("artists")}</h5>
        </WidthContainer>
      </SectionHeader>
      <div
        className={css`
          padding-top: 0.25rem;
        `}
      >
        <WidthContainer variant="big" justify="center">
          <div
            className={css`
              display: flex;
              width: 100%;
              flex-direction: row;
              flex-wrap: wrap;
              padding: var(--mi-side-paddings-xsmall);
            `}
          >
            <TrackgroupGrid gridNumber="4">
              {artists?.map((artist) => (
                <ArtistSquare key={artist.id} artist={artist} />
              ))}
            </TrackgroupGrid>
          </div>

          <PaginationComponent amount={artists.length} />
        </WidthContainer>
      </div>
    </div>
  );
};

export default Artists;
