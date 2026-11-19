import Button from "components/common/Button";
import { uniq } from "lodash";
import {
  useAddFontFilesMutation,
  useDeleteFontFileMutation,
  useDeleteFontMutation,
} from "queries/fonts";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { FaPlus, FaTrash } from "react-icons/fa";
import { useSnackbar } from "state/SnackbarContext";
import { ensureFontFaces } from "utils/fonts";
import { useConfirm } from "utils/useConfirm";

import {
  FONT_ACCEPT,
  FONT_SCRIPT_KEYS,
  FONT_SIZE_LABEL,
  MAX_FILES_PER_FONT,
  findTooLargeFile,
  fontErrorMessage,
  fontWeightKey,
} from "./fontLibrary";
import { FontRole } from "./settingsForm";

const ROLE_KEYS: Record<FontRole, string> = {
  heading: "fontUsedForHeading",
  body: "fontUsedForBody",
};

const FontLibraryItem: React.FC<{
  font: Font;
  roles: FontRole[];
  isExpanded: boolean;
  onToggle: () => void;
  onDeleted: (fontId: string) => void;
}> = ({ font, roles, isExpanded, onToggle, onDeleted }) => {
  const { t } = useTranslation("translation", { keyPrefix: "admin" });
  const snackbar = useSnackbar();
  const { ask } = useConfirm();
  const { mutateAsync: addFiles, isPending: isAdding } =
    useAddFontFilesMutation();
  const { mutateAsync: deleteFont, isPending: isDeletingFont } =
    useDeleteFontMutation();
  const { mutateAsync: deleteFile, isPending: isDeletingFile } =
    useDeleteFontFileMutation();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const toggleRef = React.useRef<HTMLSpanElement>(null);
  const nameId = `font-${font.id}-name`;
  const panelId = `font-${font.id}-edit`;
  const scripts = uniq(font.files.flatMap((file) => file.scripts)).filter(
    (script) => FONT_SCRIPT_KEYS[script]
  );

  React.useEffect(() => {
    ensureFontFaces(font);
  }, [font]);

  const run = async (action: () => Promise<unknown>, successKey: string) => {
    try {
      await action();
      snackbar(t(successKey), { type: "success" });
      return true;
    } catch (e) {
      snackbar(fontErrorMessage(e, t("fontUpdateFailed")), {
        type: "warning",
      });
      return false;
    }
  };

  const onFilesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const tooLarge = findTooLargeFile(files);
    if (tooLarge) {
      snackbar(
        t("fontFileTooLarge", {
          filename: tooLarge.name,
          maxSize: FONT_SIZE_LABEL,
        }),
        { type: "warning" }
      );
      return;
    }
    if (files.length > 0) {
      await run(() => addFiles({ fontId: font.id, files }), "fontUpdated");
    }
    focusToggle();
  };

  const focusToggle = () => toggleRef.current?.querySelector("button")?.focus();

  const onDeleteFile = async (file: FontFile) => {
    await run(
      () => deleteFile({ fontId: font.id, fileId: file.id }),
      "fontUpdated"
    );
    focusToggle();
  };

  const onDeleteFont = async () => {
    const message = t(
      roles.length > 0 ? "deleteFontInUseConfirm" : "deleteFontConfirm",
      { name: font.name }
    );
    if (!(await ask(message))) {
      return;
    }
    if (await run(() => deleteFont({ fontId: font.id }), "fontDeleted")) {
      onDeleted(font.id);
    } else {
      focusToggle();
    }
  };

  const fileLabel = (file: FontFile) => {
    const isItalic = file.style === "italic";
    if (file.weightMin !== file.weightMax) {
      return t(isItalic ? "fontVariableItalic" : "fontVariable", {
        min: file.weightMin,
        max: file.weightMax,
      });
    }
    const weight = t(fontWeightKey(file.weightMin));
    return isItalic ? t("fontItalicStyle", { weight }) : weight;
  };

  const fileStyle = (file: FontFile): React.CSSProperties => ({
    fontFamily: font.stack,
    fontWeight: Math.min(file.weightMax, Math.max(file.weightMin, 400)),
    fontStyle: file.style,
  });

  return (
    <li
      aria-labelledby={nameId}
      className="flex flex-col gap-3 rounded-(--mi-border-radius) bg-(--mi-tint-color) px-3 py-2"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span id={nameId} className="font-semibold">
          {font.name}
        </span>
        <span
          className="min-w-0 grow truncate"
          style={{ fontFamily: font.stack }}
        >
          {!isExpanded && font.files.map(fileLabel).join(" · ")}
        </span>
        {roles.length > 0 && (
          <span className="text-xs">
            <Trans
              t={t}
              i18nKey="fontAssignedTo"
              values={{
                roles: roles.map((role) => t(ROLE_KEYS[role])).join(", "),
              }}
              components={{
                dim: <span className="text-(--mi-light-foreground-color)" />,
              }}
            />
          </span>
        )}
        <span ref={toggleRef}>
          <Button
            type="button"
            size="compact"
            variant="outlined"
            aria-expanded={isExpanded}
            aria-controls={panelId}
            aria-label={t(isExpanded ? "fontEditDoneNamed" : "fontEditNamed", {
              name: font.name,
            })}
            onClick={onToggle}
          >
            {t(isExpanded ? "fontEditDone" : "fontEdit")}
          </Button>
        </span>
      </div>
      {isExpanded && (
        <div id={panelId} className="flex flex-col gap-3 pb-2">
          <ul className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
            {font.files.map((file) => (
              <li
                key={file.id}
                className={`flex items-center gap-2 rounded-(--mi-border-radius) border border-(--mi-tint-x-color) py-1 pl-3 ${font.files.length > 1 ? "pr-1" : "pr-3"}`}
              >
                <span style={fileStyle(file)}>{fileLabel(file)}</span>
                {font.files.length > 1 && (
                  <Button
                    type="button"
                    size="tiny"
                    variant="transparent"
                    startIcon={<FaTrash />}
                    aria-label={t("removeFontFile", { file: fileLabel(file) })}
                    disabled={isDeletingFile}
                    onClick={() => onDeleteFile(file)}
                  />
                )}
              </li>
            ))}
          </ul>
          <small>
            {scripts.length > 0
              ? t("fontScripts", {
                  scripts: scripts
                    .map((script) => t(FONT_SCRIPT_KEYS[script]))
                    .join(", "),
                })
              : t("fontNoKnownScript")}
          </small>
          <div className="flex flex-wrap justify-between gap-2">
            {font.files.length < MAX_FILES_PER_FONT && (
              <Button
                type="button"
                size="compact"
                variant="outlined"
                startIcon={<FaPlus />}
                isLoading={isAdding}
                disabled={isAdding}
                onClick={() => fileInputRef.current?.click()}
              >
                {t("addFontFiles")}
              </Button>
            )}
            <Button
              type="button"
              size="compact"
              variant="outlined"
              buttonRole="warning"
              startIcon={<FaTrash />}
              className="ml-auto"
              isLoading={isDeletingFont}
              disabled={isDeletingFont}
              onClick={onDeleteFont}
            >
              {t("deleteFont")}
            </Button>
          </div>
        </div>
      )}
      <input
        ref={fileInputRef}
        id={`input-font-${font.id}-files`}
        type="file"
        multiple
        accept={FONT_ACCEPT}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={onFilesChange}
      />
    </li>
  );
};

export default FontLibraryItem;
