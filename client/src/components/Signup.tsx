import { css } from "@emotion/css";
import React from "react";
import { useForm } from "react-hook-form";
import api from "services/api";
import Button from "./common/Button";
import { InputEl } from "./common/Input";

type SignupInputs = {
  email: string;
  name: string;
  password: string;
};

function Signup() {
  const { register, handleSubmit } = useForm<SignupInputs>();

  const onSubmit = React.useCallback(async (data: SignupInputs) => {
    await api.post("signup", data, { credentials: undefined });
  }, []);

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
    </div>
  );
}

export default Signup;
