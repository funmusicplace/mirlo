import {
  useChainedCommands,
  useEditorState,
  useRemirrorContext,
} from "@remirror/react";
import React, { useEffect, useState, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";

import CommandDropdown, { useCommandKeyboardNav } from "./CommandDropdown";

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
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

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

  const dismiss = useCallback(() => {
    setIsActive(false);
    setResults([]);
    setSearchText("");
    setDropdownPos(null);
    setActiveConfig(null);
  }, []);

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

        dismiss();
      } catch (e) {
        console.error("Error inserting slash command result:", e);
      }
    },
    [chain, view, activeConfig, searchText, dismiss]
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
        setIsActive(true);
        setActiveConfig(config);
        setSearchText(match[1]);
        searchCallback(config, match[1]);
        try {
          const coords = view.coordsAtPos($cursor.pos);
          setDropdownPos({ top: coords.bottom, left: coords.left });
        } catch {
          // coordsAtPos can throw if pos is out of bounds
        }
        return;
      }
    }

    dismiss();
  }, [state, searchCallback, commandConfigs, view, dismiss]);

  useCommandKeyboardNav({
    isActive,
    results,
    selectedIndex,
    setSelectedIndex,
    onSelect: insertResult,
    onDismiss: dismiss,
  });

  if (!isActive || (!isSearching && results.length === 0 && !searchText)) {
    return null;
  }

  return (
    <CommandDropdown
      isSearching={isSearching}
      results={results}
      selectedIndex={selectedIndex}
      searchText={searchText}
      dropdownPos={dropdownPos}
      noResultsLabel={activeConfig?.noResultsLabel ?? "No results found"}
      onSelect={insertResult}
      onDismiss={dismiss}
    />
  );
};

export default SlashCommands;
