import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Minimal stubs for @remirror/core ────────────────────────────────────────
vi.mock("@remirror/core", () => {
  class PlainExtension {
    static defaultOptions = {};
    get options(): Record<string, unknown> {
      return {};
    }
  }
  return { PlainExtension, DefaultExtensionOptions: {} };
});

// ── Minimal stubs for prosemirror-view ───────────────────────────────────────
type DecorationAttrs = { class?: string };
type MockDecoration = { from: number; to: number; attrs: DecorationAttrs };
type MockDecorationSet = { decorations: MockDecoration[] };

vi.mock("prosemirror-view", () => ({
  Decoration: {
    inline: vi.fn(
      (from: number, to: number, attrs: DecorationAttrs): MockDecoration => ({
        from,
        to,
        attrs,
      })
    ),
  },
  DecorationSet: {
    create: vi.fn(
      (_doc: unknown, decorations: MockDecoration[]): MockDecorationSet => ({
        decorations,
      })
    ),
  },
}));

// ── Minimal stub for prosemirror-state ───────────────────────────────────────
vi.mock("prosemirror-state", () => ({
  Plugin: class {
    props: { decorations?: (state: unknown) => unknown };
    constructor({
      props,
    }: {
      props: { decorations?: (state: unknown) => unknown };
    }) {
      this.props = props;
    }
  },
}));

// Import AFTER mocks are set up
import { MentionHighlightExtension } from "./MentionHighlightExtension";
import { Decoration, DecorationSet } from "prosemirror-view";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTextNode(text: string) {
  return { isText: true as const, text };
}

function makeState(nodes: Array<{ isText: boolean; text?: string }>) {
  return {
    doc: {
      descendants(
        cb: (node: { isText: boolean; text?: string }, pos: number) => void
      ) {
        let pos = 1; // ProseMirror positions start at 1 inside a paragraph
        for (const node of nodes) {
          cb(node, pos);
          if (node.text) pos += node.text.length;
        }
      },
    },
  };
}

function getDecorations(
  ext: MentionHighlightExtension,
  nodes: Array<{ isText: boolean; text?: string }>
): MockDecoration[] {
  const plugin = ext.createPlugin() as {
    props: { decorations?: (state: unknown) => MockDecorationSet };
  };
  return (plugin.props.decorations!(makeState(nodes)) as MockDecorationSet)
    .decorations;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("MentionHighlightExtension", () => {
  let ext: MentionHighlightExtension;

  beforeEach(() => {
    vi.clearAllMocks();
    ext = new MentionHighlightExtension({});
  });

  it("has the correct extension name", () => {
    expect(ext.name).toBe("mentionHighlight");
  });

  it("returns no decorations for text with no mentions", () => {
    const decorations = getDecorations(ext, [
      makeTextNode("Hello world, no mentions here."),
    ]);
    expect(decorations).toHaveLength(0);
  });

  it("creates a decoration for a simple @username mention", () => {
    const decorations = getDecorations(ext, [
      makeTextNode("Hello @alice thanks!"),
    ]);
    expect(decorations).toHaveLength(1);
    expect(decorations[0].attrs.class).toBe("mention-highlight");
    // pos=1, match starts at index 6 → from=7, length of "@alice"=6 → to=13
    expect(decorations[0].from).toBe(7);
    expect(decorations[0].to).toBe(13);
  });

  it("creates a decoration for a federated @user@server.tld mention", () => {
    const text = "@alice@example.com";
    const decorations = getDecorations(ext, [makeTextNode(text)]);
    expect(decorations).toHaveLength(1);
    expect(decorations[0].attrs.class).toBe("mention-highlight");
    expect(decorations[0].from).toBe(1);
    expect(decorations[0].to).toBe(1 + text.length);
  });

  it("creates multiple decorations when several mentions exist in one node", () => {
    const decorations = getDecorations(ext, [
      makeTextNode("@alice and @bob are here"),
    ]);
    expect(decorations).toHaveLength(2);
    expect(
      decorations.every((d) => d.attrs.class === "mention-highlight")
    ).toBe(true);
  });

  it("handles mentions across multiple text nodes", () => {
    const decorations = getDecorations(ext, [
      makeTextNode("@alice "),
      makeTextNode("plain text "),
      makeTextNode("@bob@social.example.org done"),
    ]);
    expect(decorations).toHaveLength(2);
  });

  it("does not decorate a lone @ sign", () => {
    const decorations = getDecorations(ext, [makeTextNode("email me @ home")]);
    expect(decorations).toHaveLength(0);
  });

  it("skips non-text nodes", () => {
    const nonTextNode = { isText: false, text: undefined };
    const decorations = getDecorations(ext, [
      nonTextNode,
      makeTextNode("@alice"),
    ]);
    // Only the text node should produce a decoration
    expect(decorations).toHaveLength(1);
  });

  it("correctly positions decorations when mention is not at the start of the node", () => {
    // pos=1, match index=4 → from=5, "@bob" length=4 → to=9
    const decorations = getDecorations(ext, [makeTextNode("hey @bob!")]);
    expect(decorations[0].from).toBe(5);
    expect(decorations[0].to).toBe(9);
  });
});
