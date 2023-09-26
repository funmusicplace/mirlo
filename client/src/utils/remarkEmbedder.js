import { visit } from "unist-util-visit";
import { fromParse5 } from "hast-util-from-parse5";
import * as parse5 from "parse5";

/**
 * NOTE: this is adapted from @remark-embedder/core. It's the same functionality
 * but the async / await has been stripped from it.
 * See ticket https://github.com/remark-embedder/core/issues/123#issue-1676994245
 */

Object.defineProperty(exports, "__esModule", {
  value: true,
});
// exports.default = void 0;

// results in an AST node of type "root" with a single "children" node of type "element"
// so we return the first (and only) child "element" node
const htmlToHast = (string) => {
  return fromParse5(parse5.parseFragment(string)).children[0];
};

const getUrlString = (url) => {
  const urlString = url.startsWith("http") ? url : `https://${url}`;

  try {
    return new URL(urlString).toString();
  } catch (error) {
    return null;
  }
};

const remarkEmbedder = ({ cache, transformers, handleHTML, handleError }) => {
  // convert the array of transformers to one with both the transformer and the config tuple
  const transformersAndConfig = transformers.map((t) =>
    Array.isArray(t)
      ? {
          config: t[1],
          transformer: t[0],
        }
      : {
          transformer: t,
        }
  );
  return (tree) => {
    const nodeAndURL = [];
    visit(tree, "paragraph", (paragraphNode) => {
      if (paragraphNode.children.length !== 1) {
        return;
      }

      const { children } = paragraphNode;
      const node = children[0];
      const isText = node.type === "text"; // it's a valid link if there's no title, and the value is the same as the URL

      const isValidLink =
        node.type === "link" &&
        !node.title &&
        node.children.length === 1 &&
        node.children[0].type === "text" &&
        node.children[0].value === node.url;

      if (!(isText || isValidLink)) {
        return;
      }

      const value = isText ? node.value : node.url;
      const urlString = getUrlString(value);

      if (!urlString) {
        return;
      }

      nodeAndURL.push({
        parentNode: paragraphNode,
        url: urlString,
      });
    });
    const nodesToTransform = [];

    for (const node of nodeAndURL) {
      for (const transformerAndConfig of transformersAndConfig) {
        // we need to make sure this is completed in sequence
        // because the order matters
        // eslint-disable-next-line no-await-in-loop
        if (transformerAndConfig.transformer.shouldTransform(node.url)) {
          nodesToTransform.push({ ...node, ...transformerAndConfig });
          break;
        }
      }
    }

    nodesToTransform.forEach(({ parentNode, url, transformer, config }) => {
      const errorMessageBanner = `The following error occurred while processing \`${url}\` with the remark-embedder transformer \`${transformer.name}\`:`;

      try {
        const cacheKey = `remark-embedder:${transformer.name}:${url}`;
        let html = cache == null ? void 0 : cache.get(cacheKey);

        if (!html) {
          try {
            var _html$trim, _html;

            html = transformer.getHTML(url, config);
            html =
              (_html$trim = (_html = html) == null ? void 0 : _html.trim()) !=
              null
                ? _html$trim
                : null;
            cache == null ? void 0 : cache.set(cacheKey, html); // optional handleHTML transform function

            if (handleHTML) {
              var _html$trim2, _html2;

              html = handleHTML(html, {
                url,
                transformer,
                config,
              });
              html =
                (_html$trim2 =
                  (_html2 = html) == null ? void 0 : _html2.trim()) != null
                  ? _html$trim2
                  : null;
            }
          } catch (e) {
            if (handleError) {
              var _html$trim3, _html3;

              const error = e;
              console.error(`${errorMessageBanner}\n\n${error.message}`);
              html = handleError({
                error,
                url,
                transformer,
                config,
              });
              html =
                (_html$trim3 =
                  (_html3 = html) == null ? void 0 : _html3.trim()) != null
                  ? _html$trim3
                  : null;
            } else {
              throw e;
            }
          }
        } // if nothing's returned from getHTML, then no modifications are needed

        if (!html) {
          return;
        } // convert the HTML string into an AST

        const htmlElement = htmlToHast(html); // set the parentNode.data with the necessary properties

        parentNode.data = {
          hChildren: htmlElement.children,
          hName: htmlElement.tagName,
          hProperties: htmlElement.properties,
        };
      } catch (e) {
        const error = e;
        error.message = `${errorMessageBanner}\n\n${error.message}`;
        throw error;
      }
    });
    return tree;
  };
};

export default remarkEmbedder;
// var _default = remarkEmbedder;
// /*
// eslint
//   @typescript-eslint/no-explicit-any: "off",
// */

// exports.default = _default;
