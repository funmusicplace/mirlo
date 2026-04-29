import styled from "@emotion/styled";
import { forwardRef } from "react";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { InputEl } from "./Input";
import { moneyDisplay } from "./Money";

const Label = styled.label`
  display: block;
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  border: 1px solid var(--mi-darken-x-background-color);
  margin-bottom: 0.1rem;

  transition: 0.5s background-color;
  cursor: pointer;

  div {
    display: flex;
    flex-direction: column;
    strong {
      margin-bottom: 0.5rem;
    }
  }
`;

const List = styled.ul`
  margin-bottom: 1rem;
  list-style: none;
`;

const ListItem = styled.li`
  border-radius: 8px;
  margin-bottom: 0.5rem;
  border: 1px solid var(--mi-button-color);

  input[type="radio"] {
    display: none;
  }

  input[type="radio"]:checked + label {
    background-color: var(--mi-background-color);
    color: var(--mi-text-color);
    &:after {
      content: "✔";
    }
  }
`;

const SupportArtistPopUpTiers = forwardRef<
  HTMLInputElement,
  {
    options: ArtistSubscriptionTier[];
  }
>(function ({ options, ...props }, ref) {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const methods = useFormContext();
  const currentValue: undefined | ArtistSubscriptionTier =
    methods.watch("tier");

  React.useEffect(() => {
    if (options.length === 1) {
      methods.setValue("tier", options[0]);
    }
  });

  return (
    <List>
      {options.map((tier) => {
        return (
          <ListItem key={tier.id}>
            <InputEl
              type="radio"
              id={`${tier.id}`}
              checked={currentValue?.id === tier.id}
              ref={ref}
              onChange={() => {
                methods.setValue("tier", tier);
              }}
              {...props}
            />
            <Label
              htmlFor={"checkbox-" + tier.id}
              onClick={() => {
                methods.setValue("tier", tier);
              }}
            >
              <div>
                <strong>
                  {tier.name === "follow" ? (
                    t("justFollow")
                  ) : (
                    <>{tier.name}: </>
                  )}
                  {tier.minAmount
                    ? t("tierMonthly", {
                        amount: moneyDisplay({
                          amount: tier.minAmount ? tier.minAmount / 100 : 0,
                          currency: tier.currency,
                        }),
                        interval:
                          tier.interval === "MONTH"
                            ? t("monthly")
                            : t("yearly"),
                      })
                    : ""}
                </strong>
                <p>{tier.description}</p>
              </div>
            </Label>
          </ListItem>
        );
      })}
    </List>
  );
});

export default SupportArtistPopUpTiers;
