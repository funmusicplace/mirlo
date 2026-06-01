import { css } from "@emotion/css";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import Modal from "components/common/Modal";
import {
  calculateDateWithTimezoneOffset,
  formatDate,
} from "components/TrackGroup/ReleaseDate";
import React from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaPen, FaPlus, FaSave, FaTimes } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";

import Artist from "./Artist";
import { ArtistButton, ArtistButtonAnchor } from "./ArtistButtons";
import { tabButtonClass } from "./ArtistHeaderActionsStrip";

interface FormData {
  tourDates: { location: string; date: string; ticketsUrl: string }[];
}

interface ArtistHeaderDescriptionProps {
  isManage: boolean;
  artist: Pick<Artist, "tourDates" | "properties">;
  onSubmit: (data: Pick<Artist, "tourDates">) => Promise<void>;
  size?: "tiny" | "compact";
}

const ArtistTourDates: React.FC<ArtistHeaderDescriptionProps> = ({
  isManage,
  artist,
  onSubmit,
  size = "tiny",
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

  if ((!tourDates || tourDates.length === 0) && !isManage) {
    return null;
  }

  return (
    <>
      <ArtistButton
        onClick={() => setIsOpen(true)}
        size={size}
        variant="transparent"
        color="foreground"
        uppercase
        bold={false}
        className={tabButtonClass}
      >
        {t("dates")}
      </ArtistButton>
      <Modal
        open={isOpen}
        size="small"
        onClose={() => setIsOpen(false)}
        title={t("tourDatesModalTitle") ?? ""}
      >
        {!isEditing && (
          <div className="w-full flex flex-col">
            {tourDates && tourDates.length > 0 && (
              <ul className="list-none p-0 m-0 flex flex-col">
                {tourDates.map((td) => {
                  const dateObj = calculateDateWithTimezoneOffset(td.date);
                  const isPast = new Date(td.date) < new Date();
                  const month = dateObj
                    .toLocaleString(i18n.language, { month: "short" })
                    .toUpperCase();
                  const day = dateObj.getDate();
                  return (
                    <li
                      key={td.date + td.location}
                      className={`flex items-center gap-4 py-3 border-b border-(--mi-tint-color) last:border-b-0 ${
                        isPast ? "opacity-50" : ""
                      }`}
                    >
                      <div className="shrink-0 w-14 flex flex-col items-center justify-center rounded-md border border-(--mi-tint-x-color) py-1 leading-tight">
                        <span className="text-xs font-semibold uppercase tracking-wider text-(--mi-secondary-text-color)">
                          {month}
                        </span>
                        <span className="text-xl font-semibold">{day}</span>
                      </div>
                      <div className="flex-1 min-w-0 text-sm">
                        <div className="font-medium truncate">
                          {td.location}
                        </div>
                        <div className="text-xs text-(--mi-secondary-text-color)">
                          {formatDate({
                            date: dateObj.toISOString(),
                            i18n,
                            options: { dateStyle: "long" },
                          })}
                        </div>
                      </div>
                      {td.ticketsUrl && (
                        <ArtistButtonAnchor
                          href={td.ticketsUrl}
                          size="compact"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0"
                        >
                          {isPast ? t("eventPage") : t("buyTickets")}
                        </ArtistButtonAnchor>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {(!tourDates || tourDates.length === 0) && (
              <p className="text-center text-(--mi-secondary-text-color) py-4">
                {t("noTourDatesYet")}
              </p>
            )}

            {isManage && (
              <div className="flex justify-end mt-4 pt-4 border-t border-(--mi-tint-color)">
                <ArtistButton
                  size="compact"
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
                  border-bottom: 1px solid var(--mi-text-color);
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
                  {t("removeTourDate")}
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
                wrap
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
