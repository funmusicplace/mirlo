import Pill from "components/common/Pill";
import TextArea from "components/common/TextArea";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaTimes } from "react-icons/fa";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_SEPARATOR_REGEX = /[,;\s]+/;

export const isValidEmail = (email: string) => EMAIL_REGEX.test(email);

const splitEmails = (text: string) =>
  text
    .split(EMAIL_SEPARATOR_REGEX)
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);

const EmailListInput: React.FC<{
  id: string;
  emails: string[];
  onChange: (emails: string[]) => void;
  describedBy?: string;
}> = ({ id, emails, onChange, describedBy }) => {
  const { t } = useTranslation("translation", { keyPrefix: "emailListInput" });
  const [draft, setDraft] = React.useState("");

  const addEmails = (text: string) => {
    const incoming = splitEmails(text).filter(
      (email) => !emails.includes(email)
    );
    if (incoming.length > 0) {
      onChange([...emails, ...Array.from(new Set(incoming))]);
    }
  };

  const commitDraft = () => {
    if (draft.trim()) {
      addEmails(draft);
    }
    setDraft("");
  };

  const onDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (EMAIL_SEPARATOR_REGEX.test(value)) {
      const lastSeparator = value.search(/[,;\s][^,;\s]*$/);
      addEmails(value.slice(0, lastSeparator + 1));
      setDraft(value.slice(lastSeparator + 1).trim());
      return;
    }
    setDraft(value);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && draft === "" && emails.length > 0) {
      onChange(emails.slice(0, -1));
    }
  };

  const invalidCount = emails.filter((email) => !isValidEmail(email)).length;

  return (
    <div className="flex w-full flex-col gap-2">
      {emails.length > 0 && (
        <ul className="flex flex-wrap gap-1 max-h-48 overflow-y-auto">
          {emails.map((email) => (
            <li key={email}>
              <Pill variant={isValidEmail(email) ? undefined : "warning"}>
                {email}
                <button
                  type="button"
                  aria-label={t("removeEmail", { email })}
                  onClick={() => onChange(emails.filter((e) => e !== email))}
                >
                  <FaTimes aria-hidden />
                </button>
              </Pill>
            </li>
          ))}
        </ul>
      )}
      <TextArea
        id={id}
        rows={3}
        value={draft}
        placeholder={t("placeholder")}
        aria-describedby={describedBy}
        onChange={onDraftChange}
        onKeyDown={onKeyDown}
        onBlur={commitDraft}
      />
      <small aria-live="polite" className="flex gap-2">
        <span>{t("summary", { count: emails.length })}</span>
        {invalidCount > 0 && (
          <span className="text-(--mi-warning-color)">
            {t("invalidSummary", { count: invalidCount })}
          </span>
        )}
      </small>
    </div>
  );
};

export default EmailListInput;
