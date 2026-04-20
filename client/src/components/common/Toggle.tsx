import { css } from "@emotion/css";
import { useEffect, useState } from "react";

export const Toggle: React.FC<{
  label: string;
  toggled: boolean;
  onClick: (newVal: boolean) => void;
  labelClassName?: string;
  id?: string;
  labelId?: string;
}> = ({ label, toggled, onClick, labelClassName, id, labelId }) => {
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
        role="switch"
        checked={isToggled}
        onChange={callback}
        aria-checked={isToggled}
        aria-labelledby={labelId}
        id={id}
        className={
          "sr-only " +
          css`
            &:focus-visible ~ .toggle {
              outline: 2px solid var(--mi-primary-color);
              outline-offset: 2px;
            }

            &:checked ~ .toggle {
              background-color: var(--mi-green-500);
            }

            &:checked ~ .toggle:before {
              transform: translateX(14px);
            }
          `
        }
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
            background: var(--mi-neutral-500);
            border-radius: 30px;

            &:before {
              position: absolute;
              content: "";
              height: 12px;
              width: 12px;
              left: 2px;
              background-color: var(--mi-normal-background-color);
              border-radius: 50%;
              transition: 0.3s;
            }
          `
        }
      />
      <span
        id={labelId}
        className={
          labelClassName +
          " " +
          css`
            margin-left: 1rem;
          `
        }
      >
        {label}
      </span>
    </label>
  );
};
