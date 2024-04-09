import Button from "components/common/Button";
import React from "react";
import api from "services/api";
import { useCSVReader } from "react-papaparse";

import { useTranslation } from "react-i18next";
import { useArtistContext } from "state/ArtistContext";
import { FaUpload } from "react-icons/fa";
import Modal from "components/common/Modal";
import styled from "@emotion/styled";
import Table from "components/common/Table";
import { css } from "@emotion/css";
import { useSnackbar } from "state/SnackbarContext";
import { uniqBy } from "lodash";
import TextArea from "components/common/TextArea";

const CSVReaderWrapper = styled.div`
  display: flex;
  flexdirection: row;
  margin-bottom: 10;
`;

const CSVUploadButton = styled(Button)`
  width: 20%;
`;

const AcceptedFiles = styled.div`
  border: 1px solid #ccc;
  height: 45;
  line-height: 2.5;
  padding-left: 10;
  width: 50%;
  max-width: 50%;
  overflow: hidden;
`;

const RemoveButton = styled(Button)`
  border-radius: 0;
  padding: 0 20px;
`;

const ArtistSubscriberUploadData: React.FC<{
  onDone: () => void;
  setIsMenuOpen?: (bool: boolean) => void;
}> = ({ onDone, setIsMenuOpen }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const { t } = useTranslation("translation", {
    keyPrefix: "manageSubscriptions",
  });
  const [uploadedUsers, setUploadedUsers] = React.useState<
    { email: string; name?: string }[]
  >([]);

  const snackbar = useSnackbar();
  const { CSVReader } = useCSVReader();

  const [isLoadingSubscriberData, setIsLoadingSubscriberData] =
    React.useState(false);
  const {
    state: { artist },
  } = useArtistContext();
  const artistId = artist?.id;
  const artistUserId = artist?.userId;
  const [emailText, setEmailText] = React.useState<string>();

  const processData = async (results: { data: string[][] }) => {
    const data = results.data;
    const headers = data.splice(0, 1)[0];

    const firstLineHasEmail = headers.findIndex((text) => text.includes("@"));
    const newData = data.map((line) => {
      if (firstLineHasEmail !== -1) {
        return { email: line[firstLineHasEmail] };
      } else {
        const obj = headers.reduce(
          (aggr, header, idx) => {
            if (
              (header.toLowerCase() === "email" ||
                header.toLowerCase() === "e-mail" ||
                header.toLowerCase() === "subscriber") &&
              line[idx].includes("@")
            ) {
              aggr["email"] = line[idx];
            }

            return aggr;
          },
          {} as { email: string; name: string }
        );
        console.log("obj", obj);
        return obj;
      }
    });

    setUploadedUsers(
      uniqBy(
        newData.filter((data) => !!data.email),
        "email"
      )
    );
  };

  const uploadSubscriberData = React.useCallback(
    async (users: { email: string; name?: string }[]) => {
      setIsLoadingSubscriberData(true);

      try {
        if (artistUserId && artistId) {
          await api.post(
            `users/${artistUserId}/artists/${artistId}/subscribers`,
            {
              subscribers: users,
            }
          );
        }
        snackbar("Uploaded your followers!", { type: "success" });
        setIsOpen(false);
        onDone();
        setIsMenuOpen?.(false);
      } catch (e) {
        snackbar("Something went wrong uploading followers", {
          type: "warning",
        });
      } finally {
        setIsLoadingSubscriberData(false);
      }
    },
    [artistUserId, artistId, snackbar, onDone, setIsMenuOpen]
  );

  const processTextArea = React.useCallback(() => {
    const emailsAsList =
      emailText
        ?.split(/,|\r?\n/)
        .map((email) => email.replaceAll(" ", ""))
        .filter((email) => !!email) ?? [];
    const users = emailsAsList?.map((email) => ({ email }));
    setUploadedUsers(users);
    uploadSubscriberData(users);
  }, [emailText, uploadSubscriberData]);

  if (!artist) {
    return null;
  }

  return (
    <>
      <Modal
        title="Upload subscribers"
        open={isOpen}
        onClose={() => setIsOpen(false)}
      >
        {uploadedUsers.length > 0 && (
          <div
            className={css`
              p {
                margin-top: 1rem;
              }
              button {
                margin-top: 1rem;
                margin-bottom: 1rem;
              }
            `}
          >
            <Table>
              <thead>
                <tr>
                  <th>{t("email")}</th>
                </tr>
              </thead>
              <tbody>
                {uploadedUsers.map((user) => (
                  <tr key={user.email}>
                    <td>{user.email}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <p>{t("rightToUpload")}</p>
            <Button
              variant="big"
              onClick={() => uploadSubscriberData(uploadedUsers)}
            >
              {t("looksGood")}
            </Button>
          </div>
        )}
        <h3
          className={css`
            width: 100%;
            font-weight: normal;
          `}
        >
          Two ways to add emails:
        </h3>

        <div>
          <p
            className={css`
              margin-top: 1rem;
              margin-bottom: 0.5rem;
            `}
          >
            {t("fileUploadDescription")}
          </p>
          <CSVReader onUploadAccepted={processData}>
            {({
              getRootProps,
              acceptedFile,
              ProgressBar,
              getRemoveFileProps,
            }: any) => (
              <>
                <CSVReaderWrapper>
                  <CSVUploadButton type="button" {...getRootProps()}>
                    {t("uploadACSV")}
                  </CSVUploadButton>
                  <AcceptedFiles>
                    {acceptedFile && acceptedFile.name}
                  </AcceptedFiles>
                  <RemoveButton {...getRemoveFileProps()}>
                    {t("remove")}
                  </RemoveButton>
                </CSVReaderWrapper>
                <ProgressBar style={{ background: "red" }} />
              </>
            )}
          </CSVReader>
        </div>
        <hr
          className={css`
            margin-bottom: 1rem;
            margin-top: 1rem;
          `}
        />
        <div>
          <p>If you have a list of e-mails, paste them here:</p>
          <TextArea
            placeholder="email1@example.com, email2@example.com"
            onChange={(e) => setEmailText(e.target.value)}
            value={emailText}
          />
          <Button onClick={() => processTextArea()}>Next</Button>
        </div>
      </Modal>
      <li>
        <Button
          onClick={() => setIsOpen(true)}
          compact
          startIcon={<FaUpload />}
          isLoading={isLoadingSubscriberData}
        >
          {t("uploadSubscriberData")}
        </Button>
      </li>
    </>
  );
};

export default ArtistSubscriberUploadData;
