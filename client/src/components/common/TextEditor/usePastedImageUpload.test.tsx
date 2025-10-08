import { renderHook, act } from "@testing-library/react";
import {
  vi,
  describe,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  expect,
  test,
} from "vitest";

import { usePastedImageUpload } from "./usePastedImageUpload";

vi.mock("services/api", () => ({
  default: {
    uploadFile: vi.fn(),
  },
}));

import api from "services/api";

class MockDoc {
  constructor(public readonly nodes: MockNode[]) {}

  descendants(
    callback: (node: { type: { name: string }; attrs: Record<string, unknown> }, pos: number) => void
  ): void {
    this.nodes.forEach((node, index) => {
      if (node.type === "image") {
        callback(
          {
            type: { name: "image" },
            attrs: { ...node.attrs },
          },
          index
        );
      }
    });
  }
}

class MockTransaction {
  private readonly replacements = new Map<number, Record<string, unknown>>();

  constructor(private readonly baseDoc: MockDoc) {}

  setNodeMarkup(
    pos: number,
    _type: unknown,
    attrs: Record<string, unknown>
  ): MockTransaction {
    this.replacements.set(pos, { ...attrs });
    return this;
  }

  apply(): MockState {
    const nodes = this.baseDoc.nodes.map((node, index) => {
      if (node.type === "image" && this.replacements.has(index)) {
        return {
          type: "image" as const,
          attrs: { ...node.attrs, ...this.replacements.get(index)! },
        } satisfies MockImageNode;
      }
      return node;
    });

    const doc = new MockDoc(nodes);
    return new MockState(doc);
  }
}

class MockState {
  constructor(public readonly doc: MockDoc) {}

  get tr(): MockTransaction {
    return new MockTransaction(this.doc);
  }
}

class MockView {
  public state: MockState;
  public readonly dom: HTMLDivElement;

  constructor(
    private readonly manager: ManagerLike,
    nodes: MockNode[]
  ) {
    this.state = new MockState(new MockDoc(nodes));
    this.dom = document.createElement("div");
    this.manager.view = this;
  }

  dispatch(tr: MockTransaction): void {
    const nextState = tr.apply?.();
    if (!nextState) {
      return;
    }

    this.state = nextState as MockState;
    this.manager.view = this;
  }

  updateNodes(nodes: MockNode[]): void {
    this.state = new MockState(new MockDoc(nodes));
    this.manager.view = this;
  }
}

const convertDocToHtml = (doc: MockDoc): string =>
  doc.nodes
    .map((node) => {
      if (node.type === "image") {
        return `<img src="${node.attrs.src}" />`;
      }
      if (node.type === "paragraph") {
        return `<p>${node.text ?? ""}</p>`;
      }
      return "";
    })
    .join("");

vi.mock("@remirror/core-utils", () => ({
  prosemirrorNodeToHtml: vi.fn((doc: unknown) => convertDocToHtml(doc as MockDoc)),
}));

type MockImageNode = {
  type: "image";
  attrs: { src: string } & Record<string, unknown>;
};

type MockParagraphNode = {
  type: "paragraph";
  text?: string;
};

type MockNode = MockImageNode | MockParagraphNode;

type ManagerLike = { view: MockView | null };

type TestEditor = {
  manager: ManagerLike;
  view: MockView;
  destroy: () => void;
};

const DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAuMBg3X9f88AAAAASUVORK5CYII=";

