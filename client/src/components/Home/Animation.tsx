import { css } from "@emotion/css";
import { random, sample } from "lodash";

const colors = [
  "var(--mi-primary-color)",
  // "var(--mi-normal-background-color)",
  "#12AAE0",
  "#E0D412",
];

const fills = [...colors, "url(#diagonalHatch)"];

const paths = [
  // `m 0 0 C 30 0 91 -25 124 -12 S 170 8 214 -1 Q 267 -7 300 0 L 300 5 C 271 5 219 7 204 9 S 165 8 136 -3 S 68 -6 54 -3 S 33 4 0 5`,
  `m 0 0 c 30 0 91 -25 124 -12 s 46 20 90 11 q 53 -6 86 8 C 229 -3 219 7 204 9 S 165 8 136 -3 S 68 -6 54 -3 S 33 4 0 0`,
  `m 0 0 c 30 0 91 -25 125 -19 s 46 20 90 11 q 53 -6 86 8 C 229 -3 230 9 205 11 S 171 11 136 -3 S 85 5 53 5 S 33 4 0 0 `,
  `m 0 0 c 30 0 91 -25 125 -19 s 46 20 88 18 q 53 -6 85 1 C 298 0 269 1 256 7 C 235 17 229 20 205 20 S 171 11 136 5 S 87 8 57 9 S 33 4 0 0`,
  `m 0 0 c 30 0 91 -25 125 -19 s 46 20 90 11 q 53 -6 86 8 C 229 -3 230 9 205 11 S 171 11 136 -3 S 85 5 53 5 S 33 4 0 0 `,
];

const Wave: React.FC<{
  path: string;
  translateY: string;
  scaleY: string;
  animationSpeed: string;
  animationDelay: string;
  color: string;
}> = ({ path, translateY, scaleY, animationSpeed, animationDelay, color }) => {
  return (
    <>
      <g
        className={css`
          transform: translateY(${translateY}) scaleY(${scaleY});

          path {
            fill: ${color};

            &:first-child {
              animation: move-forever ${animationSpeed} linear infinite;
              animation-delay: ${animationDelay};
            }
            &:last-child {
              animation: move-forever ${animationSpeed} linear infinite;
              animation-delay: ${animationDelay};
            }
          }

          @keyframes move-forever {
            0% {
              transform: translateX(-300px);
            }
            100% {
              transform: translateX(100px);
            }
          }

          @keyframes other-forever {
            0% {
              transform: translateX(-290px);
            }
            100% {
              transform: translateX(100px);
            }
          }
        `}
      >
        <path d={path} />
      </g>
    </>
  );
};

const Animation: React.FC = () => {
  return (
    <div
      className={css`
        position: absolute;
        height: 100%;
        width: 100%;
        z-index: -1;
      `}
    >
      <svg
        className="editorial"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <pattern
          id="diagonalHatch"
          patternUnits="userSpaceOnUse"
          width="4"
          height="4"
        >
          <path
            d="M-1,1 l2,-2
           M0,4 l4,-4
           M3,5 l2,-2"
            style={{ stroke: colors[0], strokeWidth: 1 }}
          />
        </pattern>

        <Wave
          path={paths[0]}
          translateY="0px"
          scaleY=".5"
          animationSpeed="120s"
          animationDelay="-15s"
          color={fills[0]}
        />
        <Wave
          path={paths[1]}
          translateY="10px"
          scaleY=".5"
          animationSpeed="100s"
          animationDelay="-35s"
          color={fills[1]}
        />
        <Wave
          path={paths[2]}
          translateY="60px"
          scaleY=".5"
          animationSpeed="120s"
          animationDelay="-15s"
          color={fills[2]}
        />
        <Wave
          path={paths[3]}
          translateY="50px"
          scaleY=".5"
          animationSpeed="120s"
          animationDelay="-40s"
          color={fills[3]}
        />
        <Wave
          path={paths[0]}
          translateY="0px"
          scaleY=".5"
          animationSpeed="120s"
          animationDelay="-15s"
          color={fills[0]}
        />
      </svg>
    </div>
  );
};

export default Animation;
