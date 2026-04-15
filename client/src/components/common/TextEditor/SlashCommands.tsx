import React, { useEffect, useState, useCallback } from "react";
import {
  useChainedCommands,
  useEditorState,
  useRemirrorContext,
} from "@remirror/react";
import LoadingSpinner from "../LoadingSpinner";
import Button from "../Button";
import { useDebouncedCallback } from "use-debounce";
import Background from "../Background";
export type SlashCommandResult = {
  id: number | string;
  label: string;
  url?: string;
};

export type SlashCommandConfig = {
  trigger: string;
  search: (query: string) => Promise<SlashCommandResult[]>;
  // chain is the result of useChainedCommands() after .selectText().delete().
  // from is the doc position where the command text started (cursor after delete).
  // Call .run() at the end of your chain to commit.
  onSelect: (item: SlashCommandResult, chain: any, from: number) => void;
  noResultsLabel?: string;
};

const searchResultsDivClass =
  "absolute p-2 bg-[var(--mi-normal-background-color)] border border-[var(--mi-darken-xx-background-color)] z-[1001] break-words text-[var(--mi-normal-foreground-color)] rounded-[5px] max-h-[300px] overflow-y-scroll min-w-[300px] max-sm:left-0 max-sm:w-[90%]";

const searchResultListClass = "list-none mt-2";

const searchResultButtonClass =
  "px-3 py-2 text-[var(--mi-normal-foreground-color)] block bg-transparent border-none w-full text-left overflow-hidden text-ellipsis text-[0.9rem] cursor-pointer hover:text-[var(--mi-normal-background-color)] hover:bg-[var(--mi-normal-foreground-color)]";

const SlashCommands: React.FC<{
  commands: SlashCommandConfig[];
}> = ({ commands: commandConfigs }) => {
  const [isActive, setIsActive] = useState(false);
  const [activeConfig, setActiveConfig] = useState<SlashCommandConfig | null>(
    null
  );
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SlashCommandResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const chain = useChainedCommands();
  const state = useEditorState();
  const { view } = useRemirrorContext();

  const runSearch = useCallback(
    async (config: SlashCommandConfig, query: string) => {
      if (!query || query.length < 1) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await config.search(query);
        setResults(results);
        setSelectedIndex(0);
      } catch (e) {
        console.error(`Error searching for /${config.trigger}:`, e);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  const searchCallback = useDebouncedCallback(runSearch, 300);

  const insertResult = useCallback(
    (item: SlashCommandResult) => {
      if (!activeConfig) return;
      try {
        const commandText = `/${activeConfig.trigger} ${searchText}`;
        const anchorPos = view.state.selection.$anchor.pos;
        const scanFrom = Math.max(0, anchorPos - commandText.length - 20);

        let from = -1;
        view.state.doc.nodesBetween(scanFrom, anchorPos, (node, pos) => {
          if (node.isText && node.text) {
            const idx = node.text.indexOf(`/${activeConfig.trigger} `);
            if (idx !== -1) {
              from = pos + idx;
            }
          }
        });

        if (from === -1) return;

        const to = from + commandText.length;
        const c = chain.selectText({ from, to }).delete();
        activeConfig.onSelect(item, c, from);

        setIsActive(false);
        setResults([]);
        setSearchText("");
        setActiveConfig(null);
      } catch (e) {
        console.error("Error inserting slash command result:", e);
      }
    },
    [chain, view, activeConfig, searchText]
  );

  // Detect active slash command from editor state
  useEffect(() => {
    const $cursor = state.selection.$anchor;
    if (!$cursor) {
      setIsActive(false);
      return;
    }

    const textBefore = state.doc.textBetween(
      Math.max(0, $cursor.pos - 100),
      $cursor.pos
    );

    for (const config of commandConfigs) {
      const pattern = new RegExp(`\\/${config.trigger}\\s+([^\\n]*)$`);
      const match = textBefore.match(pattern);
      if (match) {
        const newSearchText = match[1];
        setIsActive(true);
        setActiveConfig(config);
        setSearchText(newSearchText);
        searchCallback(config, newSearchText);
        return;
      }
    }

    setIsActive(false);
    setResults([]);
    setActiveConfig(null);
  }, [state, searchCallback, commandConfigs]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      if (e.key === "Escape") {
        setIsActive(false);
        e.preventDefault();
      } else if (e.key === "Enter" && results.length > 0) {
        insertResult(results[selectedIndex]);
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
  }, [isActive, results, selectedIndex, insertResult]);

  if (!isActive || (!isSearching && results.length === 0 && !searchText)) {
    return null;
  }

  return (
    <>
      <Background
        onClick={() => {
          setIsActive(false);
          setResults([]);
        }}
        transparent
      />
      <div className={searchResultsDivClass}>
        {isSearching && <LoadingSpinner size="small" />}
        {!isSearching && results.length > 0 && (
          <ol className={searchResultListClass}>
            {results.map((result, index) => (
              <li key={result.id}>
                <Button
                  type="button"
                  onClick={() => insertResult(result)}
                  className={`${searchResultButtonClass} ${selectedIndex === index ? "!bg-[var(--mi-normal-foreground-color)] !text-[var(--mi-normal-background-color)]" : ""}`}
                >
                  {result.label}
                </Button>
              </li>
            ))}
          </ol>
        )}
        {!isSearching && results.length === 0 && searchText && (
          <div className="px-3 py-2 text-[var(--mi-normal-foreground-color)] opacity-70">
            {activeConfig?.noResultsLabel ?? "No results found"}
          </div>
        )}
      </div>
    </>
  );
};

export default SlashCommands;
