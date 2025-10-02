import React from "react";

import { css } from "@emotion/css";
import styled from "@emotion/styled";

import { FaClipboard, FaEye, FaFileCsv } from "react-icons/fa";

import { ArtistButton } from "components/Artist/ArtistButtons";
import Modal from "components/common/Modal";
import { AlbumCode, Reduced } from "./ShowAlbumCodes";
import { useTranslation } from "react-i18next";
import Table from "components/common/Table";
import { useSnackbar } from "state/SnackbarContext";

const OverflowTD = styled.td`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 50px;
`;

const AlbumCodesRow: React.FC<{
  r: Reduced;
  downloadCodes: (group: string, trackGroupId: number) => Promise<void>;
  albumCodes: AlbumCode[];
  isDownloading: boolean;
}> = ({ r, downloadCodes, albumCodes, isDownloading }) => {
  const snackbar = useSnackbar();
  const { t } = useTranslation("translation", {
    keyPrefix: "manageArtistTools",
  });
  const [showModal, setShowModal] = React.useState(false);
  return (
    <tr key={r.group + r.trackGroupId}>
      <td>{r.trackGroup.title}</td>
      <td>{r.group}</td>
      <td className="alignRight">{r.quantity}</td>
      <td className="alignRight">{r.quantityRedeemed}</td>
      <td
        className={`alignRight ${css`
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
        `}`}
      >
        <ArtistButton
          size="compact"
          startIcon={<FaFileCsv />}
          onClick={() => downloadCodes(r.group, r.trackGroupId)}
          variant="dashed"
          isLoading={isDownloading}
        />
        <ArtistButton
          size="compact"
          startIcon={<FaEye />}
          onClick={() => setShowModal(true)}
          variant="dashed"
        />
        <Modal
          title={t("viewCodes")}
          onClose={() => setShowModal(false)}
          open={showModal}
        >
          <div>
            <h4>{t("codesForGroup", { group: r.group })}</h4>
            <Table>
              <thead>
                <tr>
                  <th>{t("code")}</th>
                  <th />
                  <th>{t("url")}</th>
                  <th />
                  <th>{t("trackGroup")}</th>
                  <th>{t("redeemed")}</th>
                </tr>
              </thead>
              <tbody>
                {albumCodes
                  .filter((code) => code.group === r.group)
                  .map((code) => (
                    <tr key={code.id}>
                      <OverflowTD>{code.id}</OverflowTD>
                      <td>
                        <ArtistButton
                          startIcon={<FaClipboard />}
                          variant="link"
                          onClick={() => {
                            // Copy the text inside the text field
                            navigator.clipboard.writeText(code.id);
                            snackbar(t("codeCopied", { code: code.id }), {
                              type: "success",
                            });
                          }}
                        />
                      </td>
                      <OverflowTD>{code.url}</OverflowTD>
                      <td>
                        <ArtistButton
                          startIcon={<FaEye />}
                          variant="link"
                          onClick={() => {
                            // Copy the text inside the text field
                            navigator.clipboard.writeText(code.url);
                            snackbar(t("urlCopied"), {
                              type: "success",
                            });
                          }}
                        />
                      </td>
                      <td>{code.trackGroup.title}</td>
                      <td>{code.redeemedByUserId ? t("yes") : t("no")}</td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </div>
        </Modal>
      </td>
    </tr>
  );
};

export default AlbumCodesRow;
