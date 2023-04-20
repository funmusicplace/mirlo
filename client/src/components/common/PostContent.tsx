import styled from "@emotion/styled";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// import remarkEmbedder from "@remark-embedder/core";
import remarkEmbedder from "utils/remarkEmbedder";

const PostContentWrapper = styled.div`
  margin-top: 0.5rem;
  h1 {
    font-size: 1.2rem;
  }
  h2 {
    font-size: 1.1rem;
  }
`;

const CodeSandboxTransformer = {
  name: "CodeSandbox",
  // shouldTransform can also be async
  shouldTransform(url: string) {
    const { host, pathname } = new URL(url);

    const includesHost = [
      "localhost:8080",
      "codesandbox.io",
      "www.codesandbox.io",
    ].includes(host);
    const isWidget = pathname.includes("/widget");
    return includesHost && isWidget;
  },
  // getHTML can also be async
  getHTML(url: string) {
    console.log("transforming");
    const iframeUrl = url.replace("/s/", "/embed/");

    return `<iframe src="${iframeUrl}" style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;" allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking" sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"></iframe>`;
  },
};

const PostContent: React.FC<{ content: string }> = ({ content }) => {
  return (
    <PostContentWrapper>
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          [remarkEmbedder, { transformers: [CodeSandboxTransformer] }],
        ]}
      >
        {content}
      </ReactMarkdown>
    </PostContentWrapper>
  );
};

export default PostContent;
