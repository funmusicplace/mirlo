import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronDown, FaTimes } from "react-icons/fa";

export type DateRangeValue =
  | ""
  | "thisMonth"
  | "previousMonth"
  | "thisYear"
  | "lastYear";

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
}) => {
  const { t } = useTranslation("translation", {
    keyPrefix: "dateRangeFilter",
  });
  const [isOpen, setIsOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const toggleRef = React.useRef<HTMLButtonElement>(null);

  const options: { value: DateRangeValue; label: string }[] = [
    { value: "thisMonth", label: t("currentMonthToDate") },
    { value: "previousMonth", label: t("previousMonth") },
    { value: "thisYear", label: t("currentYearToDate") },
    { value: "lastYear", label: t("lastYear") },
  ];

  const selectedOption = options.find((o) => o.value === value);

  const closePanel = React.useCallback(() => {
    setIsOpen(false);
    toggleRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        closePanel();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, closePanel]);

  const handleSelect = (newValue: DateRangeValue) => {
    onChange(newValue);
    setIsOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <div className="relative self-start" ref={wrapperRef}>
      <div className="inline-flex items-stretch border border-(--mi-tint-x-color) rounded bg-(--mi-button-tint-color) hover:border-(--mi-text-color)">
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 text-sm"
          aria-expanded={isOpen}
        >
          <span className="truncate max-w-48">
            {selectedOption ? selectedOption.label : t("filterByDate")}
          </span>
          {!selectedOption && <FaChevronDown className="opacity-60" />}
        </button>
        {selectedOption && (
          <button
            type="button"
            onClick={() => handleSelect("")}
            aria-label={t("clearFilter")}
            className="px-2 border-l border-(--mi-tint-x-color) opacity-60 hover:opacity-100"
          >
            <FaTimes />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-56 bg-(--mi-background-color) border border-(--mi-tint-x-color) rounded shadow-lg flex flex-col">
          <div className="max-h-72 overflow-y-auto divide-y divide-(--mi-tint-color)">
            <button
              type="button"
              onClick={() => handleSelect("")}
              className="w-full text-left px-3 py-2 hover:bg-(--mi-button-tint-color) text-sm italic"
            >
              {t("allDates")}
            </button>
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className="w-full text-left px-3 py-2 hover:bg-(--mi-button-tint-color) text-sm"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangeFilter;
