import styled from "@emotion/styled";

const MarkdownWrapper = styled.div`
  margin-top: 0.5rem;
  opacity: 0.9;

  h1 {
    font-weight: bold;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }

  h2 {
    font-weight: bold;
    font-size: 1.4rem;
    margin-bottom: 0.5rem;
  }

  h3 {
    font-size: 1.2rem;
  }

  iframe {
    margin: 1rem 0;
  }

  iframe.ql-video {
    width: 700px;
    height: 394px;
  }

  iframe[src*="widget/track"].ql-video {
    width: 700px;
    height: 154px;
  }

  li {
    margin-left: 1.2rem;
  }

  ul {
    margin-left: 1rem;
    margin-bottom: 1rem;
  }

  pre {
    white-space: pre-wrap;
    overflow-wrap: break-word;
    max-width: 100%;
    display: block;
    overflow: scroll;
  }

  p {
    clear: both;
  }

  p img {
    float: left;
    margin: 0 1rem 1rem 0;
    width: 150px;
  }
`;

export default MarkdownWrapper;
