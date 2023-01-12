import { truncate } from "lodash";
import React from "react";
import Button from "./Button";

export const OverflowableText: React.FC<{ text?: string }> = ({ text }) => {
  const truncateLength = 200;
  const [isExpandable, setIsExpandable] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [displayText, setDisplayText] = React.useState(
    truncate(text, { length: truncateLength })
  );

  React.useEffect(() => {
    if ((text?.length ?? 0) > truncateLength) {
      setIsExpandable(true);
    }
  }, [text]);

  const toggle = React.useCallback(() => {
    setIsExpanded((val) => !val);
  }, []);

  React.useEffect(() => {
    setDisplayText(
      isExpanded ? text ?? "" : truncate(text ?? "", { length: truncateLength })
    );
  }, [text, isExpanded]);

  return (
    <div>
      {displayText}{" "}
      {isExpandable && (
        <Button variant="link" onClick={toggle}>
          {isExpanded ? "Read less" : "Read more"}
        </Button>
      )}
    </div>
  );
};

export default OverflowableText;
