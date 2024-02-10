import { css } from "@emotion/css";
import { InputEl } from "components/common/Input";
import LoadingSpinner from "components/common/LoadingSpinner";
import { bp } from "../../constants";
import React from "react";
import { useTranslation } from "react-i18next";
import Background from "components/common/Background";
import Button from "./Button";

const AutoComplete: React.FC<{
  getOptions: (
    val: string
  ) =>
    | Promise<{ id: number | string; name: string }[]>
    | { id: number | string; name: string }[];
  resultsPrefix?: string;
  onSelect?: (value: string | number) => void;
  optionDisplay?: (result: {
    id: number | string;
    name: string;
  }) => React.ReactNode;
  placeholder?: string;
  allowNew?: boolean;
  showBackground?: boolean;
}> = ({
  getOptions,
  resultsPrefix,
  optionDisplay,
  onSelect,
  placeholder,
  allowNew,
  showBackground,
}) => {
  const [searchValue, setSearchValue] = React.useState("");
  const { t } = useTranslation("translation", { keyPrefix: "headerSearch" });

  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<
    { id: number | string; name: string }[]
  >([]);
  const [navigationIndex, setNavigationIndex] = React.useState(0);

  const onChangeValue = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchValue(e.target.value);
    },
    []
  );

  const searchCallback = React.useCallback(
    async (searchString: string) => {
      if (searchString && searchString.length > 1) {
        setShowSuggestions(true);
        setIsSearching(true);
        const results = await getOptions(searchString);
        setSearchResults(results);
        setIsSearching(false);
        setNavigationIndex(0);
      } else {
        setSearchResults([]);
        setShowSuggestions(false);
      }
    },
    [getOptions]
  );

  const onSelectValue = React.useCallback(
    (value: string | number, index?: number) => {
      if (searchResults.length > 0 && index) {
        onSelect?.(searchResults[index].name);
      } else {
        onSelect?.(value);
      }
      setSearchValue("");
    },
    [onSelect, searchResults]
  );

  React.useEffect(() => {
    searchCallback(searchValue);
  }, [searchCallback, searchValue]);

  return (
    <div
      className={css`
        position: relative;
        margin-right: 1rem;
      `}
    >
      <InputEl
        name="search"
        value={searchValue}
        placeholder={placeholder}
        data-lpignore="true"
        id="search"
        type="search"
        onChange={onChangeValue}
        autoComplete="off"
        className={css`
          z-index: 1000;
          position: relative;
          margin-bottom: 0 !important;
          border: 1px solid var(--mi-lighten-foreground-color);
          background: var(--mi-white) !important;
          &::placeholder {
            color: var(--mi-normal-foreground-color) !important;
            opacity: 0.3;
          }
          @media screen and (max-width: ${bp.medium}px) {
            opacity: 0.7;
          }
          @media (prefers-color-scheme: dark) {
            color: var(--mi-black) !important;
            &::placeholder {
              color: var(--mi-black) !important;
              opacity: 0.3;
            }
          }
        `}
        onKeyUp={(e) => {
          e.preventDefault();
          if (e.keyCode === 31 || e.key === "Enter") {
            onSelectValue(searchValue, navigationIndex);
          }
          if (e.key === "ArrowDown") {
            setNavigationIndex((val) => {
              if (val < searchResults.length - 1) {
                return val + 1;
              }
              return val;
            });
          }
          if (e.key === "ArrowUp") {
            setNavigationIndex((val) => {
              if (val > 0) {
                return val - 1;
              }
              return val;
            });
          }
        }}
      />
      {showSuggestions && (
        <>
          <Background
            onClick={() => {
              setShowSuggestions(false);
              setSearchValue("");
            }}
            transparent={!showBackground}
          />
          <div
            className={css`
              position: absolute;
              padding: .5rem;
              background: var(--mi-white);
              width: 100%;
              z-index: 999;
              word-break: break-word;
              color: var(--mi-black) !important;
              
              a {
                color: var(--mi-black) !important;
              }

              button {
                background: transparent;
                border: none;
                width: 100%;
                justify-content: flex-start;
              }

              @media (max-width: ${bp.small}px) {
                position: fixed;
                left: 0;
                margin-top: 1rem;
              }

              @media (prefers-color-scheme: dark) {
                color: var(--mi-black) 
                &::placeholder {
                  color: var(--mi-black) !important;
                  opacity: 0.3;
                }
              }
            `}
          >
            {resultsPrefix}
            {isSearching && <LoadingSpinner />}
            {!isSearching && searchResults.length > 0 && (
              <ol
                className={css`
                  list-style: none;
                  margin-top: 1rem;
                `}
              >
                {searchResults.map((r, index) =>
                  optionDisplay ? (
                    optionDisplay(r)
                  ) : (
                    <li
                      key={r.id}
                      className={
                        navigationIndex === index
                          ? css`
                              background: var(--mi-black);
                              color: var(--mi-white);

                              button {
                                color: var(--mi-white);
                              }
                            `
                          : undefined
                      }
                    >
                      <Button onClick={() => onSelectValue(r.id, index)}>
                        {r.name}
                      </Button>
                    </li>
                  )
                )}
              </ol>
            )}
            {!allowNew && !isSearching && searchResults.length === 0 && (
              <>{t("noResults")}</>
            )}
            {allowNew && !isSearching && searchResults.length === 0 && (
              <li>
                <Button onClick={() => onSelectValue(searchValue)}>
                  use "{searchValue}"
                </Button>
              </li>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AutoComplete;
