import type { EditorState } from "prosemirror-state";
import { Decoration } from "prosemirror-view";

/**
 * Appends decorations to `decorations` for an active anchor-based highlight
 * (anchor → cursor, covering spaces) or falls back to a regex pattern when
 * no anchor is set (e.g. the initial keystroke before React sets the anchor).
 */
export function addAnchoredDecorations(
  decorations: Decoration[],
  state: EditorState,
  {
    anchorRef,
    cssClass,
    fallbackPattern,
    isValidQuery = () => true,
  }: {
    anchorRef: { current: number | null };
    cssClass: string;
    fallbackPattern?: RegExp;
    isValidQuery?: (query: string) => boolean;
  }
): void {
  const anchor = anchorRef.current;
  if (anchor !== null) {
    const cursorPos = state.selection.$anchor.pos;
    if (cursorPos > anchor) {
      const query = state.doc.textBetween(anchor, cursorPos);
      if (isValidQuery(query)) {
        decorations.push(
          Decoration.inline(anchor, cursorPos, { class: cssClass })
        );
      }
    }
  } else if (fallbackPattern) {
    state.doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return;
      fallbackPattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = fallbackPattern.exec(node.text)) !== null) {
        decorations.push(
          Decoration.inline(
            pos + match.index,
            pos + match.index + match[0].length,
            { class: cssClass }
          )
        );
      }
    });
  }
}
