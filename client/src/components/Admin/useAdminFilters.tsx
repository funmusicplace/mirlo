import Button from "components/common/Button";
import FormComponent from "components/common/FormComponent";
import { InputEl } from "components/common/Input";
import { SelectEl } from "components/common/Select";
import { useForm } from "react-hook-form";

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
  )[];
}) => {
  const { register, handleSubmit } = useForm();

  const submitToSearchParams = (
    data?:
      | string
      | string[][]
      | Record<string, string>
      | URLSearchParams
      | undefined
  ) => {
    let search = new URLSearchParams();
    if (data) {
      search = new URLSearchParams(data);
    }
    onSubmitFilters(search);
  };

  return {
    Filters: () => (
      <form onSubmit={handleSubmit(submitToSearchParams)}>
        {fields.includes("acceptPayments") && (
          <FormComponent>
            <SelectEl {...register("acceptPayments")}>
              <option value="">All</option>
              <option value="true">Can accept payments</option>
            </SelectEl>
          </FormComponent>
        )}
        {fields.includes("isPublished") && (
          <FormComponent>
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
        {fields.includes("name") && (
          <FormComponent>
            <label>name</label>
            <InputEl {...register("name")} />
          </FormComponent>
        )}
        {fields.includes("title") && (
          <FormComponent>
            <label>title</label>
            <InputEl {...register("title")} />
          </FormComponent>
        )}
        <Button>Filter</Button>
      </form>
    ),
  };
};

export default useAdminFilters;
