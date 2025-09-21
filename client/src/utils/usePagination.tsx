import { css } from "@emotion/css";
import LinkWithIcon from "components/common/LinkWithIcon";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";

const usePagination = ({ pageSize }: { pageSize: number }) => {
  const [search] = useSearchParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const pageSearch = search.get("page");
  const page = pageSearch ? +pageSearch : 0;

  const previousPage = new URLSearchParams({
    ...Object.fromEntries(searchParams),
    page: `${page - 1}`,
  });

  const nextPage = new URLSearchParams({
    ...Object.fromEntries(searchParams),
    page: `${page + 1}`,
  });

  return {
    page,
    PaginationComponent: ({
      amount,
      total,
    }: {
      amount?: number;
      total?: number;
    }) => {
      const showNextPage = total && total > pageSize * (page + 1);

      console.log({ page, amount, pageSize, showNextPage });
      return (
        <div
          className={css`
            display: flex;
            width: 100%;
            justify-content: center;
            flex-direction: row;
            flex-wrap: wrap;
            padding: var(--mi-side-paddings-xsmall);
          `}
        >
          {page > 0 && (
            <LinkWithIcon to={`?${previousPage.toString()}`}>
              <FaChevronLeft /> Previous page
            </LinkWithIcon>
          )}
          {page > 0 && amount === pageSize && (
            <span
              className={css`
                padding: 0 1rem;
              `}
            >
              {" "}
              -{" "}
            </span>
          )}
          {(amount === pageSize || !!showNextPage) && (
            <LinkWithIcon to={`?${nextPage.toString()}`}>
              Next page <FaChevronRight />
            </LinkWithIcon>
          )}
        </div>
      );
    },
  };
};

export default usePagination;
