import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import api from "services/api";
import AutoComplete from "components/common/AutoComplete";

const HeaderSearch: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("translation", { keyPrefix: "headerSearch" });

  const getOptions = React.useCallback(async (searchString: string) => {
    const results = await api.getMany<Artist>(`artists`, {
      name: searchString,
    });
    return results.results.map((r) => ({
      id: r.urlSlug ?? r.id,
      name: r.name,
    }));
  }, []);

  return (
    <AutoComplete
      getOptions={getOptions}
      showBackground
      placeholder="Search artists"
      resultsPrefix={t("searchSuggestions") ?? undefined}
      onSelect={(val) => {
        console.log("val", val);
        navigate(`/${val}`);
      }}
      optionDisplay={(r: { id: number | string; name: string }) => (
        <Link to={`/${r.id}`}>{r.name}</Link>
      )}
    />
  );
};

export default HeaderSearch;
