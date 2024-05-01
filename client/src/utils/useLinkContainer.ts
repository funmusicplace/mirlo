import { useCallback } from "react";
import { useHref, useNavigate } from "react-router-dom";

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
 * - Default prevented events
 * - <a> tags and <button>s
 */
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

type UseLinkContainer = {
  containerProps: React.HTMLAttributes<unknown>;
};

/**
 * This provides event handlers to make a container *behave* like a link, but avoid presenting itself
 * as one to the accessibility tree.
 *
 * This should be used together with a nested <Link> component that keyboard users can tab through.
 */
export function useLinkContainer(to: string | undefined): UseLinkContainer {
  const href = useHref(to ?? "");
  const navigate = useNavigate();

  // Handle middle click button - should open a new tab (cannot be detected via "click" event)
  // - prefer the "auxclick" event for this, since it ensures that mousedown/mouseup both occur within the same element
  //   otherwise, using "mouseup" would activate on mouseup even when dragging between elements, which should not trigger a click
  const handleHrefContainerAuxClick = useCallback(
    (e: React.MouseEvent) => {
      // only handle middle click events
      if (e.button !== 1) return;

      if (e.defaultPrevented) return;
      if (isNestedElement(e)) return;

      e.preventDefault();
      window.open(href, "_blank");
      return false;
    },
    [href]
  );

  const handleHrefContainerClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.defaultPrevented) return;
      if (isNestedElement(e)) return;

      // only handle left click events
      if (e.button !== 0) return;
      // ignore download shortcut
      if (e.altKey) return;

      e.preventDefault();

      // Open in new tab
      if (e.metaKey || e.ctrlKey || e.shiftKey) {
        window.open(href, "_blank");
        return false;
      }

      // If text is selected, don't activate on mouseup (but ctrl+click should still work)
      const selection = window.getSelection();
      if (
        selection?.toString()?.length &&
        selection.containsNode(e.target as Node, true)
      )
        return;

      navigate(to ?? "");
    },
    [href, navigate, to]
  );

  const handleHrefContainerMouseDown = useCallback((e: React.MouseEvent) => {
    const isMiddleClick = e.button === 1;
    if (!isMiddleClick) return;
    if (e.defaultPrevented) return;
    if (isNestedElement(e)) return;
    e.preventDefault();
  }, []);

  // implement the AuxClick event using MouseUp (only on browsers that don't support auxclick; i.e. safari)
  const handleHrefContainerMouseUp = useCallback(
    (e: React.MouseEvent) => {
      // if auxclick is supported, do nothing
      if (e.currentTarget && "onauxclick" in e.currentTarget) return;
      // otherwise, pass mouseup events to auxclick
      handleHrefContainerAuxClick(e);
    },
    [handleHrefContainerAuxClick]
  );

  return {
    containerProps: {
      onAuxClick: handleHrefContainerAuxClick,
      onClick: handleHrefContainerClick,
      onMouseDown: handleHrefContainerMouseDown,
      onMouseUp: handleHrefContainerMouseUp,
    },
  };
}
