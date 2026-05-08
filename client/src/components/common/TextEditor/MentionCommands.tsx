import {
  useChainedCommands,
  useEditorState,
  useRemirrorContext,
} from "@remirror/react";
import type { Node as ProsemirrorNode } from "prosemirror-model";
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
  const cleanQuery = query.startsWith("@") ? query.slice(1) : query;
  if (!cleanQuery) return [];

  const response = await api.getMany<Artist>("artists", {
    name: cleanQuery,
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

const MentionCommands: React.FC = () => {
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
  }, []);

  const insertMention = useCallback(
    (item: MentionResult) => {
      try {
        const anchorPos = view.state.selection.$anchor.pos;
        const scanFrom = Math.max(0, anchorPos - 100);

        let from = -1;
        view.state.doc.nodesBetween(
          scanFrom,
          anchorPos,
          (node: ProsemirrorNode, pos: number) => {
            if (!node.isText || !node.text) return;
            const nodeEnd = pos + node.text.length;
            const sliceEnd = Math.min(nodeEnd, anchorPos);
            const text = node.text.slice(0, sliceEnd - pos);
            const match = text.match(/@[\w.-]+(?:@[\w.-]*)?$/);
            if (match && match.index !== undefined) {
              from = pos + match.index;
            }
          }
        );

        if (from === -1) return;

        const to = anchorPos;
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
    [chain, view, dismiss]
  );

  // Detect @mention trigger from editor state
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

    console.log("[MentionCommands] textBefore:", JSON.stringify(textBefore));

    const match = textBefore.match(/@([\w.-]*)(?:@[\w.-]*)?$/);
    if (match) {
      const query = match[0];
      setIsActive(true);
      setSearchText(query);
      searchCallback(query);
      try {
        const coords = view.coordsAtPos($cursor.pos);
        setDropdownPos({ top: coords.bottom, left: coords.left });
      } catch {
        // coordsAtPos can throw if pos is out of bounds
      }
    } else {
      dismiss();
    }
  }, [state, searchCallback, view, dismiss]);

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
