import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, test, vi } from "vitest";

import PoliciesSection from "./PoliciesSection";
import contentPolicyTemplate from "./policyTemplates/contentPolicy.md?raw";
import cookiePolicyTemplate from "./policyTemplates/cookiePolicy.md?raw";
import privacyPolicyTemplate from "./policyTemplates/privacyPolicy.md?raw";
import termsTemplate from "./policyTemplates/terms.md?raw";
import { FormSettings } from "./settingsForm";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const renderSection = (defaultValues: FormSettings) => {
  const Wrapper = () => {
    const methods = useForm<FormSettings>({ defaultValues });
    return (
      <FormProvider {...methods}>
        <PoliciesSection />
      </FormProvider>
    );
  };
  return render(<Wrapper />);
};

describe("PoliciesSection", () => {
  test("fills an empty policy from its template with the instance details", async () => {
    renderSection({
      terms: "",
      privacyPolicy: "Our own.",
      cookiePolicy: "Our own.",
      contentPolicy: "Our own.",
      instanceCustomization: {
        title: "Nightjar",
        supportEmail: "hello@nightjar.test",
      },
    });

    expect(screen.getByText("termsTemplateLicense")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "startFromTemplate" })
    );

    const terms = screen.getByLabelText("termsMarkdown") as HTMLTextAreaElement;
    expect(terms.value).toContain("Nightjar");
    expect(terms.value).toContain("hello@nightjar.test");
    expect(terms.value).not.toContain("{{");
    expect(terms).toHaveFocus();
    expect(
      screen.queryByRole("button", { name: "startFromTemplate" })
    ).not.toBeInTheDocument();
  });

  test("inserts an instance name containing $ patterns as typed", async () => {
    renderSection({
      terms: "",
      privacyPolicy: "Our own.",
      cookiePolicy: "Our own.",
      contentPolicy: "Our own.",
      instanceCustomization: { title: "Cash$$Club $&" },
    });

    await userEvent.click(
      screen.getByRole("button", { name: "startFromTemplate" })
    );

    const terms = screen.getByLabelText("termsMarkdown") as HTMLTextAreaElement;
    expect(terms.value).toContain("Cash$$Club $&");
  });

  test("leaves placeholders when no instance name or contact email is set", async () => {
    renderSection({
      terms: "",
      privacyPolicy: "Our own.",
      cookiePolicy: "Our own.",
      contentPolicy: "Our own.",
      instanceCustomization: { title: "" },
    });

    await userEvent.click(
      screen.getByRole("button", { name: "startFromTemplate" })
    );

    const terms = screen.getByLabelText("termsMarkdown") as HTMLTextAreaElement;
    expect(terms.value).toContain("[INSTANCE NAME]");
    expect(terms.value).toContain("[CONTACT EMAIL]");
  });

  test("warns about bracketed placeholders until they are all filled in", async () => {
    renderSection({
      terms: "",
      privacyPolicy: "Our own.",
      cookiePolicy: "Our own.",
      contentPolicy: "Our own.",
      instanceCustomization: {
        title: "Nightjar",
        supportEmail: "hello@nightjar.test",
      },
    });

    expect(screen.queryByText("templateBracketsHint")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "startFromTemplate" })
    );

    const terms = screen.getByLabelText("termsMarkdown");
    expect(terms).toHaveAccessibleDescription("templateBracketsHint");

    fireEvent.change(terms, { target: { value: "Our own terms." } });
    expect(screen.queryByText("templateBracketsHint")).not.toBeInTheDocument();
  });

  test("recognizes every bracketed placeholder used in the templates", () => {
    renderSection({
      terms: "Our own terms.",
      privacyPolicy: "Our own.",
      cookiePolicy: "Our own.",
      contentPolicy: "Our own.",
    });
    const placeholders = new Set(
      [
        termsTemplate,
        privacyPolicyTemplate,
        cookiePolicyTemplate,
        contentPolicyTemplate,
      ]
        .join("\n")
        .match(/\[[A-Z][A-Z ]*\]/g)
    );
    const terms = screen.getByLabelText("termsMarkdown");

    expect(placeholders.size).toBeGreaterThan(0);
    placeholders.forEach((placeholder) => {
      fireEvent.change(terms, { target: { value: placeholder } });
      expect(terms).toHaveAccessibleDescription("templateBracketsHint");
    });
  });

  test("offers no template for a policy that already has text", () => {
    renderSection({
      terms: "Our own terms.",
      privacyPolicy: "Our own.",
      cookiePolicy: "Our own.",
      contentPolicy: "Our own.",
    });

    expect(
      screen.queryByRole("button", { name: "startFromTemplate" })
    ).not.toBeInTheDocument();
  });

  test("offers a template for each policy that has one", () => {
    renderSection({
      terms: "",
      privacyPolicy: "",
      cookiePolicy: "",
      contentPolicy: "",
    });

    expect(
      screen.getAllByRole("button", { name: "startFromTemplate" })
    ).toHaveLength(4);
    expect(
      screen.getByText("privacyPolicyTemplateLicense")
    ).toBeInTheDocument();
  });
});
