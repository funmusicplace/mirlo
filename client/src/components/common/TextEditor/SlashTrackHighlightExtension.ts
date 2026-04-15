import { PlainExtension, DefaultExtensionOptions } from "@remirror/core";
import { Decoration, DecorationSet } from "prosemirror-view";
import { Plugin } from "prosemirror-state";

interface SlashCommandHighlightOptions {
  triggers: string[];
}

export class SlashCommandHighlightExtension extends PlainExtension<SlashCommandHighlightOptions> {
  static defaultOptions: DefaultExtensionOptions<SlashCommandHighlightOptions> =
    {
      triggers: [],
    };

  get name() {
    return "slashCommandHighlight" as const;
  }

  createPlugin(): Plugin {
    const triggers = this.options.triggers;
    const pattern = new RegExp(`\\/(${triggers.join("|")})\\s+\\S*`, "g");
    return new Plugin({
      props: {
        decorations(state) {
          const decorations: Decoration[] = [];
          state.doc.descendants((node, pos) => {
            if (!node.isText || !node.text) return;
            pattern.lastIndex = 0;
            let match: RegExpExecArray | null;
            while ((match = pattern.exec(node.text)) !== null) {
              const from = pos + match.index;
              const to = from + match[0].length;
              decorations.push(
                Decoration.inline(from, to, {
                  class: "slash-command-highlight",
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
