import { PlainExtension, DefaultExtensionOptions } from "@remirror/core";
import { Decoration, DecorationSet } from "prosemirror-view";
import { Plugin } from "prosemirror-state";

// Matches @username or @username@server.tld
const MENTION_PATTERN = /@[\w.-]+(?:@[\w.-]+\.[a-zA-Z]{2,})?/g;

type MentionHighlightOptions = Record<string, never>;

export class MentionHighlightExtension extends PlainExtension<MentionHighlightOptions> {
  static defaultOptions: DefaultExtensionOptions<MentionHighlightOptions> = {};

  get name() {
    return "mentionHighlight" as const;
  }

  createPlugin(): Plugin {
    return new Plugin({
      props: {
        decorations(state) {
          const decorations: Decoration[] = [];
          state.doc.descendants((node, pos) => {
            if (!node.isText || !node.text) return;
            MENTION_PATTERN.lastIndex = 0;
            let match: RegExpExecArray | null;
            while ((match = MENTION_PATTERN.exec(node.text)) !== null) {
              const from = pos + match.index;
              const to = from + match[0].length;
              decorations.push(
                Decoration.inline(from, to, {
                  class: "mention-highlight",
                })
              );
            }
          });
          return DecorationSet.create(state.doc, decorations);
        },
      },
    });
  }
}
