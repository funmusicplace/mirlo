import { css } from "@emotion/css";
import LinkWithIcon from "components/common/LinkWithIcon";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";

const usePagination = ({ pageSize }: { pageSize: number }) => {
  const [search] = useSearchParams();

  const pageSearch = search.get("page");
  const page = pageSearch ? +pageSearch : 0;

  console.log("usePagination", page, pageSize);

  return {
    page,
    PaginationComponent: ({
      amount,
      total,
    }: {
      amount?: number;
      total?: number;
    }) => (
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
          <LinkWithIcon to={`?page=${page - 1}`}>
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
        {(amount === pageSize || (total && total > pageSize * (page + 1))) && (
          <LinkWithIcon to={`?page=${page + 1}`}>
            Next page <FaChevronRight />
          </LinkWithIcon>
        )}
      </div>
    ),
  };
};

export default usePagination;
