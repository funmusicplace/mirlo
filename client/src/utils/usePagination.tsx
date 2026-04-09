import { Link, useSearchParams } from "react-router-dom";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const usePagination = ({
  pageSize,
  pageParam = "page",
}: {
  pageSize: number;
  pageParam?: string;
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const pageSearch = searchParams.get(pageParam);
  const page = pageSearch ? +pageSearch : 0;

  const previousPage = new URLSearchParams({
    ...Object.fromEntries(searchParams),
    [pageParam]: `${page - 1}`,
  });

  const nextPage = new URLSearchParams({
    ...Object.fromEntries(searchParams),
    [pageParam]: `${page + 1}`,
  });

  const resetPage = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(pageParam);
      return next;
    });
  };

  return {
    page,
    resetPage,
    PaginationComponent: ({
      amount,
      total,
    }: {
      amount?: number;
      total?: number;
    }) => {
      const showNextPage = total && total > pageSize * (page + 1);
      const showPrev = page > 0;
      const showNext = amount === pageSize || !!showNextPage;

      if (!showPrev && !showNext) return null;

      return (
        <div className="flex items-center justify-between py-3 text-sm">
          {showPrev ? (
            <Link
              to={`?${previousPage.toString()}`}
              className="inline-flex items-center gap-1.5 text-(--mi-light-foreground-color) hover:text-(--mi-normal-foreground-color) no-underline transition-colors"
            >
              <FaChevronLeft /> Previous
            </Link>
          ) : (
            <span />
          )}
          {showNext && (
            <Link
              to={`?${nextPage.toString()}`}
              className="inline-flex items-center gap-1.5 text-(--mi-light-foreground-color) hover:text-(--mi-normal-foreground-color) no-underline transition-colors"
            >
              Next <FaChevronRight />
            </Link>
          )}
        </div>
      );
    },
  };
};

export default usePagination;
