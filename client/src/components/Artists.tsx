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
import Button, { ButtonAnchor } from "./common/Button";
import { FaRss } from "react-icons/fa";
import { SelectEl } from "./common/Select";
import { BsGrid, BsList } from "react-icons/bs";
import { Table } from "./common/Table";
import { getArtistUrl } from "utils/artist";
import { Link } from "react-router-dom";

const Artists = () => {
  const { t } = useTranslation("translation", { keyPrefix: "artists" });
  const [artists, setArtists] = React.useState<Artist[]>([]);
  const [artistsTotal, setArtistsTotal] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(20);
  const { page, PaginationComponent } = usePagination({ pageSize });
  const [orderBy, setOrderBy] = React.useState("createdAt");

  const [viewAsTiles, setViewAsTiles] = React.useState(true);

  const setTiles = (value: boolean) => {
    setViewAsTiles(value);
    setPageSize(value ? 40 : 20);
  };

  React.useEffect(() => {
    const callback = async () => {
      const params = new URLSearchParams();

      params.append("orderBy", orderBy);
      params.append("skip", `${pageSize * page}`);
      params.append("take", `${pageSize}`);
      const results = await api.getMany<Artist>(`artists?${params.toString()}`);
      setArtists(results.results);
      setArtistsTotal(results.total);
    };

    callback();
  }, [page, orderBy]);

  return (
    <div
      className={css`
        a {
          color: var(--mi-normal-foreground-color);
        }
        @media screen and (max-width: ${bp.medium}px) {
          margin-bottom: 0rem;
        }
        margin-top: 2rem;
      `}
    >
      <SectionHeader>
        <WidthContainer
          variant="big"
          justify="space-between"
          className={css`
            flex-direction: row;
            display: flex;
            align-items: center;
          `}
        >
          <h2 className="h5 section-header__heading">{t("artists")}</h2>
          <div
            className={css`
              display: flex;
              flex-direction: row;
              align-items: center;
              gap: 1rem;
            `}
          >
            <Button
              startIcon={<BsGrid />}
              onClick={() => setTiles(true)}
            ></Button>
            <Button
              startIcon={<BsList />}
              onClick={() => setTiles(false)}
            ></Button>
            <div
              className={css`
                display: flex;
                flex-direction: row;
                align-items: center;
                gap: 1rem;
              `}
            >
              <label htmlFor="orderBy">{t("sortBy")}</label>
              <SelectEl
                value={orderBy}
                id="orderBy"
                onChange={(e) => setOrderBy(e.target.value)}
              >
                <option value="createdAt">{t("sortByLatest")}</option>
                <option value="name">{t("sortByName")}</option>
              </SelectEl>
            </div>
            <ButtonAnchor
              target="_blank"
              href={`${import.meta.env.VITE_API_DOMAIN}/v1/artists?format=rss`}
              rel="noreferrer"
              onlyIcon
              className={css`
                margin-top: 0.25rem;
              `}
              startIcon={<FaRss />}
            />
          </div>
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
            {viewAsTiles && (
              <TrackgroupGrid gridNumber="4">
                {artists?.map((artist) => (
                  <ArtistSquare key={artist.id} artist={artist} />
                ))}
              </TrackgroupGrid>
            )}
            {!viewAsTiles && (
              <ol
                className={css`
                  display: flex;
                  flex-direction: column;
                  gap: 0.5rem;
                  padding: 0;
                  margin: 0;
                  width: 100%;
                  list-style: none;
                `}
              >
                {artists?.map((artist) => (
                  <li key={artist.id} className={css``}>
                    <Link
                      to={getArtistUrl(artist)}
                      className={css`
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                        margin-bottom: 0.5rem;
                        padding: 1rem;
                        border: 1px solid var(--mi-border-color);
                        border-radius: 0.25rem;
                        background-color: var(--mi-background-color);
                        transition: background-color 0.2s ease;

                        &:nth-child(odd) {
                          background-color: var(--mi-darken-background-color);
                        }
                        &:hover {
                          background-color: var(--mi-darken-x-background-color);
                        }
                      `}
                    >
                      <img
                        src={
                          artist.avatar?.sizes?.[60] ??
                          artist.trackGroups?.[0]?.cover?.sizes?.[60]
                        }
                        height={40}
                        width={40}
                      />
                      <span>{artist.name}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <PaginationComponent amount={artists.length} total={artistsTotal} />
        </WidthContainer>
      </div>
    </div>
  );
};

export default Artists;
