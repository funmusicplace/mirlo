import React from "react";
import { useHref, useLinkClickHandler } from "react-router-dom";

function isNestedElement(e: React.MouseEvent) {
  // if the targeted element is nested inside another clickable anchor/button
  let target = e.target as HTMLElement;
  while (target !== e.currentTarget) {
    if (
      target.tagName.toLowerCase() === "a" ||
      target.tagName.toLowerCase() === "button"
    )
      return true;

    if (target.parentElement) target = target.parentElement;
    else break;
  }
  return false;
}

/**
 * This allows items like cards to bind a click event to navigate to a path.
 *
 * Handles:
 * - Left clicks
 * - Middle clicks
 * - Ctrl + Left clicks
 * - Shift + Left clicks
 * - Meta + Left clicks
 *
 *
 * Ignores:
 * - Right clicks (used for context menus)
 * - Alt clicks (used for downloading)
 * - Clicks where text is selected within the node
 * - Default prevented events
 * - Nested <a> tags and <button>s
 */
export function useHrefContainer(props: {
  href?: string;
  navigate?: (e: React.MouseEvent) => void;
}) {
  const navigate = React.useCallback(
    props.navigate ??
      (() => {
        if (props.href) window.location.href = props.href;
      }),
    [props.navigate, props.href]
  );

  // Handle middle click button - should open a new tab (cannot be detected via "click" event)
  // - prefer the "auxclick" event for this, since it ensures that mousedown/mouseup both occur within the same element
  //   otherwise, using "mouseup" would activate on mouseup even when dragging between elements, which should not trigger a click
  const onAuxClick = React.useCallback(
    (e: React.MouseEvent) => {
      // only handle middle click events
      if (e.button !== 1) return;

      if (e.defaultPrevented) return;
      if (isNestedElement(e)) return;

      e.preventDefault();
      if (props.href) window.open(props.href, "_blank");
      return false;
    },
    [props.href]
  );

  const onClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.defaultPrevented) return;
      if (isNestedElement(e)) return;

      // only handle left click events
      if (e.button !== 0) return;
      // Download
      if (e.altKey) return;

      e.preventDefault();

      // Open in new tab
      if (e.metaKey || e.ctrlKey || e.shiftKey) {
        if (props.href) window.open(props.href, "_blank");
        return false;
      }

      // If text is selected, don't activate on mouseup (but ctrl+click should still work)
      const selection = window.getSelection();
      if (
        selection?.toString()?.length &&
        selection.containsNode(e.target as Node, true)
      )
        return;

      navigate(e);
    },
    [props.href, navigate]
  );

  const onMouseDown = React.useCallback((e: React.MouseEvent) => {
    const isMiddleClick = e.button === 1;
    if (!isMiddleClick) return;
    if (e.defaultPrevented) return;
    if (isNestedElement(e)) return;
    e.preventDefault();
  }, []);

  // implement the AuxClick event using MouseUp (only on browsers that don't support auxclick; i.e. safari)
  const onMouseUp = React.useCallback(
    (e: React.MouseEvent) => {
      // if auxclick is supported, do nothing
      if (e.currentTarget && "onauxclick" in e.currentTarget) return;
      // otherwise, pass mouseup events to auxclick
      onAuxClick(e);
    },
    [onAuxClick]
  );

  return {
    onAuxClick,
    onClick,
    onMouseDown,
    onMouseUp,
  };
}

export function useLinkContainer(props: { to: string }) {
  const href = useHref(props.to);
  const handleClick = useLinkClickHandler(props.to);
  return useHrefContainer({
    href,
    navigate: handleClick as (e: React.MouseEvent) => void,
  });
}
