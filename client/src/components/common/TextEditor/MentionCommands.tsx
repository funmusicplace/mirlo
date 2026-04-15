import React, { useEffect, useState, useCallback } from "react";
import type { Node as ProsemirrorNode } from "prosemirror-model";
import {
  useChainedCommands,
  useEditorState,
  useRemirrorContext,
} from "@remirror/react";
import LoadingSpinner from "../LoadingSpinner";
import Button from "../Button";
import { useDebouncedCallback } from "use-debounce";
import Background from "../Background";
import { useTranslation } from "react-i18next";
import api from "services/api";

export type MentionResult = {
  id: string;
  label: string;
  // The AP actor ID (URL) for the mention href
  actorId: string;
  // Display handle like @username or @username@server
  handle: string;
};

const searchResultsDivClass =
  "absolute p-2 bg-[var(--mi-normal-background-color)] border border-[var(--mi-darken-xx-background-color)] z-[1001] break-words text-[var(--mi-normal-foreground-color)] rounded-[5px] max-h-[300px] overflow-y-scroll min-w-[300px] max-sm:left-0 max-sm:w-[90%]";

const searchResultListClass = "list-none mt-2";

const searchResultButtonClass =
  "px-3 py-2 text-[var(--mi-normal-foreground-color)] block bg-transparent border-none w-full text-left overflow-hidden text-ellipsis text-[0.9rem] cursor-pointer hover:text-[var(--mi-normal-background-color)] hover:bg-[var(--mi-normal-foreground-color)]";

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
    const actorId = `${window.location.origin}/v1/artists/${artist.urlSlug}`;
    return {
      id: String(artist.id),
      label: artist.name,
      actorId,
      handle: `@${artist.urlSlug}`,
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

  const insertMention = useCallback(
    (item: MentionResult) => {
      try {
        const anchorPos = view.state.selection.$anchor.pos;
        const scanFrom = Math.max(0, anchorPos - 100);

        // Walk text nodes before the cursor and find the one containing our
        // @token. Using nodesBetween gives us accurate doc positions per node,
        // avoiding the node-boundary offset drift that textBetween causes.
        let from = -1;
        view.state.doc.nodesBetween(
          scanFrom,
          anchorPos,
          (node: ProsemirrorNode, pos: number) => {
            if (!node.isText || !node.text) return;
            // Only consider the portion of this node that's before the cursor
            const nodeEnd = pos + node.text.length;
            const sliceEnd = Math.min(nodeEnd, anchorPos);
            const text = node.text.slice(0, sliceEnd - pos);
            // Find the full @token ending at the cursor within this slice
            const match = text.match(/@[\w.-]+(?:@[\w.-]*)?$/);
            if (match && match.index !== undefined) {
              from = pos + match.index;
            }
          }
        );

        if (from === -1) return;

        const to = anchorPos;
        // Insert as a link: <a href="{actorId}" data-mention-actor="{actorId}">{handle}</a>
        chain
          .selectText({ from, to })
          .delete()
          .insertText(item.handle)
          .selectText({ from, to: from + item.handle.length })
          .updateLink({
            href: item.actorId,
            "data-mention-actor": item.actorId,
          } as any)
          .run();

        setIsActive(false);
        setResults([]);
        setSearchText("");
      } catch (e) {
        console.error("MentionCommands: insert error", e);
      }
    },
    [chain, view]
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

    // Match @query at end of text (no space yet)
    const match = textBefore.match(/@([\w.-]*)(?:@[\w.-]*)?$/);
    if (match) {
      const query = match[0]; // includes leading @
      setIsActive(true);
      setSearchText(query);
      searchCallback(query);
    } else {
      setIsActive(false);
      setResults([]);
      setSearchText("");
    }
  }, [state, searchCallback]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      if (e.key === "Escape") {
        setIsActive(false);
        e.preventDefault();
      } else if (e.key === "Enter" && results.length > 0) {
        insertMention(results[selectedIndex]);
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
  }, [isActive, results, selectedIndex, insertMention]);

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
                  onClick={() => insertMention(result)}
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
            {t("noMentionsFound")}
          </div>
        )}
      </div>
    </>
  );
};

export default MentionCommands;
