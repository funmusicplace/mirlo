/**
 * Recursively visits all nodes in a DOM tree until one of:
 * - all nodes have been visited
 * - the callback returns false
 *
 * This is roughly similar to unist-util-visit:
 * https://github.com/syntax-tree/unist-util-visit
 *
 * The filter() function decides which nodes the callback is invoked on.
 *
 * The callback() returns one of three cases:
 * - `true` continues recursion into the current node
 * - `undefined` skips the current node and continues recursion
 * - `false` immediately stops all recursion and returns
 */
function visit<E extends Node>(
  node: Node,
  filter: (node: Node) => node is E,
  callback: (node: E, index: number, parent: Node) => boolean | void
): boolean {
  for (const [childIndex, childNode] of node.childNodes.entries()) {
    let shouldRecurse = filter(childNode)
      ? callback(childNode, childIndex, node)
      : true;

    if (shouldRecurse === undefined) continue;
    if (shouldRecurse === false) return false;
    if (!visit(childNode, filter, callback)) return false;
  }

  return true;
}

const isElementNode = (node: Node): node is Element =>
  node.nodeType === Node.ELEMENT_NODE;

const EXCERPT_TAGS = ["H1", "H2", "H3", "H4", "H5", "H6", "P"];

/**
 * Parses the provided [htmlStr] using DOMParser and returns a list of strings
 * for each node with text content in the document.
 */
export function getHtmlExcerpt(htmlStr: string): string[] {
  // This *evaluates* htmlStr into a document, but should not execute any script content (unless the resulting nodes are placed in the DOM)
  // - since this function only returns .textContent, it should avoid any XSS opportunities
  const htmlDocument = new DOMParser().parseFromString(htmlStr, "text/html");
  const ret: string[] = [];

  visit(htmlDocument.body, isElementNode, (el) => {
    if (EXCERPT_TAGS.includes(el.tagName)) {
      const textContent = el.textContent;
      if (textContent) ret.push(textContent);
      return undefined;
    } else {
      return true;
    }
  });

  return ret;
}
