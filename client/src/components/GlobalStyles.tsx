import { Global, css } from "@emotion/react";

const GlobalStyles = () => {
  return (
    <Global
      styles={(theme) => css`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html {
          font-size: 20px;
          min-height: 100%;
        }

        body {
          margin: 0;
          background-color: ${theme.colors.background};
          color: ${theme.colors.text};
          font-family: ${theme.typography.fontFamily};
          -webkit-font-smoothing: auto;
          -moz-osx-font-smoothing: auto;
        }

        body,
        #root {
          min-height: 100%;
        }

        h1 {
          font-size: 2.5rem;
          line-height: 2;

          a {
            text-decoration: none;
            color: black;
          }
        }

        h2 {
          font-size: 1.9rem;
          line-height: 1.5;
          margin-bottom: 0.4rem;
        }

        h3 {
          font-size: 1.7rem;
          padding-bottom: 1rem;
        }

        h4 {
          font-size: 1.4rem;
          padding-bottom: 0.75rem;
        }

        h5 {
          font-size: 1.2rem;
          padding-bottom: 0.75rem;
        }

        h6 {
          font-size: 1.1rem;
          padding-bottom: 0.75rem;
        }

        @media (max-width: 800px) {
          h1 {
            font-size: 2rem;
          }

          h2 {
            font-size: 1.8rem;
          }
        }

        a {
          transition: 0.25s color, 0.25s background-color;
          color: ${theme.colors.primary};
        }

        @media (prefers-color-scheme: dark) {
          a {
            color: #f27d98;
          }
        }

        button {
          font-family: ${theme.typography.fontFamily};
        }

        code {
          font-family: source-code-pro, Menlo, Monaco, Consolas, "Courier New",
            monospace;
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-3rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(3rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spinning {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}
    />
  );
};

export default GlobalStyles;
