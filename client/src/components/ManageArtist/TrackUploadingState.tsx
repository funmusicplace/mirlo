import { css } from "@emotion/css";
import LoadingSpinner from "components/common/LoadingSpinner";
import React from "react";
import { FaCheck } from "react-icons/fa";

const TrackUploadingState: React.FC<{ uploadingState?: string }> = ({
  uploadingState,
}) => {
  return (
    <>
      {uploadingState === "completed" && (
        <div
          className={css`
            color: green;
          `}
        >
          <FaCheck />
        </div>
      )}
      {(uploadingState === "waiting" || uploadingState === "active") && (
        <LoadingSpinner />
      )}
    </>
  );
};

export default TrackUploadingState;
