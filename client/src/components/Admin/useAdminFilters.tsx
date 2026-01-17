import { css } from "@emotion/css";
import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { SelectEl } from "components/common/Select";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";

const useAdminFilters = ({
  onSubmitFilters,
  fields,
}: {
  onSubmitFilters: (data: any) => Promise<void>;
  fields: (
    | "acceptPayments"
    | "name"
    | "title"
    | "isPublished"
    | "artistName"
    | "datePurchased"
    | "pricePaid"
    | "email"
    | "lastSubscription"
    | "allowMirloPromo"
    | "search"
    | "pledgeStatus"
  )[];
}) => {
  const { register, handleSubmit } = useForm();
  const [_, setSearchParams] = useSearchParams();

  const submitToSearchParams = (
    data?: string | string[][] | Record<string, string> | undefined
  ) => {
    let search = new URLSearchParams();

    if (data) {
      let o = Object.fromEntries(
        Object.entries(data).filter(
          ([_, v]) => v !== null && v !== "" && v !== undefined
        )
      );
      search = new URLSearchParams(o);
    }

    setSearchParams(search, { replace: true });

    onSubmitFilters(search);
  };

  return {
    Filters: () => (
      <form
        onSubmit={handleSubmit(submitToSearchParams)}
        className={css`
          display: flex;
          align-items: center;

          > div {
            margin-right: 1rem;
          }
        `}
      >
        {fields.includes("acceptPayments") && (
          <FormComponent>
            <label>Accepts payments</label>
            <SelectEl {...register("acceptPayments")}>
              <option value="">All</option>
              <option value="true">Can accept payments</option>
            </SelectEl>
          </FormComponent>
        )}
        {fields.includes("isPublished") && (
          <FormComponent>
            <label>Is published</label>
            <SelectEl {...register("isPublished")}>
              <option value="">All</option>
              <option value="true">Is published</option>
            </SelectEl>
          </FormComponent>
        )}
        {fields.includes("artistName") && (
          <FormComponent>
            <label>artist.name</label>
            <InputEl {...register("artistName")} />
          </FormComponent>
        )}
        {fields.includes("allowMirloPromo") && (
          <FormComponent>
            <label>Allow Mirlo Promo</label>
            <InputEl type="checkbox" {...register("allowMirloPromo")} />
          </FormComponent>
        )}
        {fields.includes("name") && (
          <FormComponent>
            <label>name</label>
            <InputEl {...register("name")} />
          </FormComponent>
        )}
        {fields.includes("email") && (
          <FormComponent>
            <label>email</label>
            <InputEl {...register("email")} />
          </FormComponent>
        )}
        {fields.includes("title") && (
          <FormComponent>
            <label>title</label>
            <InputEl {...register("title")} />
          </FormComponent>
        )}
        {fields.includes("datePurchased") && (
          <FormComponent>
            <label>Date filter</label>
            <SelectEl {...register("datePurchased")}>
              <option value="">All</option>
              <option value="thisMonth">Current month to date</option>
              <option value="previousMonth">Previous month</option>
            </SelectEl>
          </FormComponent>
        )}
        {fields.includes("lastSubscription") && (
          <FormComponent>
            <label>Last subscription</label>
            <SelectEl {...register("lastSubscription")}>
              <option value="">All</option>
              <option value="thisMonth">Current month to date</option>
              <option value="previousMonth">Previous month</option>
            </SelectEl>
          </FormComponent>
        )}
        {fields.includes("pricePaid") && (
          <FormComponent>
            <label>Price paid</label>
            <SelectEl {...register("pricePaid")}>
              <option value="">All</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </SelectEl>
          </FormComponent>
        )}
        {fields.includes("search") && (
          <FormComponent>
            <label>Search</label>
            <InputEl placeholder="Search..." {...register("search")} />
          </FormComponent>
        )}
        {fields.includes("pledgeStatus") && (
          <FormComponent>
            <label>Pledge Status</label>
            <SelectEl {...register("pledgeStatus")}>
              <option value="">All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </SelectEl>
          </FormComponent>
        )}
        <Button>Filter</Button>
      </form>
    ),
  };
};

export default useAdminFilters;
