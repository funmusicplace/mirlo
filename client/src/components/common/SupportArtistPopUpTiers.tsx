import styled from "@emotion/styled";
import { forwardRef } from "react";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FaCheck } from "react-icons/fa";

import { InputEl } from "./Input";
import { moneyDisplay } from "./Money";

const Label = styled.label`
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  border-radius: 8px;

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
  transition:
    0.5s background-color,
    0.5s border-color;

  &:has(input[type="radio"]:checked) {
    background-color: var(--mi-button-color);
    border-color: var(--mi-button-color);

    label {
      color: var(--mi-button-text-color);
      font-weight: 600;
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
              id={`input-tier-${tier.id}`}
              className="sr-only"
              checked={currentValue?.id === tier.id}
              ref={ref}
              onChange={() => {
                methods.setValue("tier", tier);
              }}
              {...props}
            />
            <Label
              htmlFor={`input-tier-${tier.id}`}
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
              {currentValue?.id === tier.id && (
                <FaCheck aria-hidden className="self-center shrink-0 ml-2" />
              )}
            </Label>
          </ListItem>
        );
      })}
    </List>
  );
});

export default SupportArtistPopUpTiers;
