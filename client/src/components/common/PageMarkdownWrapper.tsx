import styled from "@emotion/styled";

export const PageMarkdownWrapper = styled.div`
  width: 100%;
  font-size: 1.125rem;
  line-height: 1.75;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  a {
    color: #5c899c;
  }

  blockquote {
    font-style: italic;
    border-left: 4px solid #d1d5db;
    padding-left: 1rem;
    margin: 1rem 0;
  }

  h2 {
    font-size: 1.7rem;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
  }

  p {
    line-height: 1.75;
    margin-bottom: 1rem;
  }

  ul,
  ol {
    margin-left: 1.5rem;
    margin-bottom: 1rem;
  }

  li {
    margin-bottom: 0.5rem;
    line-height: 1.75;
  }

  iframe {
    margin: 1rem 0;
    line-height: 1.75;
  }

  @media (max-width: 768px) {
    p {
      line-height: 1.5;
    }
  }
`;
