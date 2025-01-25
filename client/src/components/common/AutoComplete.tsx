import { css } from "@emotion/css";
import { InputEl } from "components/common/Input";
import LoadingSpinner from "components/common/LoadingSpinner";
import { bp } from "../../constants";
import React from "react";
import { useTranslation } from "react-i18next";
import Background from "components/common/Background";
import Button from "./Button";
import styled from "@emotion/styled";
import { useLocation } from "react-router-dom";
import { debounce } from "lodash";

const SearchResultsDiv = styled.div`
  position: absolute;
  padding: 0.5rem;
  background: var(--mi-white);
  width: 100%;
  z-index: 999;
  word-break: break-word;
  color: var(--mi-black) !important;
  margin-top: 0.5rem;
  border-radius: 5px;

  @media (max-width: ${bp.small}px) {
    position: fixed;
    left: 0;
    margin-top: 1rem;
  }

  @media (prefers-color-scheme: dark) {
    color: var(--mi-black);
    &::placeholder {
      color: var(--mi-black) !important;
      opacity: 0.3;
    }
  }
`;

const SearchResultList = styled.ol`
  list-style: none;
  margin-top: 1rem;
`;

const SearchResult = styled.li`
  a,
  button {
    padding: 0.75rem 1rem !important;
    color: var(--mi-black) !important;
    display: block;
    background: transparent;
    border: none;
    width: 100%;
    justify-content: flex-start;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &.selected {
    background: var(--mi-black);
    color: var(--mi-white) !important;

    button,
    a {
      color: var(--mi-white) !important;
    }
  }

  button:hover,
  a:hover {
    color: var(--mi-white) !important;
    background-color: var(--mi-black) !important;
  }
  @media (prefers-color-scheme: dark) {
    button:hover,
    a:hover {
      background-color: var(--mi-black) !important;
    }
  }
`;

const AutoComplete: React.FC<{
  getOptions: (
    val: string
  ) =>
    | Promise<{ id: number | string; name: string; isNew?: boolean }[]>
    | { id: number | string; name: string; isNew?: boolean }[]
    | undefined;
  resultsPrefix?: string;
  onSelect?: (value: string | number) => void;
  optionDisplay?: (result: {
    id: number | string;
    name: string;
    artistId?: string | number;
    trackGroupId?: string | number;
  }) => React.ReactNode;
  placeholder?: string | null;
  allowNew?: boolean;
  showBackground?: boolean;
  usesNavigation?: boolean;
}> = ({
  getOptions,
  resultsPrefix,
  usesNavigation,
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
    { id: number | string; name: string; isNew?: boolean }[]
  >([]);
  const [navigationIndex, setNavigationIndex] = React.useState(0);
  let location = useLocation();

  const onChangeValue = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchValue(e.target.value);
    },
    []
  );

  const searchCallback = React.useCallback(
    debounce(async (searchString: string) => {
      if (searchString && searchString.length > 1) {
        setShowSuggestions(true);
        setIsSearching(true);
        const results = await getOptions(searchString);
        const searchResultsMatchSearch = searchResults.find(
          (result) =>
            result.name.toLowerCase().replaceAll(/\-| /g, "") === searchString
        );
        if (allowNew && !searchResultsMatchSearch && results) {
          results.push({
            id: searchString,
            name: searchString,
            isNew: true,
          });
        }
        setSearchResults(results ?? []);
        setIsSearching(false);
        setNavigationIndex(0);
      } else {
        setSearchResults([]);
        setShowSuggestions(false);
      }
    }, 500),
    [getOptions, allowNew]
  );

  const onSelectValue = React.useCallback(
    (value: string | number, index?: number) => {
      if (searchResults.length > 0 && index !== undefined) {
        onSelect?.(searchResults[index].id);
      } else {
        onSelect?.(value);
      }
      setSearchValue("");
      setShowSuggestions(false);
    },
    [onSelect, searchResults]
  );

  React.useEffect(() => {
    searchCallback(searchValue);
  }, [searchCallback, searchValue]);

  React.useEffect(() => {
    if (usesNavigation) {
      setShowSuggestions(false);
    }
  }, [usesNavigation, location]);

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
        placeholder={placeholder ?? ""}
        data-lpignore="true"
        id="search"
        type="search"
        onChange={onChangeValue}
        autoComplete="off"
        className={css`
          z-index: 1000;
          opacity: 0.95;
          position: relative;
          margin-bottom: 0 !important;
          border: 1px solid var(--mi-lighten-foreground-color);
          background: var(--mi-white) !important;
          overflow: hidden;
          text-overflow: ellipsis;
          &::placeholder {
            color: var(--mi-normal-foreground-color) !important;
            opacity: 0.5;
          }
          @media (prefers-color-scheme: dark) {
            color: var(--mi-white) !important;
            background: var(--mi-black) !important;
            &::placeholder {
              color: var(--mi-white) !important;
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
          <SearchResultsDiv>
            {resultsPrefix}
            {isSearching && <LoadingSpinner />}
            {!isSearching && searchResults.length > 0 && (
              <SearchResultList>
                {searchResults.map((r, index) => (
                  <SearchResult
                    key={r.id}
                    className={navigationIndex === index ? "selected" : ""}
                  >
                    {optionDisplay ? (
                      optionDisplay(r)
                    ) : (
                      <Button
                        type="button"
                        onClick={() => onSelectValue(r.id, index)}
                      >
                        {r.isNew ? `use "${r.name}"` : r.name}
                      </Button>
                    )}
                  </SearchResult>
                ))}
              </SearchResultList>
            )}
            {!allowNew && !isSearching && searchResults.length === 0 && (
              <>{t("noResults")}</>
            )}
          </SearchResultsDiv>
        </>
      )}
    </div>
  );
};

export default AutoComplete;
