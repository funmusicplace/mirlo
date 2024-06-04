import React from "react";
import Button from "../Button";
import Modal from "../Modal";
import { FaFilm } from "react-icons/fa";
import { InputEl } from "../Input";
import { useCommands } from "@remirror/react";
import { css } from "@emotion/css";

const InsertVideoButton = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [videoUrl, setVideoUrl] = React.useState("");
  const { addIframe, addYouTubeVideo } = useCommands();
  const onAdd = () => {
    if (videoUrl.includes("youtube")) {
      addYouTubeVideo({ video: videoUrl });
    } else {
      addIframe({ src: videoUrl, height: 250, width: 700 });
    }
    setVideoUrl("");
    setIsOpen(false);
  };

  return (
    <>
      <Button
        startIcon={<FaFilm />}
        type="button"
        onClick={() => setIsOpen(true)}
      />
      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        size="small"
        title="Add a video"
      >
        What's the video URL?
        <InputEl
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
        />
        <Button
          type="button"
          onClick={onAdd}
          className={css`
            margin-top: 1rem;
          `}
        >
          Add video
        </Button>
      </Modal>
    </>
  );
};

export default InsertVideoButton;
