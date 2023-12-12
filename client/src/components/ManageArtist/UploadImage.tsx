import { css } from "@emotion/css";
import { InputEl } from "components/common/Input";
import LoadingSpinner from "components/common/LoadingSpinner";
import { bp } from "../../constants";
import React from "react";
import { useFormContext } from "react-hook-form";
import styled from "@emotion/styled";
import { FaFileUpload } from "react-icons/fa";

export const Img = styled.img<{ rounded?: boolean }>`
  max-width: 150px;
  transition: .25s background-color, .25s filter;
  @media (max-width: ${bp.medium}px) {
    max-width: 100%;
  }

  &:hover {
    filter: brightness(80%);
    cursor: pointer;
  }

  ${({ rounded }) => (rounded ? "border-radius: 100%" : "")}}
`;

export const Spinner: React.FC<{ rounded?: boolean }> = ({ rounded }) => {
  return (
    <div
      className={css`
        position: absolute;
        width: 100%;
        height: 100%;
        background-color: var(--mi-lighten-x-background-color);
        display: flex;
        align-items: center;
        justify-content: center;
        top: 0;
        right: 0;
        left: 0;
        ${rounded ? "border-radius: 100%" : ""}
      `}
    >
      <LoadingSpinner
        className={css`
          font-size: 2rem;
        `}
      />
    </div>
  );
};

export const UploadPrompt: React.FC<{
  width?: string;
  height?: string;
  rounded?: boolean;
}> = ({ width, height, rounded }) => {
  return (
    <div
      className={css`
        flex-direction: column;
        padding: 2rem;
        text-align: center;
        width: ${width}px;
        height: ${height}px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--mi-darken-x-background-color);
        ${rounded ? "border-radius: 100%;" : ""}
        transition: .25s background-color;
        cursor: pointer;

        > svg {
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        &:hover {
          background-color: var(--mi-darken-background-color);
        }
      `}
    >
      <FaFileUpload />
      Click to upload an image
    </div>
  );
};

export const ImageWrap = styled.div`
  position: relative;
  display: inline-block;
`;

const UploadImage: React.FC<{
  formName: string;
  existingCover?: string;
  updatedAt?: string;
  isLoading?: boolean;
  rounded?: boolean;
  width?: string;
  height?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({
  formName,
  existingCover,
  isLoading,
  updatedAt,
  onChange,
  rounded,
  width,
  height,
}) => {
  const [existingImage, setExistingImage] = React.useState(existingCover);
  const formContext = useFormContext();
  const { watch, register } = formContext ?? {};
  const image = watch?.(formName);
  React.useEffect(() => {
    setExistingImage(`${existingCover}?updateAt=${updatedAt}`);
  }, [existingCover, updatedAt]);

  const imageUrl =
    !existingCover && image?.length > 0 && URL.createObjectURL(image[0]);

  return (
    <div
      className={css`
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      `}
    >
      <ImageWrap>
        {existingCover && (image?.length === 0 || image === undefined) && (
          <Img src={existingImage} alt={formName} rounded={rounded} />
        )}
        {imageUrl && image?.length > 0 && (
          <Img src={imageUrl} alt={formName} rounded={rounded} />
        )}
        {!imageUrl && !existingCover && (
          <label htmlFor={`${formName}image`}>
            <UploadPrompt width={width} height={height} rounded={rounded} />
          </label>
        )}
        {isLoading && <Spinner />}
      </ImageWrap>
      <InputEl
        type="file"
        id={`${formName}image`}
        {...register(formName)}
        accept="image/*"
        onChange={onChange}
      />
    </div>
  );
};

export default UploadImage;
