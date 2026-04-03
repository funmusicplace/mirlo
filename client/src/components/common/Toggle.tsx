import { css } from "@emotion/css";
import { useEffect, useState } from "react";

export const Toggle: React.FC<{
  label: string;
  toggled: boolean;
  onClick: (newVal: boolean) => void;
}> = ({ label, toggled, onClick }) => {
  const [isToggled, toggle] = useState(toggled);

  const callback = () => {
    toggle(!isToggled);
    onClick(!isToggled);
  };

  useEffect(() => {
    toggle(toggled);
  }, [toggled]);

  return (
    <label
      className={css`
        position: relative;
        display: inline-flex;
        align-items: center;
      `}
    >
      <input
        type="checkbox"
        defaultChecked={isToggled}
        checked={isToggled}
        onClick={callback}
        className={css`
          opacity: 0;
          width: 0;
          height: 0;

          &:checked + .toggle {
            background-color: #00c853;
          }

          &:checked + .toggle:before {
            transform: translateX(14px);
          }
        `}
      />
      <span
        className={
          "toggle " +
          css`
            display: inline-flex;
            align-items: center;
            width: 30px;
            height: 15px;

            transition: 0.3s;
            cursor: pointer;
            background: #2c3e50;
            border-radius: 30px;

            &:before {
              position: absolute;
              content: "";
              height: 12px;
              width: 12px;
              left: 2px;
              background-color: #fff;
              border-radius: 50%;
              transition: 0.3s;
            }
          `
        }
      />
      <span
        className={css`
          margin-left: 1rem;
        `}
      >
        {label}
      </span>
    </label>
  );
};