const createTestEditor = (nodes: MockNode[]): TestEditor => {
  const manager: ManagerLike = { view: null };
  const view = new MockView(manager, nodes);

  return {
    manager,
    view,
    destroy: () => {
      manager.view = null;
    },
  };
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("usePastedImageUpload", () => {
  let originalFetch: typeof fetch;
  let originalFile: typeof File | undefined;

  beforeAll(() => {
    originalFetch = global.fetch;
    originalFile = (global as { File?: typeof File }).File;

    if (!originalFile) {
      class PolyfillFile extends Blob {
        name: string;
        lastModified: number;

        constructor(parts: BlobPart[], fileName: string, options?: FilePropertyBag) {
          super(parts, options);
          this.name = fileName;
          this.lastModified = options?.lastModified ?? Date.now();
        }
      }

      (global as unknown as { File: typeof File }).File = PolyfillFile as unknown as typeof File;
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  afterAll(() => {
    if (originalFile) {
      (global as unknown as { File: typeof File }).File = originalFile;
    } else {
      delete (global as { File?: typeof File }).File;
    }
  });

  const setupFetchMock = () => {
    const response = new Response(new Blob(["test"], { type: "image/png" }));
    const fetchMock = vi.fn(async () => response.clone());
    global.fetch = fetchMock as typeof fetch;
    return fetchMock;
  };

  const removeImageFromView = (view: MockView, src: string) => {
    const filteredNodes = view.state.doc.nodes.filter((node) =>
      node.type === "image" ? node.attrs.src !== src : true
    );
    view.updateNodes(filteredNodes);
  };

  const appendParagraph = (view: MockView, text: string) => {
    view.updateNodes([...view.state.doc.nodes, { type: "paragraph", text }]);
  };

  test("skips replacements when the image is removed before upload completes", async () => {
    const { manager, view, destroy } = createTestEditor([
      { type: "paragraph", text: "start" },
      { type: "image", attrs: { src: DATA_URI } },
    ]);
    const setState = vi.fn();
    const onChange = vi.fn();
    const reloadImages = vi.fn();
    const fetchMock = setupFetchMock();
    const deferred = createDeferred<{ result: { jobId: string; imageId: string } }>();

    vi.mocked(api.uploadFile).mockImplementation(() => deferred.promise);

    const { result, unmount } = renderHook(() =>
      usePastedImageUpload({
        manager,
        postId: 123,
        reloadImages,
        setState,
        onChange,
      })
    );

    const uploadPromise = result.current();

    await Promise.resolve();

    await act(async () => {
      removeImageFromView(view, DATA_URI);
    });

    deferred.resolve({ result: { jobId: "uploaded-src", imageId: "image-123" } });

    await act(async () => {
      await uploadPromise;
    });

    expect(fetchMock).toHaveBeenCalledWith(DATA_URI);
    expect(api.uploadFile).toHaveBeenCalledWith("manage/posts/123/images", expect.any(Array));
    expect(onChange).not.toHaveBeenCalled();
    expect(setState).not.toHaveBeenCalled();
    expect(reloadImages).not.toHaveBeenCalled();

    unmount();
    destroy();
  });

  test("retains later edits while replacing image sources", async () => {
    const { manager, view, destroy } = createTestEditor([
      { type: "paragraph", text: "start" },
      { type: "image", attrs: { src: DATA_URI } },
    ]);
    const setState = vi.fn();
    const onChange = vi.fn();
    const reloadImages = vi.fn();
    const fetchMock = setupFetchMock();
    const deferred = createDeferred<{ result: { jobId: string; imageId: string } }>();

    vi.mocked(api.uploadFile).mockImplementation(() => deferred.promise);

    const { result, unmount } = renderHook(() =>
      usePastedImageUpload({
        manager,
        postId: 456,
        reloadImages,
        setState,
        onChange,
      })
    );

    const uploadPromise = result.current();

    await Promise.resolve();

    await act(async () => {
      appendParagraph(view, "later edit");
    });

    deferred.resolve({ result: { jobId: "hosted-image", imageId: "image-456" } });

    await act(async () => {
      await uploadPromise;
    });

    expect(fetchMock).toHaveBeenCalledWith(DATA_URI);
    expect(api.uploadFile).toHaveBeenCalledWith("manage/posts/456/images", expect.any(Array));
    expect(onChange).toHaveBeenCalled();
    const latestHtml = onChange.mock.calls.at(-1)?.[0];
    expect(latestHtml).toContain("later edit");
    expect(latestHtml).toContain("hosted-image");
    expect(latestHtml).not.toContain(DATA_URI);
    expect(setState).toHaveBeenCalled();
    expect(reloadImages).toHaveBeenCalledTimes(1);

    unmount();
    destroy();
  });
});
