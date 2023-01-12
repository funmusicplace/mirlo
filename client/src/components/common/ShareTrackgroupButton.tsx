import React from "react";
import { FaShare } from "react-icons/fa";
import Button from "./Button";
import SharePopUp, { ShareableTrackgroup } from "./SharePopUp";

export const ShareTrackgroupButton: React.FC<{
  trackgroup: ShareableTrackgroup;
}> = ({ trackgroup }) => {
  const [isShareOpen, setIsShareOpen] = React.useState(false);

  const openMenu = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      setIsShareOpen(true);
    },
    []
  );

  return (
    <>
      <Button onClick={(e) => openMenu(e)} compact startIcon={<FaShare />}>
        Share
      </Button>
      <SharePopUp
        trackgroup={trackgroup}
        open={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </>
  );
};

export default ShareTrackgroupButton;
