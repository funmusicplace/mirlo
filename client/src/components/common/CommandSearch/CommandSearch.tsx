import { css } from "@emotion/css";
import LoadingSpinner from "components/common/LoadingSpinner";
import FilterGroup from "components/Listener/UserNotificationFeed/FilterGroup";
import FocusTrap from "focus-trap-react";
import React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { FaSearch, FaTimes } from "react-icons/fa";

export type CommandSearchItem = {
  key: string;
  node: React.ReactNode;
  onSelect: () => void;
};

export type CommandSearchSection = {
  category: string;
  items: CommandSearchItem[];
};

export type CommandSearchFilter = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  placeholder: string;
  query: string;
  onQueryChange: (q: string) => void;
  onEnter?: (query: string) => void;
  sections: CommandSearchSection[];
  isLoading?: boolean;
  filters?: CommandSearchFilter[];
  footer?: React.ReactNode;
  emptyMessage?: React.ReactNode;
};

const fadeInKeyframe = css`
  animation: 150ms ease-out forwards command-search-fade-in;

  @keyframes command-search-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const CommandSearch: React.FC<Props> = ({
  open,
  onClose,
  title,
  placeholder,
  query,
  onQueryChange,
  onEnter,
  sections,
  isLoading,
  filters,
  footer,
  emptyMessage,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "commandSearch" });
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(-1);

  React.useEffect(() => {
    if (open) setActiveIndex(-1);
  }, [open]);

  React.useEffect(() => {
    setActiveIndex(-1);
  }, [sections]);

  const flatItems = React.useMemo(
    () => sections.flatMap((s) => s.items),
    [sections]
  );

  const sectionStartIndexes = React.useMemo(() => {
    const offsets: number[] = [];
    let running = 0;
    for (const s of sections) {
      offsets.push(running);
      running += s.items.length;
    }
    return offsets;
  }, [sections]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(flatItems.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = activeIndex >= 0 ? flatItems[activeIndex] : undefined;
      if (item) {
        item.onSelect();
      } else if (onEnter && query.trim().length > 0) {
        onEnter(query.trim());
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  return createPortal(
    <FocusTrap
      focusTrapOptions={{
        initialFocus: () => inputRef.current ?? false,
        escapeDeactivates: false,
        clickOutsideDeactivates: false,
        returnFocusOnDeactivate: true,
      }}
    >
      <div
        className={`fixed inset-0 bg-black/85 z-[1100] flex justify-center items-start pt-[10vh] px-4 pb-4 overflow-y-auto text-white ${fadeInKeyframe}`}
        onClick={onClose}
        role="presentation"
      >
        <div
          className="w-[min(90vw,640px)] max-h-[80vh] flex flex-col gap-3"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={title ?? t("dialogLabel")}
        >
          {title && (
            <header className="flex items-center justify-between">
              <h2 className="m-0 text-xl font-semibold text-white">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("close")}
                className="bg-transparent border-none text-white/85 cursor-pointer p-1.5 rounded-full inline-flex items-center justify-center hover:bg-white/10 hover:text-white"
              >
                <FaTimes />
              </button>
            </header>
          )}

          {filters && filters.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {filters.map((filter, idx) => (
                <FilterGroup
                  key={filter.label}
                  legend={filter.label}
                  name={`command-search-filter-${idx}`}
                  options={filter.options}
                  value={filter.value}
                  onChange={filter.onChange}
                  variant="overlay"
                  noMargin
                />
              ))}
            </div>
          )}

          <div className="relative flex items-center">
            <FaSearch className="absolute left-3.5 text-(--mi-light-foreground-color)" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              aria-label={title ?? placeholder}
              autoComplete="off"
              className="w-full pl-10 pr-10 py-2.5 text-[1.05rem] border border-(--mi-darken-background-color) rounded-(--mi-border-radius) bg-(--mi-background-color) text-(--mi-text-color) focus:outline-none focus:border-(--mi-button-color)"
            />
            {isLoading && (
              <span className="absolute right-4">
                <LoadingSpinner size="small" />
              </span>
            )}
          </div>

          {query.trim().length >= 2 && (
            <div
              className="bg-(--mi-background-color) text-(--mi-text-color) rounded-(--mi-border-radius) overflow-y-auto flex-1 py-1"
              role="listbox"
            >
              {!isLoading && flatItems.length === 0 && (
                <p className="px-3.5 py-6 text-center text-(--mi-light-foreground-color) text-[0.9rem]">
                  {emptyMessage ?? t("noResults")}
                </p>
              )}
              {sections.map((section, sIdx) => (
                <div key={section.category}>
                  <div className="px-3.5 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-(--mi-light-foreground-color)">
                    {section.category}
                  </div>
                  {section.items.map((item, iIdx) => {
                    const idx = sectionStartIndexes[sIdx] + iIdx;
                    const active = activeIndex === idx;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={item.onSelect}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`block w-full text-left px-3.5 py-2 bg-transparent border-none cursor-pointer text-[0.95rem] text-(--mi-text-color) truncate ${active ? "bg-(--mi-darken-background-color)" : "hover:bg-(--mi-darken-background-color)"}`}
                      >
                        {item.node}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {footer && <div className="flex justify-start">{footer}</div>}
        </div>
      </div>
    </FocusTrap>,
    document.body
  );
};

export default CommandSearch;
