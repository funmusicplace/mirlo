import { css } from "@emotion/css";
import React from "react";
import { useForm } from "react-hook-form";
import { useGlobalStateContext } from "../state/GlobalState";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Button from "./common/Button";
import Input, { InputEl } from "./common/Input";

type SignupInputs = {
  email: string;
  password: string;
};

function Login() {
  const { dispatch } = useGlobalStateContext();
  const { register, handleSubmit } = useForm<SignupInputs>();
  const navigate = useNavigate();

  const onSubmit = React.useCallback(
    async (data: SignupInputs) => {
      await api.post("login", data);

      const user = await api.get<LoggedInUser>("profile");
      dispatch({
        type: "setLoggedInUser",
        user,
      });
      navigate("/");
    },
    [dispatch, navigate]
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
        <h2>Log in</h2>
        <label>email: </label>
        <InputEl type="email" {...register("email")} />
        <label>password: </label>
        <InputEl {...register("password")} type="password" />
        <Button type="submit">Log in</Button>
      </form>
    </div>
  );
}

export default Login;
