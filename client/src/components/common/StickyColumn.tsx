import styled from "@emotion/styled";
import React from "react";
import useShow from "utils/useShow";

import { bp } from "../../constants";

const StickyWrapper = styled.div<{ headerHidden: boolean }>`
  position: sticky;
  top: min(
    ${(props) =>
      props.headerHidden
        ? "1rem"
        : "calc(var(--header-cover-sticky-height) + 1rem)"},
    calc(100dvh - var(--sticky-column-height, 0px) - 1rem)
  );
  transition: top 0.4s ease-out;

  @media screen and (max-width: ${bp.small}px) {
    display: contents;
  }
`;

const StickyColumn: React.FC<React.PropsWithChildren> = ({ children }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const headerShow = useShow();

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      el.style.setProperty("--sticky-column-height", `${el.offsetHeight}px`);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <StickyWrapper ref={ref} headerHidden={headerShow === "down"}>
      {children}
    </StickyWrapper>
  );
};

export default StickyColumn;
