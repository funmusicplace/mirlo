import {
  useChainedCommands,
  useEditorState,
  useRemirrorContext,
} from "@remirror/react";
import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import api from "services/api";
import { useDebouncedCallback } from "use-debounce";
import { getArtistUrl } from "utils/artist";

import { API_ROOT } from "../../../constants";

import CommandDropdown, { useCommandKeyboardNav } from "./CommandDropdown";

export type MentionResult = {
  id: string;
  label: string;
  displayName: string;
  url: string;
  actorId: string;
  handle: string;
};

// Matches a fully-qualified AP handle: @user@server
const REMOTE_HANDLE_PATTERN = /^@?([\w.-]+)@([\w.-]+\.[a-zA-Z]{2,})$/;

async function searchMentions(query: string): Promise<MentionResult[]> {
  const remoteMatch = query.match(REMOTE_HANDLE_PATTERN);

  if (remoteMatch) {
    // Remote AP actor lookup via backend WebFinger proxy
    try {
      const params = new URLSearchParams({
        resource: `acct:${remoteMatch[1]}@${remoteMatch[2]}`,
      });
      const response = await api.get<{
        id: string;
        name: string;
        preferredUsername: string;
        url: string;
      }>(`activityPub/webfinger?${params.toString()}`);
      if (response.result) {
        const actor = response.result;
        const handle = `@${actor.preferredUsername}@${remoteMatch[2]}`;
        return [
          {
            id: actor.id,
            label: actor.name ? `${actor.name} (${handle})` : handle,
            displayName: actor.name || handle,
            url: actor.url,
            actorId: actor.id,
            handle,
          },
        ];
      }
    } catch {
      // No match found remotely
    }
    return [];
  }

  // Local Mirlo artist search
  const cleanQuery = (query.startsWith("@") ? query.slice(1) : query).trim();
  if (!cleanQuery) return [];

  const response = await api.getMany<Artist>("artists", {
    name: cleanQuery,
    includeUnpublished: "true",
    take: "10",
  });

  return response.results.map((artist) => {
    const actorId = `${API_ROOT}/v1/ap/artists/${artist.urlSlug}`;
    const apDomain = new URL(API_ROOT).hostname;
    return {
      id: String(artist.id),
      label: artist.name,
      displayName: artist.name,
      url: getArtistUrl(artist),
      actorId,
      handle: `@${artist.urlSlug}@${apDomain}`,
    };
  });
}

const MentionCommands: React.FC<{
  anchorRef: { current: number | null };
}> = ({ anchorRef }) => {
  const { t } = useTranslation("translation", { keyPrefix: "textEditor" });
  const [isActive, setIsActive] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<MentionResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const chain = useChainedCommands();
  const state = useEditorState();
  const { view } = useRemirrorContext();

  const runSearch = useCallback(async (query: string) => {
    if (!query) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const found = await searchMentions(query);
      setResults(found);
      setSelectedIndex(0);
    } catch (e) {
      console.error("MentionCommands: search error", e);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const searchCallback = useDebouncedCallback(runSearch, 300);

  const dismiss = useCallback(() => {
    setIsActive(false);
    setResults([]);
    setSearchText("");
    setDropdownPos(null);
    anchorRef.current = null;
  }, [anchorRef]);

  const insertMention = useCallback(
    (item: MentionResult) => {
      try {
        const from = anchorRef.current;
        if (from === null) return;
        const to = view.state.selection.$anchor.pos;

        chain
          .selectText({ from, to })
          .delete()
          .insertText(item.displayName)
          .selectText({ from, to: from + item.displayName.length })
          .updateLink({
            href: item.url,
            "data-mention-actor": item.actorId,
            "data-mention-handle": item.handle,
          } as any)
          .selectText(from + item.displayName.length)
          .run();

        dismiss();
      } catch (e) {
        console.error("MentionCommands: insert error", e);
      }
    },
    [chain, view, dismiss, anchorRef]
  );

  // Detect @mention trigger from editor state.
  // isActive is intentionally excluded from deps: we use anchorRef (ref)
  // as the source of truth so that dismiss() doesn't cause the effect to
  // immediately re-run and re-activate at the same '@'.
  useEffect(() => {
    const $cursor = state.selection.$anchor;
    if (!$cursor) {
      setIsActive(false);
      return;
    }

    const cursorPos = $cursor.pos;
    const anchor = anchorRef.current;

    if (anchor !== null) {
      if (cursorPos <= anchor) {
        dismiss();
        return;
      }
      const query = state.doc.textBetween(anchor, cursorPos);
      if (!query.startsWith("@")) {
        dismiss();
        return;
      }
      setSearchText(query);
      searchCallback(query);
      try {
        const coords = view.coordsAtPos(cursorPos);
        setDropdownPos({ top: coords.bottom, left: coords.left });
      } catch {}
      return;
    }

    // Not active — check for '@' trigger
    const textBefore = state.doc.textBetween(
      Math.max(0, cursorPos - 100),
      cursorPos
    );
    const match = textBefore.match(/(?<!\w)@[\w.-]*$/);
    if (match) {
      const query = match[0];
      anchorRef.current = cursorPos - query.length;
      setIsActive(true);
      setSearchText(query);
      searchCallback(query);
      try {
        const coords = view.coordsAtPos(cursorPos);
        setDropdownPos({ top: coords.bottom, left: coords.left });
      } catch {}
    } else {
      dismiss();
    }
  }, [state, searchCallback, view, dismiss, anchorRef]);

  useCommandKeyboardNav({
    isActive,
    results,
    selectedIndex,
    setSelectedIndex,
    onSelect: insertMention,
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
      noResultsLabel={t("noMentionsFound")}
      onSelect={insertMention}
      onDismiss={dismiss}
    />
  );
};

export default MentionCommands;
