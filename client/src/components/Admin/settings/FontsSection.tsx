import { useQuery } from "@tanstack/react-query";
import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { queryAdminSettings } from "queries/admin";
import { queryFonts, useCreateFontMutation } from "queries/fonts";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaFolderOpen, FaUpload } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";
import { formatAcceptList } from "utils/uploadFormats";

import {
  FONT_ACCEPT,
  FONT_SIZE_LABEL,
  MAX_FILES_PER_FONT,
  MAX_FONTS,
  findTooLargeFile,
  fontErrorMessage,
} from "./fontLibrary";
import FontLibraryItem from "./FontLibraryItem";
import FontRoleSelect from "./FontRoleSelect";
import { FONT_ROLE_FIELDS, FontRole, FormSettings } from "./settingsForm";
import SettingsSection from "./SettingsSection";

const OPEN_FONT_LICENSE_FAQ_URL = "https://openfontlicense.org/ofl-faq/";

const FontsSection: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const snackbar = useSnackbar();
  const fontsQuery = useQuery(queryFonts());
  const { data: savedSettings } = useQuery(queryAdminSettings());
  const { mutateAsync: createFont, isPending: isUploading } =
    useCreateFontMutation();
  const fonts = React.useMemo(() => fontsQuery.data ?? [], [fontsQuery.data]);
  const isLibraryFull = fonts.length >= MAX_FONTS;
  const { resetField, watch } = useFormContext<FormSettings>();
  const instanceName = watch("instanceCustomization.title");
  const headingFontId = watch("headingFontId");
  const bodyFontId = watch("bodyFontId");
  const listHeadingRef = React.useRef<HTMLLegendElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const chooseRef = React.useRef<HTMLDivElement>(null);
  const [expandedFontId, setExpandedFontId] = React.useState<string | null>(
    null
  );
  const [files, setFiles] = React.useState<File[]>([]);
  const [hasLicense, setHasLicense] = React.useState(false);
  const [shouldRestoreFocus, setShouldRestoreFocus] = React.useState(false);

  React.useEffect(() => {
    if (!fontsQuery.data || fontsQuery.isFetching) {
      return;
    }
    const values = { heading: headingFontId, body: bodyFontId };
    for (const [role, field] of Object.entries(FONT_ROLE_FIELDS)) {
      const value = values[role as FontRole];
      if (value && !fonts.some((font) => font.id === value)) {
        const saved = savedSettings?.[field];
        resetField(field, {
          defaultValue:
            saved && fonts.some((font) => font.id === saved) ? saved : "",
        });
      }
    }
  }, [
    fontsQuery.data,
    fontsQuery.isFetching,
    fonts,
    headingFontId,
    bodyFontId,
    savedSettings,
    resetField,
  ]);

  React.useEffect(() => {
    if (!shouldRestoreFocus || isUploading) {
      return;
    }
    if (isLibraryFull) {
      listHeadingRef.current?.focus();
    } else {
      chooseRef.current?.querySelector("button")?.focus();
    }
    setShouldRestoreFocus(false);
  }, [shouldRestoreFocus, isUploading, isLibraryFull]);

  const savedRolesOf = (fontId: string) =>
    (Object.keys(FONT_ROLE_FIELDS) as FontRole[]).filter(
      (role) => savedSettings?.[FONT_ROLE_FIELDS[role]] === fontId
    );

  const onFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files ?? []);
    event.target.value = "";
    const tooLarge = findTooLargeFile(chosen);
    if (tooLarge || chosen.length > MAX_FILES_PER_FONT) {
      setFiles([]);
      snackbar(
        tooLarge
          ? t("fontFileTooLarge", {
              filename: tooLarge.name,
              maxSize: FONT_SIZE_LABEL,
            })
          : t("fontTooManyFiles", { max: MAX_FILES_PER_FONT }),
        { type: "warning" }
      );
      return;
    }
    setFiles(chosen);
  };

  const onUpload = async () => {
    try {
      await createFont(files);
      snackbar(t("fontUploaded"), { type: "success" });
      setFiles([]);
      setHasLicense(false);
    } catch (e) {
      snackbar(fontErrorMessage(e, t("fontUploadFailed")), {
        type: "warning",
      });
    }
    setShouldRestoreFocus(true);
  };

  return (
    <SettingsSection id="settings-fonts" title={t("fonts")}>
      <p className="mt-0">{t("fontsHint")}</p>
      {fontsQuery.isPending && <p>{t("fontsLoading")}</p>}
      {fontsQuery.isError && <p role="alert">{t("fontsLoadFailed")}</p>}
      {fontsQuery.data && (
        <>
          <FontRoleSelect
            role="heading"
            fonts={fonts}
            previewText={instanceName?.trim() || t("fontPreviewText")}
          />
          <FontRoleSelect
            role="body"
            fonts={fonts}
            previewText={t("fontPreviewText")}
          />
          <fieldset className="min-w-0">
            <legend
              ref={listHeadingRef}
              id="uploaded-fonts-heading"
              tabIndex={-1}
              className="mb-2 text-lg font-bold"
            >
              {t("uploadedFonts")}
            </legend>
            <p className="mt-0 mb-3 text-sm">
              {t("uploadedFontsHint", { max: MAX_FONTS })}
            </p>
            {fonts.length === 0 ? (
              <p className="mt-0 mb-4 rounded-(--mi-border-radius) border border-dashed border-(--mi-tint-x-color) p-6 text-center text-sm text-(--mi-light-foreground-color)">
                {t("uploadedFontsEmpty")}
              </p>
            ) : (
              <ul
                aria-labelledby="uploaded-fonts-heading"
                className="m-0 mb-4 flex list-none flex-col gap-2 p-0"
              >
                {fonts.map((font) => (
                  <FontLibraryItem
                    key={font.id}
                    font={font}
                    roles={savedRolesOf(font.id)}
                    isExpanded={expandedFontId === font.id}
                    onToggle={() =>
                      setExpandedFontId((current) =>
                        current === font.id ? null : font.id
                      )
                    }
                    onDeleted={() => listHeadingRef.current?.focus()}
                  />
                ))}
              </ul>
            )}
          </fieldset>
          {isLibraryFull ? (
            <p>{t("uploadedFontsFull")}</p>
          ) : (
            <fieldset className="min-w-0">
              <legend className="mb-2 text-lg font-bold">{t("addFont")}</legend>
              <div className="rounded-(--mi-border-radius) border border-(--mi-tint-x-color) p-4">
                <FormComponent role="group" aria-labelledby="label-font-files">
                  <label id="label-font-files" htmlFor="input-font-files">
                    {t("fontFiles")}
                  </label>
                  <input
                    ref={fileInputRef}
                    id="input-font-files"
                    type="file"
                    multiple
                    accept={FONT_ACCEPT}
                    className="sr-only"
                    aria-hidden="true"
                    tabIndex={-1}
                    onChange={onFilesChange}
                  />
                  <div ref={chooseRef}>
                    <Button
                      type="button"
                      variant="outlined"
                      startIcon={<FaFolderOpen />}
                      aria-describedby="hint-font-files"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {t("chooseFontFiles")}
                    </Button>
                  </div>
                  <ul className="m-0 list-none p-0 text-sm" aria-live="polite">
                    {files.map((file) => (
                      <li key={`${file.name}-${file.size}`}>{file.name}</li>
                    ))}
                  </ul>
                  <small id="hint-font-files">
                    {t("fontFilesHint", {
                      formats: formatAcceptList(FONT_ACCEPT),
                      maxSize: FONT_SIZE_LABEL,
                    })}
                  </small>
                </FormComponent>
                <FormComponent direction="row">
                  <InputEl
                    id="input-font-license"
                    type="checkbox"
                    checked={hasLicense}
                    aria-describedby="hint-font-license"
                    onChange={(event) => setHasLicense(event.target.checked)}
                  />
                  <label htmlFor="input-font-license">
                    {t("fontLicenseConfirm")}
                  </label>
                </FormComponent>
                <small id="hint-font-license" className="mb-4 block">
                  {t("fontLicenseHint")}{" "}
                  <a
                    href={OPEN_FONT_LICENSE_FAQ_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("fontLicenseLearnMore")}
                  </a>
                </small>
                <Button
                  type="button"
                  startIcon={<FaUpload />}
                  disabled={files.length === 0 || !hasLicense || isUploading}
                  isLoading={isUploading}
                  onClick={onUpload}
                >
                  {t("uploadFont")}
                </Button>
              </div>
            </fieldset>
          )}
        </>
      )}
    </SettingsSection>
  );
};

export default FontsSection;
