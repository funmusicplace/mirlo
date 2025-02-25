import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { ArtistButton } from "components/Artist/ArtistButtons";
import Modal from "components/common/Modal";
import Pill from "components/common/Pill";
import { queryArtist } from "queries";
import React from "react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { IoHelp } from "react-icons/io5";
import { useParams } from "react-router-dom";
import api from "services/api";

const PaymentSlider: React.FC<{
  url: string;
  extraData: { artistId: number };
}> = ({ url, extraData }) => {
  const { artistId } = useParams();
  const { t } = useTranslation("translation", { keyPrefix: "platformSlider" });
  const [isOpen, setIsInfoOpen] = React.useState(false);

  const { data: artist } = useQuery(
    queryArtist({ artistSlug: artistId ?? "" })
  );
  const methods = useFormContext();
  const current = methods.watch("platformPercent");

  const onBlur = React.useCallback(async () => {
    try {
      await api.put<unknown, unknown>(url, {
        ...extraData,
        platformPercent: Number(current),
      });
    } catch (e) {
      console.error(e);
    }
  }, [extraData, current]);

  return (
    <div
      className={css`
        width: 100%;
      `}
    >
      <input
        type="range"
        step="1"
        {...methods.register("platformPercent")}
        onMouseUp={onBlur}
        className={css`.
  -webkit-appearance: none;
  width: 100%;
  height: 15px;
  border-radius: 5px;  
  background: #d3d3d3;
  outline: none;
  opacity: 0.7;
  -webkit-transition: .2s;
  transition: opacity .2s;
  margin-top: .7rem;

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
  }`}
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
            {current >= 0 && current < 5 && t("solidarity")}
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
            title="How much goes to Mirlo?"
            onClose={() => setIsInfoOpen(false)}
            className={css`
              p {
                margin-bottom: 1rem;
              }
            `}
          >
            <p>{t("howMuchModalText")}</p>
            <p>
              If you're having trouble deciding on a rate, you can use{" "}
              <a href="https://aorta.coop/public-program-rates">
                this sliding scale calculator
              </a>{" "}
              for individuals provided by the Aorta Co-operative.
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
              <tr>
                <td>0%</td>
                <td>Solidarity</td>
                <td>You need the money.</td>
              </tr>
              <tr>
                <td>5%</td>
                <td>Sustain</td>
                <td>You can pitch in some.</td>
              </tr>
              <tr>
                <td>7%</td>
                <td>Full cost</td>
                <td>Best estimate to cover all our work.</td>
              </tr>
              <tr>
                <td>15%</td>
                <td>Full cost</td>
                <td>
                  You really want to see Mirlo succeed and you can afford it.
                </td>
              </tr>
            </table>
            <p>
              Curious about how Mirlo uses money? We post quarterly financial
              statements{" "}
              <a href="https://mirlo.space/manage/artists/21/posts?tag=finances">
                on our blog
              </a>
              .
            </p>
          </Modal>
        </div>
      </div>
    </div>
  );
};

export default PaymentSlider;
