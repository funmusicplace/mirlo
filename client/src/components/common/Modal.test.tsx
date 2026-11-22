import { render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import Modal from "./Modal";

const modal = (open: boolean) => (
  <Modal open={open} onClose={vi.fn()}>
    content
  </Modal>
);

describe("Modal", () => {
  test("a dialog that mounts closed leaves an open dialog's scroll lock alone", () => {
    const { rerender, unmount } = render(modal(true));
    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <>
        {modal(true)}
        {modal(false)}
      </>
    );
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("initial");
  });
});
