import { css } from "@emotion/css";
import { InputEl } from "components/common/Input";
import LoadingSpinner from "components/common/LoadingSpinner";
import React from "react";
import { Link } from "react-router-dom";
import api from "services/api";

const HeaderSearch: React.FC = () => {
  const [searchValue, setSearchValue] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<Artist[]>([]);

  const onChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchValue(e.target.value);
    },
    []
  );

  const searchCallback = React.useCallback(async (searchString: string) => {
    if (searchString && searchString.length > 1) {
      setShowSuggestions(true);
      setIsSearching(true);
      const results = await api.getMany<Artist>(`artists`, {
        name: searchString,
      });
      setSearchResults(results.results);
      setIsSearching(false);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  }, []);

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
        placeholder="Search artists"
        onChange={onChange}
        className={css`
          margin-bottom: 0 !important;
        `}
      />
      {showSuggestions && (
        <div
          className={css`
            position: absolute;
            padding: 1rem;
            background: var(--mi-normal-background-color);
            width: 100%;
          `}
        >
          Search suggestions:
          {isSearching && <LoadingSpinner />}
          {!isSearching && searchResults.length > 0 && (
            <ol
              className={css`
                list-style: none;
                margin-top: 1rem;
              `}
            >
              {searchResults.map((r) => (
                <li key={r.id}>
                  <Link to={`/artist/${r.id}`}>{r.name}</Link>
                </li>
              ))}
            </ol>
          )}
          {!isSearching && searchResults.length === 0 && (
            <>Hmm, couldn't find anything for that result</>
          )}
        </div>
      )}
    </div>
  );
};

export default HeaderSearch;
