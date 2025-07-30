import styled from "@emotion/styled";
import { InputEl } from "./Input";
import { useFormContext } from "react-hook-form";
import { forwardRef } from "react";
import { moneyDisplay } from "./Money";
import { useTranslation } from "react-i18next";
import { useGetArtistColors } from "components/Artist/ArtistButtons";

const Label = styled.label<{ colors?: ArtistColors }>`
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

const ListItem = styled.li<{ colors?: ArtistColors }>`
  input[type="radio"] {
    display: none;
  }

  input[type="radio"]:checked + label {
    background-color: ${(props) =>
      props.colors?.background ?? "var(--mi-background-color)"};
    color: ${(props) =>
      props.colors?.foreground ?? "var(--mi-foreground-color)"};
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

  const { colors } = useGetArtistColors();

  return (
    <List>
      {options.map((tier) => {
        return (
          <ListItem key={tier.id} colors={colors}>
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
              colors={colors}
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
