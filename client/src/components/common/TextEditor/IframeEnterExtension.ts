import {
  PlainExtension,
  DefaultExtensionOptions,
  KeyBindingProps,
} from "@remirror/core";
import { NodeSelection, TextSelection } from "prosemirror-state";

type Options = Record<string, never>;

/**
 * Fixes Enter on a NodeSelection of an iframe block. Without this, ProseMirror's
 * splitBlock treats the NodeSelection as a range, deletes the iframe, then splits
 * the surrounding block — removing the embed.
 *
 * This handler intercepts Enter first and inserts an empty paragraph after the
 * iframe, moving the cursor there.
 */
export class IframeEnterExtension extends PlainExtension<Options> {
  static defaultOptions: DefaultExtensionOptions<Options> = {};

  get name() {
    return "iframeEnter" as const;
  }

  createKeymap() {
    return {
      Enter: ({ state, dispatch }: KeyBindingProps) => {
        const { selection, schema } = state;
        if (!(selection instanceof NodeSelection)) return false;
        if (selection.node.type.name !== "iframe") return false;

        const paragraphType = schema.nodes.paragraph;
        if (!paragraphType) return false;

        const insertPos = selection.$to.pos;
        const tr = state.tr.insert(insertPos, paragraphType.create());
        tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
        dispatch?.(tr.scrollIntoView());
        return true;
      },
    };
  }
}
