import { css } from "@emotion/css";
import { useQuery } from "@tanstack/react-query";
import { queryTags } from "queries/tags";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import usePagination from "utils/usePagination";

import { bp } from "../../constants";

import Select from "components/common/Select";
import WidthContainer from "components/common/WidthContainer";
import { SectionHeader } from "components/common/SectionHeader";
import TrackGroupPills from "components/TrackGroup/TrackGroupPills";

const pageSize = 200;

const Index = () => {
  const { t } = useTranslation("translation", { keyPrefix: "releases" });
  const { page, PaginationComponent } = usePagination({ pageSize });
  const [orderBy, setOrderBy] = useState<"count" | "name">("count");

  const { data: tags } = useQuery(
    queryTags({ skip: pageSize * page, take: pageSize, orderBy })
  );

  return (
    <div
      className={css`
        @media screen and (max-width: ${bp.medium}px) {
          margin-bottom: 0rem;
        }
      `}
    >
      <SectionHeader>
        <WidthContainer variant="big">
          <div
            className={css`
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              gap: 0.5rem;
              margin-bottom: 0.5rem;
            `}
          >
            <h2 className="h5 section-header__heading">{t("popularTags")}</h2>
            <div
              className={css`
                align-self: flex-end;
                margin: var(--mi-side-paddings-xsmall);
              `}
            >
              <Select
                options={[
                  { label: t("mostPopular"), value: "count" },
                  { label: t("alphabetical"), value: "name" },
                ]}
                value={orderBy}
                onChange={(e) => {
                  setOrderBy(e.target.value as "count" | "name");
                }}
              />
            </div>
          </div>
          <div
            className={css`
              margin: 0 0.5rem;

              & > div {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
              }
            `}
          >
            <TrackGroupPills tags={tags?.results.map((tag) => tag.tag)} />
          </div>
        </WidthContainer>
      </SectionHeader>
      <div
        className={css`
          padding-top: 0.25rem;
        `}
      >
        <WidthContainer variant="big" justify="center">
          {tags && <PaginationComponent amount={tags.results.length} />}
        </WidthContainer>
      </div>
    </div>
  );
};

export default Index;
