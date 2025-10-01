import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import Modal from "components/common/Modal";
import Pill from "components/common/Pill";
import { queryArtist } from "queries";
import React from "react";
import { useFormContext } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { IoHelp } from "react-icons/io5";
import { useParams } from "react-router-dom";
import api from "services/api";

const PaymentSlider: React.FC<{
  url: string;
  keyName?: string;
  extraData?: { artistId: number };
}> = ({ url, extraData, keyName = "platformPercent" }) => {
  const { artistId } = useParams();
  const { t } = useTranslation("translation", { keyPrefix: "platformSlider" });
  const [isOpen, setIsInfoOpen] = React.useState(false);

  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );
  const methods = useFormContext();
  const current = methods.watch(keyName);

  const onBlur = React.useCallback(async () => {
    try {
      await api.put<unknown, unknown>(url, {
        ...extraData,
        [keyName]: Number(current),
      });
    } catch (e) {
      console.error(e);
    }
  }, [current, extraData, url]);

  const modalRows = React.useMemo(() => {
    const tiers = [
      "solidarity",
      "sustain",
      "fullCost",
      "redistribution",
    ] as const;

    return tiers.map((tier) => {
      const keySuffix = `${tier.charAt(0).toUpperCase()}${tier.slice(1)}`;

      return {
        key: tier,
        percent: t(`howMuchModalRow${keySuffix}Percent`),
        label: t(`howMuchModalRow${keySuffix}Label`),
        description: t(`howMuchModalRow${keySuffix}Description`),
      };
    });
  }, [t]);

  return (
    <div
      className={css`
        width: 100%;
      `}
    >
      <input
        type="range"
        step="1"
        min={0}
        {...methods.register(keyName)}
        onMouseUp={onBlur}
        className={css`
          -webkit-appearance: none;
          width: 100%;
          max-width: 300px;
          height: 15px;
          border-radius: 5px;
          background: #d3d3d3;
          outline: none;
          opacity: 0.7;
          -webkit-transition: 0.2s;
          transition: opacity 0.2s;
          margin-top: 0.7rem;

          &::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            background: ${artist?.properties?.colors.primary};
            cursor: pointer;
          }

          &::-moz-range-thumb {
            width: 25px;
            height: 25px;
            border-radius: 50%;
            background: ${artist?.properties?.colors.primary};
            cursor: pointer;
          }
        `}
      />
      <div
        className={css`
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;

          > div {
            display: flex;

            button {
              margin-left: 0.5rem;
            }
          }
        `}
      >
        {t("platformCut", { percent: current })}
        <div>
          <Pill>
            {current == 0 && t("none")}
            {current > 0 && current < 5 && t("solidarity")}
            {current >= 5 && current < 10 && t("sustain")}
            {current >= 10 && current < 15 && t("fullCost")}
            {current >= 15 && t("redistribution")}
          </Pill>
          <ArtistButton
            startIcon={<IoHelp />}
            type="button"
            onClick={() => setIsInfoOpen(true)}
          />
          <Modal
            size="small"
            open={isOpen}
            title={t("howMuchGoesToMirlo")}
            onClose={() => setIsInfoOpen(false)}
            className={css`
              p {
                margin-bottom: 1rem;
              }
            `}
          >
            <p>{t("howMuchModalText")}</p>
            <p>
              <Trans
                t={t}
                i18nKey="howMuchModalCalculator"
                components={{
                  link: (
                    <a
                      href="https://aorta.coop/public-program-rates"
                      target="_blank"
                      rel="noreferrer"
                    />
                  ),
                }}
              />
            </p>
            <table
              className={css`
                width: 100%;
                margin-top: 1rem;
                border-collapse: collapse;
                td {
                  padding: 0.5rem;
                }

                td:nth-of-type(1) {
                  width: 2rem;
                  text-align: right;
                  border-right: var(--mi-darken-x-background-color) 1px solid;
                }

                td:nth-of-type(2) {
                  width: 75px;
                  border-right: var(--mi-darken-x-background-color) 1px solid;
                }
              `}
            >
              <tbody>
                {modalRows.map((row) => (
                  <tr key={row.key}>
                    <td>{row.percent}</td>
                    <td>{row.label}</td>
                    <td>{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              <Trans
                t={t}
                i18nKey="howMuchModalFinances"
                components={{
                  link: (
                    <a
                      href="https://mirlo.space/team/posts?tag=finances"
                      target="_blank"
                      rel="noreferrer"
                    />
                  ),
                }}
              />
            </p>
          </Modal>
        </div>
      </div>
    </div>
  );
};

export default PaymentSlider;
