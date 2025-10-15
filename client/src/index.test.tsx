import { expect, test, vi } from "vitest";

const renderMock = vi.fn();
const createRootMock = vi.fn(() => ({ render: renderMock }));

vi.mock("react-dom/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom/client")>();

  return {
    ...actual,
    createRoot: createRootMock,
    default: {
      ...actual,
      createRoot: createRootMock,
    },
  };
});

test("bootstraps the application", async () => {
  const root = document.createElement("div");
  root.id = "root";
  document.body.appendChild(root);

  await import("./index");

  expect(createRootMock).toHaveBeenCalledWith(root);
  expect(renderMock).toHaveBeenCalledTimes(1);
  expect(renderMock.mock.calls[0][0]).toBeTruthy();
});
