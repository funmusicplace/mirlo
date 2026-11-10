import parse, { Element } from "html-react-parser";
import React from "react";

import LazyIframe from "./LazyIframe";
import MarkdownWrapper from "./MarkdownWrapper";

const RichTextContent: React.FC<{ html: string; className?: string }> = ({
  html,
  className,
}) => (
  <MarkdownWrapper className={className}>
    {parse(html, {
      replace(node) {
        if (node instanceof Element && node.tagName === "iframe") {
          const { loading: _loading, ...attribs } = node.attribs;
          return <LazyIframe {...attribs} />;
        }
      },
    })}
  </MarkdownWrapper>
);

export default RichTextContent;
