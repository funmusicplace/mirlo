import { PlainExtension, DefaultExtensionOptions } from "@remirror/core";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

import { addAnchoredDecorations } from "./AnchoredHighlight";

interface SlashCommandHighlightOptions {
  triggers: string[];
}

export class SlashCommandHighlightExtension extends PlainExtension<SlashCommandHighlightOptions> {
  static defaultOptions: DefaultExtensionOptions<SlashCommandHighlightOptions> =
    {
      triggers: [],
    };

  // Plain instance property — same pattern as MentionHighlightExtension to
  // avoid Remirror deep-cloning the ref through its options system.
  readonly anchorRef: { current: number | null } = { current: null };

  get name() {
    return "slashCommandHighlight" as const;
  }

  createPlugin(): Plugin {
    const triggers = this.options.triggers;
    const fallbackPattern = new RegExp(
      `\\/(${triggers.join("|")})\\s+\\S*`,
      "g"
    );
    const { anchorRef } = this;
    return new Plugin({
      props: {
        decorations(state) {
          const decorations: Decoration[] = [];
          addAnchoredDecorations(decorations, state, {
            anchorRef,
            cssClass: "slash-command-highlight",
            fallbackPattern,
            isValidQuery: (q) => q.startsWith("/"),
          });
          return DecorationSet.create(state.doc, decorations);
        },
      },
    });
  }
}
