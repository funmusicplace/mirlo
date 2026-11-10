import { describe, expect, test } from "vitest";

import {
  formDataToFundraiserUpdate,
  fundraiserToFormData,
} from "./fundraiserFormData";

describe("fundraiserFormData", () => {
  test("shows amounts in whole currency units and leaves unset ones blank", () => {
    expect(
      fundraiserToFormData({
        name: "New van",
        description: null,
        goalAmount: 250050,
        minPledge: 0,
        isAllOrNothing: true,
      })
    ).toEqual({
      fundraiserName: "New van",
      fundraiserDescription: "",
      goalAmount: "2500.5",
      fundraiserMinPledge: "",
      isAllOrNothing: true,
      fundraiserEndDate: "",
    });
  });

  test("sends amounts in cents, treating blanks as zero", () => {
    expect(
      formDataToFundraiserUpdate({
        fundraiserName: "New van",
        fundraiserDescription: "Wheels",
        goalAmount: "19.99",
        fundraiserMinPledge: "",
        isAllOrNothing: false,
      })
    ).toEqual({
      name: "New van",
      description: "Wheels",
      goalAmount: 1999,
      minPledge: 0,
      endDate: null,
      isAllOrNothing: false,
    });
  });

  test("ends a fundraiser at the end of the chosen day, and shows that day again", () => {
    const { endDate } = formDataToFundraiserUpdate({
      fundraiserEndDate: "2026-12-01",
    });
    expect(endDate).toBe(new Date(2026, 11, 1, 23, 59, 59).toISOString());
    expect(fundraiserToFormData({ endDate: endDate! }).fundraiserEndDate).toBe(
      "2026-12-01"
    );
  });

  test("leaves all-or-nothing alone when the checkbox was disabled", () => {
    expect(
      formDataToFundraiserUpdate({ isAllOrNothing: undefined }).isAllOrNothing
    ).toBeUndefined();
  });
});
