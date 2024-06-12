import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";
import { useFormContext } from "react-hook-form";
import { UpdateArtistBody, useUpdateArtistMutation } from "queries";
import React from "react";
import { useAuthContext } from "state/AuthContext";
import { css } from "@emotion/css";

const ColorSquare = styled.span<{ color: string }>`
  display: inline-block;
  width: 1.5rem;
  height: 1.5rem;
  background-color: ${(props) => props.color};
  border-radius: 0.2rem;
  margin-left: 0.5rem;
  border: 1px solid var(--mi-lighter-background-color);
`;

const ColorLabel = styled.label`
  background-color: 1px solid var(--mi-light-background-color);
  padding: 0.5rem;
  cursor: pointer;

  input[type="radio"] {
    margin-right: 0.25rem;
  }

  span {
    display: inline-flex;
    align-items: center;
  }
`;

const ThemeRadio: React.FC<{
  value: "light" | "dark";
  text: "lightTheme" | "darkTheme";
  colors: { color: string; title: string }[];
}> = ({ colors, text, value }) => {
  const { t } = useTranslation("translation", { keyPrefix: "welcome" });
  const { register } = useFormContext();

  return (
    <ColorLabel>
      <input type="radio" value={value} {...register("theme")} />
      <span>
        {t(text)}

        <span>
          {colors.map((color) => (
            <ColorSquare
              key={color.title}
              color={color.color}
              title={color.title}
            />
          ))}
        </span>
      </span>
    </ColorLabel>
  );
};

const lightTheme = [
  { color: "#111", title: "main button color", key: "primary" },
  { color: "#ffc0cb", title: "secondary button color", key: "secondary" },
  { color: "#f5f0f0", title: "background color", key: "background" },
  { color: "#111", title: "text color", key: "foreground" },
];

const darkTheme = [
  { color: "#fff", title: "main button color", key: "primary" },
  { color: "#be3455", title: "secondary button color", key: "secondary" },
  { color: "#111", title: "background color", key: "background" },
  { color: "#fff", title: "text color", key: "foreground" },
];

const ChooseYourTheme: React.FC<{ artistId: number }> = ({ artistId }) => {
  const { t } = useTranslation("translation", { keyPrefix: "welcome" });

  const { watch } = useFormContext();
  const { mutateAsync: updateArtist } = useUpdateArtistMutation();
  const { user } = useAuthContext();
  const themeValue = watch("theme");

  const updateColorOnChange = React.useCallback(async (theme: string) => {
    try {
      if (theme && user && artistId) {
        const newTheme = theme === "dark" ? darkTheme : lightTheme;
        const colors = newTheme.reduce(
          (aggr, v) => ({ ...aggr, [v.key]: v.color }),
          {
            primary: "",
            secondary: "",
            background: "",
            foreground: "",
          }
        );

        await updateArtist({
          userId: user.id,
          artistId,
          body: {
            properties: {
              colors,
            },
          },
        });
      }
    } catch (e) {}
  }, []);

  React.useEffect(() => {
    updateColorOnChange(themeValue);
  }, [themeValue]);

  return (
    <>
      <label>{t("chooseYourStarterTheme")}</label>
      <ThemeRadio text="darkTheme" value="dark" colors={darkTheme} />
      <ThemeRadio value="light" text="lightTheme" colors={lightTheme} />
      <small>{t("youCanCustomizeThisLater")}</small>
    </>
  );
};

export default ChooseYourTheme;
