import React from "react";
import Button from "../Button";
import Modal from "../Modal";
import { FaMusic } from "react-icons/fa";
import { useCommands } from "@remirror/react";
import AutoComplete from "../AutoComplete";
import api from "services/api";
import { widgetUrl } from "utils/tracks";
import { css } from "@emotion/css";
import { bp } from "../../../constants";

const InsertMirloWidgetButton = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { addIframe } = useCommands();

  const onAdd = (trackId: string | number, variant: "track" | "trackGroup") => {
    addIframe({
      src: widgetUrl(+trackId, variant),
      height: variant === "track" ? 137 : 371,
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
        title="Add some music"
        contentClassName={css`
          min-height: 160px;
          overflow: inherit;

          input + div + div {
            z-index: 1000;
            position: fixed;
            width: calc(92% - 1rem);
          }
          button {
            padding: 0 0.75rem !important;
          }

          input {
            position: relative;
            z-index: 999;
          }

          @media screen and (max-width: ${bp.small}px) {
            input + div + div {
              width: 90%;
              margin-right: 1rem;
              margin-left: 1rem;
            }
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
