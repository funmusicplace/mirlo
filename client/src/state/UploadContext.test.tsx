import { act, renderHook } from "@testing-library/react";
import React from "react";
import api from "services/api";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { UploadContextProvider, useUpload } from "./UploadContext";

vi.mock("services/api", () => ({
  default: {
    uploadFile: vi.fn(),
    getMany: vi.fn(),
  },
}));

vi.mock("queries/instanceSettings", () => ({
  useInstanceSettings: () => ({ contactEmail: null }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const renderUpload = () =>
  renderHook(() => useUpload(), {
    wrapper: ({ children }) => (
      <UploadContextProvider>{children}</UploadContextProvider>
    ),
  });

const jobStatus = (jobId: string, status: string) =>
  vi
    .mocked(api.getMany)
    .mockResolvedValue({ results: [{ jobId, jobStatus: status }] } as any);

describe("UploadContext", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(api.uploadFile).mockReset();
    vi.mocked(api.getMany).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("uploads an enqueued image, shows it in the panel and completes it", async () => {
    vi.mocked(api.uploadFile).mockResolvedValue({
      result: { jobId: "7" },
    } as any);
    jobStatus("7", "completed");
    const onComplete = vi.fn();
    const { result } = renderUpload();
    const file = new File(["x"], "cover.png", { type: "image/png" });

    await act(async () => {
      result.current.enqueueImage({
        name: "Cover",
        endpoint: "manage/trackGroups/1/cover",
        file,
        onComplete,
      });
    });

    expect(api.uploadFile).toHaveBeenCalledWith("manage/trackGroups/1/cover", [
      file,
    ]);
    expect(result.current.imageQueue[0]?.status).toBe("active");
    expect(result.current.isActive).toBe(true);

    await act(() => vi.advanceTimersByTimeAsync(5000));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.imageQueue[0]?.status).toBe("completed");
  });

  test("tracks a job outside the panel and completes it", async () => {
    jobStatus("12", "completed");
    const onComplete = vi.fn();
    const onFailed = vi.fn();
    const { result } = renderUpload();

    act(() =>
      result.current.trackImageJob({
        key: "splashImage",
        jobId: "12",
        onComplete,
        onFailed,
      })
    );

    expect(result.current.trackedImageJobs).toEqual([
      { key: "splashImage", jobId: "12", file: undefined },
    ]);
    expect(result.current.isActive).toBe(false);

    await act(() => vi.advanceTimersByTimeAsync(5000));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onFailed).not.toHaveBeenCalled();
    expect(result.current.trackedImageJobs).toEqual([]);
  });

  test("reports a failed tracked job", async () => {
    jobStatus("13", "failed");
    const onComplete = vi.fn();
    const onFailed = vi.fn();
    const { result } = renderUpload();

    act(() =>
      result.current.trackImageJob({
        key: "splashImage",
        jobId: "13",
        onComplete,
        onFailed,
      })
    );
    await act(() => vi.advanceTimersByTimeAsync(5000));

    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
    expect(result.current.trackedImageJobs).toEqual([]);
  });

  test("stops tracking a job on request", () => {
    const { result } = renderUpload();

    act(() => result.current.trackImageJob({ key: "splashImage", jobId: "1" }));
    act(() => result.current.untrackImageJob("splashImage"));

    expect(result.current.trackedImageJobs).toEqual([]);
  });

  test("replaces a tracked job that has the same key", () => {
    const { result } = renderUpload();

    act(() => result.current.trackImageJob({ key: "splashImage", jobId: "1" }));
    act(() => result.current.trackImageJob({ key: "splashImage", jobId: "2" }));

    expect(result.current.trackedImageJobs).toEqual([
      { key: "splashImage", jobId: "2", file: undefined },
    ]);
  });
});
