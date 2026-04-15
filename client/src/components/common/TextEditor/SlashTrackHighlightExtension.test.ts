import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Minimal stubs for @remirror/core ────────────────────────────────────────
vi.mock("@remirror/core", () => {
  class PlainExtension {
    static defaultOptions = {};
    private _options: Record<string, unknown>;
    constructor(options: Record<string, unknown> = {}) {
      this._options = options;
    }
    get options(): Record<string, unknown> {
      return this._options;
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

import { SlashCommandHighlightExtension } from "./SlashTrackHighlightExtension";

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
        let pos = 1;
        for (const node of nodes) {
          cb(node, pos);
          if (node.text) pos += node.text.length;
        }
      },
    },
  };
}

function makeExt(triggers: string[]): SlashCommandHighlightExtension {
  // The extension reads `this.options.triggers` from PlainExtension.
  // We pass options directly via the constructor shim.
  const ext = new SlashCommandHighlightExtension();
  // Override the options getter on the instance to supply triggers.
  Object.defineProperty(ext, "options", { get: () => ({ triggers }) });
  return ext;
}

function getDecorations(
  ext: SlashCommandHighlightExtension,
  nodes: Array<{ isText: boolean; text?: string }>
): MockDecoration[] {
  const plugin = ext.createPlugin() as {
    props: { decorations?: (state: unknown) => MockDecorationSet };
  };
  return (plugin.props.decorations!(makeState(nodes)) as MockDecorationSet)
    .decorations;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("SlashCommandHighlightExtension", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has the correct extension name", () => {
    const ext = makeExt([]);
    expect(ext.name).toBe("slashCommandHighlight");
  });

  it("returns no decorations when triggers list is empty", () => {
    const ext = makeExt([]);
    const decorations = getDecorations(ext, [makeTextNode("/track some-slug")]);
    expect(decorations).toHaveLength(0);
  });

  it("returns no decorations when text has no slash commands", () => {
    const ext = makeExt(["track", "artist"]);
    const decorations = getDecorations(ext, [
      makeTextNode("Just some plain text."),
    ]);
    expect(decorations).toHaveLength(0);
  });

  it("creates a decoration for a matching slash command with a value", () => {
    const ext = makeExt(["track"]);
    // pos=1, "/track slug" starts at index 0 → from=1, length=11 → to=12
    const decorations = getDecorations(ext, [makeTextNode("/track slug")]);
    expect(decorations).toHaveLength(1);
    expect(decorations[0].attrs.class).toBe("slash-command-highlight");
    expect(decorations[0].from).toBe(1);
    expect(decorations[0].to).toBe(12);
  });

  it("does not decorate an unrecognised slash command", () => {
    const ext = makeExt(["track"]);
    const decorations = getDecorations(ext, [
      makeTextNode("/artist some-slug"),
    ]);
    expect(decorations).toHaveLength(0);
  });

  it("decorates all configured triggers", () => {
    const ext = makeExt(["track", "artist", "playlist"]);
    const decorations = getDecorations(ext, [
      makeTextNode("/track t1 /artist a1 /playlist p1"),
    ]);
    expect(decorations).toHaveLength(3);
    expect(
      decorations.every((d) => d.attrs.class === "slash-command-highlight")
    ).toBe(true);
  });

  it("does not decorate a slash command that has no value after it", () => {
    // pattern requires \\s+\\S* so a bare /track with nothing after should not match
    const ext = makeExt(["track"]);
    const decorations = getDecorations(ext, [makeTextNode("/track")]);
    expect(decorations).toHaveLength(0);
  });

  it("handles slash commands across multiple text nodes", () => {
    const ext = makeExt(["track", "artist"]);
    const decorations = getDecorations(ext, [
      makeTextNode("/track foo "),
      makeTextNode("some text "),
      makeTextNode("/artist bar"),
    ]);
    expect(decorations).toHaveLength(2);
  });

  it("skips non-text nodes", () => {
    const ext = makeExt(["track"]);
    const nonTextNode = { isText: false as const, text: undefined };
    const decorations = getDecorations(ext, [
      nonTextNode,
      makeTextNode("/track slug"),
    ]);
    expect(decorations).toHaveLength(1);
  });

  it("correctly positions a decoration that does not start at the beginning of a node", () => {
    const ext = makeExt(["track"]);
    // pos=1, text="hey /track slug", match at index 4
    // from = 1 + 4 = 5, "/track slug" length = 11, to = 16
    const decorations = getDecorations(ext, [makeTextNode("hey /track slug")]);
    expect(decorations).toHaveLength(1);
    expect(decorations[0].from).toBe(5);
    expect(decorations[0].to).toBe(16);
  });
});
