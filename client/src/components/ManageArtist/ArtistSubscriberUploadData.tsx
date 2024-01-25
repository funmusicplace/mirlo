import Button from "components/common/Button";
import React from "react";
import api from "services/api";
import { useGlobalStateContext } from "state/GlobalState";
import { useCSVReader } from "react-papaparse";

import { useTranslation } from "react-i18next";
import { useArtistContext } from "state/ArtistContext";
import { useParams } from "react-router-dom";
import { FaUpload } from "react-icons/fa";
import Modal from "components/common/Modal";
import styled from "@emotion/styled";
import Table from "components/common/Table";
import { css } from "@emotion/css";
import { useSnackbar } from "state/SnackbarContext";

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
  width: 80%;
`;

const RemoveButton = styled(Button)`
  border-radius: 0;
  padding: 0 20px;
`;

const ArtistSubscriberUploadData: React.FC<{}> = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const {
    state: { user },
  } = useGlobalStateContext();
  const { t } = useTranslation("translation", {
    keyPrefix: "manageSubscriptions",
  });
  const [uploadedUsers, setUploadedUsers] = React.useState<
    { email: string; name: string }[]
  >([]);

  const snackbar = useSnackbar();
  const { CSVReader } = useCSVReader();

  const [isLoadingSubscriberData, setIsLoadingSubscriberData] =
    React.useState(false);
  const {
    state: { artist },
  } = useArtistContext();
  const { artistId } = useParams();

  const userId = user?.id;

  const processData = async (results: { data: string[][] }) => {
    const data = results.data;

    const headers = data.splice(0, 1)[0];

    const newData = data.map((line) => {
      const obj = headers.reduce((aggr, header, idx) => {
        if (
          header.toLowerCase() === "email" ||
          header.toLowerCase() === "e-mail"
        ) {
          aggr["email"] = line[idx];
        }
        // aggr[header] = line[idx];

        return aggr;
      }, {} as { email: string; name: string });
      return obj;
    });

    setUploadedUsers(newData);
  };

  const uploadSubscriberData = React.useCallback(
    async (data: any) => {
      setIsLoadingSubscriberData(true);

      try {
        if (userId && artistId) {
          await api.post(`users/${userId}/artists/${artistId}/subscribers`, {
            subscribers: uploadedUsers,
          });
        }
        snackbar("Uploaded your followers!", { type: "success" });
      } catch (e) {
        snackbar("Something went wrong uploading followers", {
          type: "warning",
        });
      } finally {
        setIsLoadingSubscriberData(false);
      }
    },
    [artistId, snackbar, uploadedUsers, userId]
  );

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
                  <th>E-mail</th>
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
            <p>
              By uploading this list of e-mails, you solemnly swear that you
              have permission from the email owners to upload the emails
            </p>
            <Button variant="big" onClick={uploadSubscriberData}>
              Alright, looks good, let's upload them!
            </Button>
          </div>
        )}
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
                  Browse file
                </CSVUploadButton>
                <AcceptedFiles>
                  {acceptedFile && acceptedFile.name}
                </AcceptedFiles>
                <RemoveButton {...getRemoveFileProps()}>Remove</RemoveButton>
              </CSVReaderWrapper>
              <ProgressBar style={{ background: "red" }} />
            </>
          )}
        </CSVReader>
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
