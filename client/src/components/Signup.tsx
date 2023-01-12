import { css } from "@emotion/css";
import React from "react";
import { useForm } from "react-hook-form";
import api from "services/api";

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
        <input type="input" {...register("name")} />
        <label>email: </label>
        <input type="email" {...register("email")} />
        <label>password: </label>
        <input {...register("password")} type="password" />
        <button type="submit">Sign up</button>
      </form>
    </div>
  );
}

export default Signup;
