import { css } from "@emotion/css";
import MarkdownContent from "components/common/MarkdownContent";
import { useTranslation } from "react-i18next";
import React from "react";
import { useSnackbar } from "state/SnackbarContext";
import { useFieldArray, useForm } from "react-hook-form";
import { FaPen, FaPlus, FaSave, FaTimes } from "react-icons/fa";
import TextArea from "components/common/TextArea";
import {
  ArtistButton,
  ArtistButtonAnchor,
  ArtistButtonLink,
} from "./ArtistButtons";
import Modal from "components/common/Modal";
import { InputEl } from "components/common/Input";
import FormComponent from "components/common/FormComponent";
import Artist from "./Artist";
import {
  calculateDateWithTimezoneOffset,
  formatDate,
} from "components/TrackGroup/ReleaseDate";

interface FormData {
  tourDates: { location: string; date: string; ticketsUrl: string }[];
}

interface ArtistHeaderDescriptionProps {
  isManage: boolean;
  artist: Pick<Artist, "tourDates" | "properties">;
  onSubmit: (data: Pick<Artist, "tourDates">) => Promise<void>;
}

const ArtistTourDates: React.FC<ArtistHeaderDescriptionProps> = ({
  isManage,
  artist,
  onSubmit,
}) => {
  const snackbar = useSnackbar();

  const { t, i18n } = useTranslation("translation", { keyPrefix: "artist" });
  const [isEditing, setIsEditing] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  const { register, control, handleSubmit, reset } = useForm<FormData>({
    defaultValues: {
      tourDates:
        artist?.tourDates?.map((td) => {
          return {
            location: td.location,
            date: td.date.split("T")[0],
            ticketsUrl: td.ticketsUrl,
          };
        }) ?? [],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "tourDates",
  });
  let tourDates = artist?.tourDates;

  const handleSave = React.useCallback(
    async (data: FormData) => {
      await onSubmit(data);
      snackbar(t("updatedBio"), { type: "success" });
      setIsEditing(false);
    },
    [onSubmit, snackbar, t]
  );
  if (!tourDates && !isManage) {
    return null;
  }

  return (
    <>
      <ArtistButton
        onClick={() => setIsOpen(true)}
        size="compact"
        className={css`
          margin-top: -1rem;
          margin-bottom: -1px;
          border-top-left-radius: 0.5rem !important;
          border-top-right-radius: 0.5rem !important;
          margin-right: 0.5rem;
        `}
      >
        {t("dates")}
      </ArtistButton>
      <Modal open={isOpen} size="small" onClose={() => setIsOpen(false)}>
        {!isEditing && (
          <div
            className={css`
              width: 100%;
              display: flex;
              flex-direction: column;
            `}
          >
            {tourDates && (
              <ul
                className={css`
                  list-style: none;
                  padding: 0;

                  li {
                    margin-bottom: 0.5rem;
                    font-size: 0.9rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;

                    > div {
                      display: flex;
                      flex-direction: row;
                      justify-content: space-between;
                      flex-grow: 1;
                      padding-right: 1rem;
                    }
                  }
                `}
              >
                {tourDates.map((td) => (
                  <li>
                    <div>
                      <span>{td.location}</span>
                      {formatDate({
                        date: calculateDateWithTimezoneOffset(
                          td.date
                        ).toISOString(),
                        i18n,
                        options: { dateStyle: "short" },
                      })}
                    </div>
                    <ArtistButtonAnchor
                      href={td.ticketsUrl}
                      size="compact"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("buyTickets")}
                    </ArtistButtonAnchor>
                  </li>
                ))}
              </ul>
            )}

            {isManage && (
              <div
                className={css`
                  max-width: 5%;
                  flex: 5%;
                  margin-right: 0.2rem;
                  margin-left: 0.2rem;
                `}
              >
                <ArtistButton
                  size="compact"
                  className={css`
                    white-space: nowrap;
                  `}
                  variant="dashed"
                  onClick={() => setIsEditing(true)}
                  startIcon={<FaPen />}
                >
                  {t("addTourDates")}
                </ArtistButton>
              </div>
            )}
          </div>
        )}
        {isEditing && (
          <div
            className={css`
              width: 100%;
              margin-bottom: 0.5rem;
            `}
          >
            {fields.map((field, index) => (
              <div
                key={field.id}
                className={css`
                  display: flex;
                  flex-direction: column;
                  margin-bottom: 1rem;
                  padding-bottom: 1rem;
                  border-bottom: 1px solid var(--mi-normal-foreground-color);
                `}
              >
                <div
                  className={css`
                    display: flex;
                    > div {
                      margin-right: 0.5rem;
                      margin-bottom: 0.25rem;
                    }
                  `}
                >
                  <FormComponent>
                    <label>{t("tourLocation")}</label>
                    <InputEl
                      {...register(`tourDates.${index}.location`)}
                      defaultValue={field.location}
                    />
                  </FormComponent>
                  <FormComponent>
                    <label>{t("tourDate")}</label>
                    <InputEl
                      type="date"
                      {...register(`tourDates.${index}.date`)}
                      defaultValue={field.date}
                    />
                  </FormComponent>
                </div>
                <FormComponent>
                  <label>{t("ticketsUrl")}</label>
                  <InputEl
                    {...register(`tourDates.${index}.ticketsUrl`)}
                    defaultValue={field.ticketsUrl}
                  />
                </FormComponent>
                <ArtistButton
                  size="compact"
                  variant="dashed"
                  onClick={() => remove(index)}
                  startIcon={<FaTimes />}
                >
                  {t("remove")}
                </ArtistButton>
              </div>
            ))}

            <div
              className={css`
                display: flex;
                justify-content: flex-end;
              `}
            >
              <ArtistButton
                size="compact"
                variant="transparent"
                className={css`
                  margin-right: 0.5rem;
                `}
                onClick={() =>
                  append({
                    location: "",
                    date: "",
                    ticketsUrl: "",
                  })
                }
                startIcon={<FaPlus />}
              >
                {t("addNewTourDate")}
              </ArtistButton>
              <ArtistButton
                size="compact"
                startIcon={<FaSave />}
                collapsible
                onClick={handleSubmit(handleSave)}
                className={css`
                  margin-right: 0.5rem;
                `}
              >
                {t("saveDates")}
              </ArtistButton>
              <ArtistButton
                size="compact"
                collapsible
                startIcon={<FaTimes />}
                onClick={() => {
                  reset();
                  setIsEditing(false);
                }}
              >
                {t("cancel")}
              </ArtistButton>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default ArtistTourDates;
