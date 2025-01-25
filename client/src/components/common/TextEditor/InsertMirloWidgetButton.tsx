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
import AutoCompleteTrackGroup from "../AutoCompleteTrackGroup";
import { useTranslation } from "react-i18next";

const InsertMirloWidgetButton = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { addIframe } = useCommands();
  const { t } = useTranslation("translation", { keyPrefix: "textEditor" });

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
        {t("insertATrack")}
        <AutoComplete
          getOptions={getTrackOptions}
          onSelect={(val) => {
            onAdd(val, "track");
          }}
        />
        <br />
        {t("insertATrackGroup")}
        <AutoCompleteTrackGroup onSelect={(val) => onAdd(val, "trackGroup")} />
      </Modal>
    </>
  );
};

export default InsertMirloWidgetButton;
