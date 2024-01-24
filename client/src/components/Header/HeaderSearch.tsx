import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import api from "services/api";
import AutoComplete from "components/common/AutoComplete";

const HeaderSearch: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "headerSearch" });

  const getOptions = React.useCallback(async (searchString: string) => {
    const results = await api.getMany<Artist>(`artists`, {
      name: searchString,
    });
    return results.results;
  }, []);

  return (
    <AutoComplete
      getOptions={getOptions}
      placeholder="Search artists"
      resultsPrefix={t("searchSuggestions") ?? undefined}
      optionDisplay={(r: { id: number; name: string }) => (
        <li key={r.id}>
          <Link to={`/${r.id}`}>{r.name}</Link>
        </li>
      )}
    />
  );
};

export default HeaderSearch;
