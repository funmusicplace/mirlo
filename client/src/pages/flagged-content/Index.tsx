import ContentFlagRow from "components/Admin/ContentFlagRow";
import FormComponent from "components/common/FormComponent";
import { SelectEl } from "components/common/Select";
import Table from "components/common/Table";
import WidthContainer from "components/common/WidthContainer";
import {
  AdminContentFlagsResolvedFilter,
  useAdminContentFlagsQuery,
} from "queries/admin";
import React from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import usePagination from "utils/usePagination";

const PAGE_SIZE = 50;

const RESOLVED_FILTERS: AdminContentFlagsResolvedFilter[] = [
  "unresolved",
  "resolved",
  "all",
];

const isResolvedFilter = (
  value: string | null
): value is AdminContentFlagsResolvedFilter =>
  RESOLVED_FILTERS.includes(value as AdminContentFlagsResolvedFilter);

const Index: React.FC = () => {
  const { t } = useTranslation("translation", { keyPrefix: "flaggedContent" });
  const [searchParams, setSearchParams] = useSearchParams();
  const { page, PaginationComponent } = usePagination({
    pageSize: PAGE_SIZE,
  });

  const statusParam = searchParams.get("status");
  const resolvedFilter = isResolvedFilter(statusParam)
    ? statusParam
    : "unresolved";

  const { data } = useAdminContentFlagsQuery(resolvedFilter, page, PAGE_SIZE);
  const flags = data?.results ?? [];

  const onChangeFilter = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const status = e.target.value;
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("status", status);
        params.delete("page");
        return params;
      });
    },
    [setSearchParams]
  );

  return (
    <WidthContainer variant="big" justify="center">
      <div className="flex flex-col gap-4 p-4">
        <h1>{t("title")}</h1>
        <FormComponent>
          <label htmlFor="input-flag-status">{t("filter.label")}</label>
          <SelectEl
            id="input-flag-status"
            value={resolvedFilter}
            onChange={onChangeFilter}
          >
            {RESOLVED_FILTERS.map((filter) => (
              <option key={filter} value={filter}>
                {t(`filter.${filter}`)}
              </option>
            ))}
          </SelectEl>
        </FormComponent>
        {flags.length === 0 ? (
          <p>{t("noFlags")}</p>
        ) : (
          <Table className="table-fixed min-w-5xl">
            <colgroup>
              <col className="w-28" />
              <col />
              <col className="w-48" />
              <col className="w-48" />
              <col className="w-32" />
              <col className="w-44" />
            </colgroup>
            <thead>
              <tr>
                <th>{t("columnDate")}</th>
                <th>{t("columnDetails")}</th>
                <th>{t("columnContent")}</th>
                <th>{t("columnRelease")}</th>
                <th>{t("columnArtist")}</th>
                <th>
                  <span className="sr-only">{t("columnActions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {flags.map((flag) => (
                <ContentFlagRow key={flag.id} flag={flag} />
              ))}
            </tbody>
          </Table>
        )}
        <PaginationComponent amount={flags.length} total={data?.total} />
      </div>
    </WidthContainer>
  );
};

export default Index;
