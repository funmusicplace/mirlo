import { render, screen } from "@testing-library/react";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, test, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("components/common/LazyIframe", () => ({
  default: (props: any) => <div title={props.title} data-src={props.src} />,
}));

import FundraiserVideoField from "./FundraiserVideoField";

const renderField = (videoUrl: string, videoEmbedUrl?: string | null) => {
  const Wrapper = () => {
    const methods = useForm({
      defaultValues: { fundraiserVideoUrl: videoUrl },
    });
    return (
      <FormProvider {...methods}>
        <FundraiserVideoField videoEmbedUrl={videoEmbedUrl} />
      </FormProvider>
    );
  };
  return render(<Wrapper />);
};

describe("FundraiserVideoField", () => {
  test("shows the pasted link and a preview of the saved video", () => {
    renderField(
      "https://youtu.be/aqz-KE-bpKQ",
      "https://www.youtube.com/embed/aqz-KE-bpKQ"
    );
    expect(screen.getByLabelText("videoUrl")).toHaveValue(
      "https://youtu.be/aqz-KE-bpKQ"
    );
    expect(screen.getByTitle("videoPreview")).toHaveAttribute(
      "data-src",
      "https://www.youtube.com/embed/aqz-KE-bpKQ"
    );
  });

  test("leaves out the preview when there's no saved video", () => {
    renderField("", null);
    expect(screen.getByLabelText("videoUrl")).toHaveValue("");
    expect(screen.queryByTitle("videoPreview")).not.toBeInTheDocument();
  });
});
