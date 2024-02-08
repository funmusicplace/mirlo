import React from "react";
import Button from "../Button";
import Modal from "../Modal";
import { FaMusic } from "react-icons/fa";
import { useCommands } from "@remirror/react";
import AutoComplete from "../AutoComplete";
import api from "services/api";
import { widgetUrl } from "utils/tracks";
import { css } from "@emotion/css";

const InsertMirloWidgetButton = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { addIframe } = useCommands();
  const onAdd = (trackId: string | number, variant: "track" | "trackGroup") => {
    addIframe({
      src: widgetUrl(+trackId, variant),
      height: variant === "track" ? 154 : 361,
      width: 700,
    });
    setIsOpen(false);
  };

  const getTrackOptions = React.useCallback(async (searchString: string) => {
    const results = await api.getMany<Track>(`tracks`, {
      title: searchString,
      take: "10",
    });
    return results.results.map((r) => ({
      name: `${r.trackGroup.artist?.name} - ${r.title}`,
      id: r.id,
    }));
  }, []);

  const getTrackGroupOptions = React.useCallback(
    async (searchString: string) => {
      const results = await api.getMany<TrackGroup>(`trackGroups`, {
        title: searchString,
        take: "10",
      });
      return results.results.map((r) => ({
        name: `${r.artist?.name} - ${r.title}`,
        id: r.id,
      }));
    },
    []
  );

  return (
    <>
      <Button
        startIcon={<FaMusic />}
        type="button"
        onClick={() => setIsOpen(true)}
      />
      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        size="small"
        title="Add a video"
        contentClassName={css`
          min-height: 160px;
          overflow: inherit;

          input + div + div {
            z-index: 1000;
          }

          input {
            position: relative;
            z-index: 999;
          }
        `}
      >
        Insert a track:
        <AutoComplete
          getOptions={getTrackOptions}
          onSelect={(val) => {
            onAdd(val, "track");
          }}
        />
        <br />
        Insert a trackgroup:
        <AutoComplete
          getOptions={getTrackGroupOptions}
          onSelect={(val) => {
            onAdd(val, "trackGroup");
          }}
        />
      </Modal>
    </>
  );
};

export default InsertMirloWidgetButton;
