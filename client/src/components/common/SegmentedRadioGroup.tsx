import styled from "@emotion/styled";
import { ArtistButton } from "components/Artist/ArtistButtons";
import React from "react";

const SegmentedGroup = styled.div`
  display: flex;
  flex-wrap: wrap;

  & input:focus-visible + label > button {
    outline: 5px auto Highlight;
    outline: 5px auto -webkit-focus-ring-color;
  }

  & label:first-of-type > button {
    border-start-end-radius: 0;
    border-end-end-radius: 0;
  }

  & label ~ label > button {
    border-radius: 0;
  }

  & label:last-of-type > button {
    border-start-end-radius: var(--mi-border-radius);
    border-end-end-radius: var(--mi-border-radius);
  }
`;

export type SegmentedRadioOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  inputRef?: React.Ref<HTMLInputElement>;
  describedBy?: string;
};

function SegmentedRadioGroup<T extends string>({
  name,
  idPrefix,
  options,
  value,
  onChange,
  ariaLabelledBy,
  disabled,
  size,
}: {
  name: string;
  idPrefix: string;
  options: SegmentedRadioOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  ariaLabelledBy?: string;
  disabled?: boolean;
  size?: "compact";
}) {
  return (
    <SegmentedGroup role="radiogroup" aria-labelledby={ariaLabelledBy}>
      {options.map((option) => {
        const isSelected = value === option.value;
        const id = `${idPrefix}-${option.value}`;
        return (
          <React.Fragment key={option.value}>
            <input
              checked={isSelected}
              className="sr-only"
              id={id}
              name={name}
              onChange={() => onChange(option.value)}
              ref={option.inputRef}
              type="radio"
              disabled={disabled}
              aria-describedby={option.describedBy}
            />
            <label htmlFor={id}>
              <ArtistButton
                onClick={() => onChange(option.value)}
                tabIndex={-1}
                type="button"
                size={size}
                disabled={disabled}
                variant={isSelected ? "default" : "outlined"}
              >
                {option.label}
              </ArtistButton>
            </label>
          </React.Fragment>
        );
      })}
    </SegmentedGroup>
  );
}

export default SegmentedRadioGroup;
