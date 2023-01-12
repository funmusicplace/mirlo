import styled from "@emotion/styled";

export const InlineForm = styled.form<{ compact?: boolean }>`
  display: flex;
  margin-bottom: ${(props) => (props.compact ? "0" : "1rem")};

  > input {
    margin-bottom: 0rem;
    width: 100%;
    border-bottom-left-radius: 6px;
    border-top-left-radius: 6px;
    background-color: white;
  }

  > input + button {
    border: 1px solid #bfbfbf;
    border-left: none;
    border-bottom-right-radius: 6px;
    border-top-right-radius: 6px;
  }

  @media (prefers-color-scheme: dark) {
    > input {
      background-color: #222;
    }
  }
`;

export default InlineForm;
