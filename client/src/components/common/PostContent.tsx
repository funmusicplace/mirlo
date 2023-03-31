import styled from "@emotion/styled";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const PostContentWrapper = styled.div`
  margin-top: 0.5rem;
  h1 {
    font-size: 1.2rem;
  }
  h2 {
    font-size: 1.1rem;
  }
`;

const PostContent: React.FC<{ content: string }> = ({ content }) => {
  return (
    <PostContentWrapper>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </PostContentWrapper>
  );
};

export default PostContent;
