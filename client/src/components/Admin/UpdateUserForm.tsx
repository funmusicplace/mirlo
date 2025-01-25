// import Button from "components/common/Button";
import { InputEl } from "components/common/Input";
import { SelectEl } from "components/common/Select";
import React from "react";
import { useForm } from "react-hook-form";
// import { useOutletContext } from "react-router-dom";
// import { AdminUser } from "services/api/Admin";

export const UpdateUserForm: React.FC = () => {
  // const [user] = useOutletContext<[User]>();
  const { register, handleSubmit, reset } = useForm();

  // React.useEffect(() => {
  //   if (user) {
  //     reset({
  //       ...user,
  //       role: user.role.name,
  //     });
  //   }
  // }, [reset, user]);

  const doSave = React.useCallback((data: unknown) => {
    // console.log("saving", data);
  }, []);

  return (
    <form onSubmit={handleSubmit(doSave)}>
      <div>
        Email: <InputEl {...register("email")} />
      </div>
      <div>
        Display name: <InputEl {...register("displayName")} />
      </div>
      <div>
        Email confirmed?:
        <input type="checkbox" {...register("emailConfirmed")} />
      </div>
      <div>
        Full name:
        <InputEl {...register("fullName")} />
      </div>
      <div>
        Role:
        <SelectEl defaultValue="user" {...register("role")}>
          <option value="user">User</option>
          <option value="artist">Artist</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </SelectEl>
      </div>
    </form>
  );
};

export default UpdateUserForm;
