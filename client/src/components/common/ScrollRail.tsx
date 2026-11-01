import styled from "@emotion/styled";
import React from "react";
import { useTranslation } from "react-i18next";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useScrollOverflow } from "utils/useScrollOverflow";

import { bp } from "../../constants";

const RailList = styled.ul<{ itemWidth: string; mobileItemWidth: string }>`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: ${(props) => props.itemWidth};
  gap: 1rem;
  margin: -0.25rem;
  padding: 0.25rem;
  list-style: none;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  > li {
    min-width: 0;
    scroll-snap-align: start;
  }

  @media screen and (max-width: ${bp.small}px) {
    grid-auto-columns: ${(props) => props.mobileItemWidth};
    gap: 0.75rem;
  }
`;

const ArrowButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--mi-tint-xx-color);
  background: transparent;
  color: var(--mi-text-color);
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;

  svg {
    width: 0.7rem;
    height: 0.7rem;
  }

  &:hover:not([aria-disabled="true"]) {
    border-color: var(--mi-button-color);
    color: var(--mi-button-color);
  }

  &[aria-disabled="true"] {
    opacity: 0.3;
    cursor: default;
  }
`;

const ScrollRail: React.FC<
  React.PropsWithChildren<{
    title: React.ReactNode;
    headerAction?: React.ReactNode;
    itemWidth: string;
    mobileItemWidth: string;
    className?: string;
  }>
> = ({
  title,
  headerAction,
  itemWidth,
  mobileItemWidth,
  className,
  children,
}) => {
  const { t } = useTranslation("translation", { keyPrefix: "artist" });
  const id = React.useId();
  const listId = `scroll-rail-${id}`;
  const headingId = `${listId}-heading`;
  const canScrollLeft = useScrollOverflow(listId, "left");
  const canScrollRight = useScrollOverflow(listId, "right");
  const [hasMeasured, setHasMeasured] = React.useState(false);

  React.useEffect(() => {
    setHasMeasured(true);
  }, []);

  const scrollByPage = (direction: 1 | -1) => {
    const canScroll = direction === 1 ? canScrollRight : canScrollLeft;
    if (!canScroll) return;
    const el = document.getElementById(listId);
    el?.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section className={className} aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2
          id={headingId}
          className="m-0! text-base! leading-tight! font-semibold! min-w-0"
        >
          {title}
        </h2>
        <div className="flex items-center gap-3 shrink-0">
          {headerAction}
          {hasMeasured && (canScrollLeft || canScrollRight) && (
            <div className="flex gap-1.5 max-sm:hidden">
              <ArrowButton
                type="button"
                aria-label={t("scrollLeft")}
                aria-controls={listId}
                aria-disabled={!canScrollLeft}
                onClick={() => scrollByPage(-1)}
              >
                <FaChevronLeft aria-hidden />
              </ArrowButton>
              <ArrowButton
                type="button"
                aria-label={t("scrollRight")}
                aria-controls={listId}
                aria-disabled={!canScrollRight}
                onClick={() => scrollByPage(1)}
              >
                <FaChevronRight aria-hidden />
              </ArrowButton>
            </div>
          )}
        </div>
      </div>
      <RailList
        id={listId}
        itemWidth={itemWidth}
        mobileItemWidth={mobileItemWidth}
      >
        {children}
      </RailList>
    </section>
  );
};

export default ScrollRail;
