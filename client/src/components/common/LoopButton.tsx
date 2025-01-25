import React from "react";
import { css } from "@emotion/css";

import { RxLoop } from "react-icons/rx";
import { GlobalState, useGlobalStateContext } from "state/GlobalState";
import styled from "@emotion/styled";
import Button from "./Button";

const LoopingIndicator = styled.span`
  position: absolute;
  font-size: 0.5rem;
  line-height: 0.5rem;
  font-weight: bold;
  padding: 0.15rem 0.25rem;
  background-color: var(--mi-secondary-color);
  border-radius: 100%;
  color: var(--mi-primary-color);
  top: 0.2rem;
  right: 0.2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 0.8rem;
  height: 0.8rem;
`;

export const LoopButton: React.FC = () => {
  const {
    state: { looping },
    dispatch,
  } = useGlobalStateContext();

  const onLoop = React.useCallback(() => {
    let nextLooping: GlobalState["looping"] = undefined;
    if (looping === undefined) {
      nextLooping = "loopTrack";
    } else if (looping === "loopTrack") {
      nextLooping = "loopQueue";
    }
    dispatch({ type: "setLooping", looping: nextLooping });
  }, [dispatch, looping]);

  return (
    <Button
      buttonRole={looping ? "secondary" : undefined}
      variant={looping ? "default" : "outlined"}
      onClick={onLoop}
      startIcon={
        <>
          <RxLoop />
          {looping === "loopTrack" && <LoopingIndicator>1</LoopingIndicator>}
        </>
      }
      className={css`
        margin-left: 0.25rem;
        position: relative;
        ${looping ? "color: var(--mi-link-color) !important;" : ""}
      `}
    />
  );
};

export default LoopButton;
