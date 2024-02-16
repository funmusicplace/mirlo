import React from "react";
import { useArtistContext } from "state/ArtistContext";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { css } from "@emotion/css";
import Table from "components/common/Table";
import GenerateAlbumDownloadCodes from "./GenerateAlbumDownloadCodes";
import { FaFileCsv } from "react-icons/fa";
import Button from "components/common/Button";
import SpaceBetweenDiv from "components/common/SpaceBetweenDiv";

type AlbumCode = {
  group: string;
  trackGroupId: number;
  trackGroup: TrackGroup;
  redeemedByUserId: number;
};

const ShowAlbumCodes: React.FC<{}> = () => {
  const { t } = useTranslation("translation", {
    keyPrefix: "manageArtistTools",
  });
  const [albumCodes, setAlbumCodes] = React.useState<AlbumCode[]>([]);
  const [isDownloadingCodes, setIsdDownloadingCodes] = React.useState(false);
  const {
    state: { artist },
  } = useArtistContext();
  const userId = artist?.userId;
  const artistId = artist?.id;
  const artistSlug = artist?.urlSlug ?? artist?.id;

  const callback = React.useCallback(async () => {
    const results = await api.getMany<AlbumCode>(
      `users/${userId}/artists/${artistId}/codes`
    );
    setAlbumCodes(results.results);
  }, [artistId, userId]);

  React.useEffect(() => {
    callback();
  }, [callback]);

  const downloadCodes = React.useCallback(async () => {
    setIsdDownloadingCodes(true);
    try {
      if (userId && artistId) {
        await api.getFile(
          `all-codes-for-${artistSlug}`,
          `users/${userId}/artists/${artistId}/codes?format=csv`,
          "text/csv"
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsdDownloadingCodes(false);
    }
  }, [artistSlug, artistId, userId]);

  if (!artist) {
    return null;
  }

  const reduced = albumCodes.reduce((aggr, item) => {
    const existing = aggr.find(
      (a) => a.trackGroupId === item.trackGroupId && a.group === item.group
    );
    if (existing) {
      existing.quantity += 1;
      if (item.redeemedByUserId) {
        existing.quantityRedeemed += 1;
      }
    } else {
      aggr.push({
        trackGroupId: item.trackGroupId,
        trackGroup: item.trackGroup,
        quantity: 1,
        group: item.group,
        quantityRedeemed: item.redeemedByUserId ? 1 : 0,
      });
    }
    return aggr;
  }, [] as { quantityRedeemed: number; trackGroupId: number; trackGroup: TrackGroup; quantity: number; group: string }[]);

  return (
    <div>
      <div
        className={css`
          margin-bottom: 1rem;
        `}
      >
        <h2>{t("downloadCodes")}</h2>
        <p
          className={css`
            margin-bottom: 0.5rem;
          `}
        >
          {t("downloadCodesExplain")}
        </p>
        <GenerateAlbumDownloadCodes onDone={callback} />
      </div>
      <SpaceBetweenDiv>
        <h3>{t("existingAlbumCodes")}</h3>
        <Button
          startIcon={<FaFileCsv />}
          isLoading={isDownloadingCodes}
          onClick={() => downloadCodes()}
        >
          Download all codes
        </Button>
      </SpaceBetweenDiv>
      <Table>
        <thead>
          <tr>
            <th>{t("album")}</th>
            <th>{t("codeGroup")}</th>
            <th className="alignRight">{t("quantity")}</th>
            <th className="alignRight">{t("quantityRedeemed")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {reduced.map((r) => (
            <tr key={r.group + r.trackGroupId}>
              <td>{r.trackGroup.title}</td>
              <td>{r.group}</td>
              <td className="alignRight">{r.quantity}</td>
              <td className="alignRight">{r.quantityRedeemed}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default ShowAlbumCodes;
