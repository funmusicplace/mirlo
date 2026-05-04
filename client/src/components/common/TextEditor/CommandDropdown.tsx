import React, { useEffect } from "react";

import Background from "../Background";
import Button from "../Button";
import LoadingSpinner from "../LoadingSpinner";

export type CommandResult = { id: string | number; label: string };

const dropdownClass =
  "fixed p-2 bg-[var(--mi-background-color)] border border-[var(--mi-darken-xx-background-color)] z-[1001] break-words text-[var(--mi-text-color)] rounded-[5px] max-h-[300px] overflow-y-scroll min-w-[300px] max-sm:w-[90vw]";

const buttonClass =
  "px-3 py-2 text-[var(--mi-text-color)] block bg-transparent border-none w-full text-left overflow-hidden text-ellipsis text-[0.9rem] cursor-pointer hover:text-[var(--mi-background-color)] hover:bg-[var(--mi-text-color)]";

const selectedButtonClass =
  "!bg-[var(--mi-text-color)] !text-[var(--mi-background-color)]";

export function useCommandKeyboardNav<T extends CommandResult>({
  isActive,
  results,
  selectedIndex,
  setSelectedIndex,
  onSelect,
  onDismiss,
}: {
  isActive: boolean;
  results: T[];
  selectedIndex: number;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  onSelect: (item: T) => void;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss();
        e.preventDefault();
      } else if (e.key === "Enter" && results.length > 0) {
        onSelect(results[selectedIndex]);
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        e.preventDefault();
      }
    };

    if (isActive) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isActive, results, selectedIndex, onSelect, onDismiss, setSelectedIndex]);
}

function CommandDropdown<T extends CommandResult>({
  isSearching,
  results,
  selectedIndex,
  searchText,
  dropdownPos,
  noResultsLabel,
  onSelect,
  onDismiss,
}: {
  isSearching: boolean;
  results: T[];
  selectedIndex: number;
  searchText: string;
  dropdownPos: { top: number; left: number } | null;
  noResultsLabel: string;
  onSelect: (item: T) => void;
  onDismiss: () => void;
}) {
  return (
    <>
      <Background onClick={onDismiss} transparent />
      <div
        className={dropdownClass}
        style={
          dropdownPos
            ? { top: dropdownPos.top, left: dropdownPos.left }
            : undefined
        }
      >
        {isSearching && <LoadingSpinner size="small" />}
        {!isSearching && results.length > 0 && (
          <ol className="list-none mt-2">
            {results.map((result, index) => (
              <li key={result.id}>
                <Button
                  type="button"
                  onClick={() => onSelect(result)}
                  className={`${buttonClass} ${index === selectedIndex ? selectedButtonClass : ""}`}
                >
                  {result.label}
                </Button>
              </li>
            ))}
          </ol>
        )}
        {!isSearching && results.length === 0 && searchText && (
          <div className="px-3 py-2 text-[var(--mi-text-color)] opacity-70">
            {noResultsLabel}
          </div>
        )}
      </div>
    </>
  );
}

export default CommandDropdown;
