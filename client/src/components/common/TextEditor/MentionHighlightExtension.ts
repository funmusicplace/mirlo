import { PlainExtension, DefaultExtensionOptions } from "@remirror/core";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

import { addAnchoredDecorations } from "./AnchoredHighlight";

// Fallback pattern for the initial @ keystroke before React sets the anchor
const MENTION_PATTERN = /@[\w.-]+(?:@[\w.-]+(?:\.[a-zA-Z]{2,})?)?/g;

export class MentionHighlightExtension extends PlainExtension<
  Record<string, never>
> {
  static defaultOptions: DefaultExtensionOptions<Record<string, never>> = {};

  // Plain instance property — bypasses Remirror's options system (which
  // deep-clones options) so the plugin closure and MentionCommands always
  // share the same object reference.
  readonly anchorRef: { current: number | null } = { current: null };

  get name() {
    return "mentionHighlight" as const;
  }

  createPlugin(): Plugin {
    const { anchorRef } = this;
    return new Plugin({
      props: {
        decorations(state) {
          const decorations: Decoration[] = [];

          // Highlight already-inserted mention links (data-mention-actor)
          state.doc.descendants((node, pos) => {
            if (!node.isText) return;
            const mentionMark = node.marks.find(
              (m) => m.type.name === "link" && m.attrs["data-mention-actor"]
            );
            if (mentionMark) {
              decorations.push(
                Decoration.inline(pos, pos + node.nodeSize, {
                  class: "mention-link",
                })
              );
            }
          });

          addAnchoredDecorations(decorations, state, {
            anchorRef,
            cssClass: "mention-highlight",
            fallbackPattern: MENTION_PATTERN,
            isValidQuery: (q) => q.startsWith("@"),
          });

          return DecorationSet.create(state.doc, decorations);
        },
      },
    });
  }
}
