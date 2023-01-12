import styled from "@emotion/styled";
import { useSnackbar } from "state/SnackbarContext";
import React from "react";
import Modal from "./Modal";

const ShareButton = styled.button`
  border: none;
  border-radius: 6px;
  width: 4rem;
  margin-bottom: 0.75rem;
  height: 2rem;
  color: black;
  background-color: #efefef;
  cursor: pointer;

  &:hover {
    background: #c8c8c8;
  }
`;

const Code = styled.code`
  font-size: 0.8rem;
  background-color: ${(props) => props.theme.colors.text};
  display: block;
  color: ${(props) => props.theme.colors.background};
  padding: 1rem;
  position: relative;
  cursor: pointer;

  &:hover:after {
    background: #ccc;
  }
`;

const embedRoot = "https://stream.resonate.coop/embed/";

const embed = (url: string) => `<iframe
  src="${url}"
  frameborder="0"
  width="400px"
  height="600"
  style="margin:0;border:none;width:400px;height:600px;border: 1px solid #000;"
  ></iframe>`;

export interface ShareableTrackgroup {
  creatorId: string;
  slug: string;
}

export const SharePopUp: React.FC<{
  open: boolean;
  onClose: () => void;
  track?: Track;
  trackgroup?: ShareableTrackgroup;
}> = ({ open, track, trackgroup, onClose }) => {
  const displayMessage = useSnackbar();
  const url = trackgroup
    ? `${embedRoot}artist/${trackgroup.creatorId}/release/${trackgroup.slug}`
    : `${embedRoot}track/${track?.id}`;
  const copyToClipboard = () => {
    navigator.clipboard.writeText(embed(url));
    displayMessage("Copied");
  };

  return (
    <Modal open={open} onClose={onClose} size="small">
      <div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h4>Embed code</h4>
          <ShareButton onClick={copyToClipboard}>Copy</ShareButton>
        </div>
        <Code>
          <div style={{ overflowX: "scroll" }}>{embed(url)}</div>
        </Code>
      </div>
    </Modal>
  );
};

export default SharePopUp;
