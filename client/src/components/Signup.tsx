import { css } from "@emotion/css";
import React from "react";
import { useForm } from "react-hook-form";
import api from "services/api";
import Button from "./common/Button";
import { InputEl } from "./common/Input";
import { useSnackbar } from "state/SnackbarContext";

type SignupInputs = {
  email: string;
  name: string;
  password: string;
};

function Signup() {
  const snackbar = useSnackbar();

  const { register, handleSubmit } = useForm<SignupInputs>();

  const onSubmit = React.useCallback(
    async (data: SignupInputs) => {
      try {
        const signup = await api.post("signup", data, {
          credentials: undefined,
        });
        console.log("signup", signup);
        snackbar("Registration success", { type: "success" });
      } catch (e) {
        snackbar((e as Error).message, { type: "warning" });
        console.error(e);
      }
    },
    [snackbar]
  );

  return (
    <div>
      <form
        className={css`
          max-width: 200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
        `}
        onSubmit={handleSubmit(onSubmit)}
      >
        <h2>Register</h2>
        <label>name: </label>
        <InputEl type="input" {...register("name")} />
        <label>email: </label>
        <InputEl type="email" {...register("email")} />
        <label>password: </label>
        <InputEl {...register("password")} type="password" />
        <Button type="submit">Sign up</Button>
      </form>
      <img
        alt="blackbird"
        src="/images/blackbird.png"
        className={css`
          width: 100%;
          padding: 4rem 0;
        `}
      />
    </div>
  );
}

export default Signup;
