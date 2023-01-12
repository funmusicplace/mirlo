import React from "react";

export type Variant = "success" | "warning" | undefined;

const SnackbarContext = React.createContext<{
  msg: string;
  isDisplayed: boolean;
  displayMessage: (msg: string, options?: { type: Variant }) => void;
  onClose?: () => void;
  variant: Variant;
}>({
  msg: "",
  isDisplayed: false,
  displayMessage: (msg: string, options?: { type: Variant }) => {},
  onClose: undefined,
  variant: undefined,
});

export default SnackbarContext;

export const SnackBarContextProvider: React.FC<{
  children: React.ReactElement;
}> = (props) => {
  const [msg, setMsg] = React.useState("");
  const [isDisplayed, setIsDisplayed] = React.useState(false);
  const [variant, setVariant] = React.useState<Variant>();
  const timer = React.useRef<NodeJS.Timeout>();

  const displayHandler = (msg: string, options?: { type: Variant }) => {
    setMsg(msg);
    setIsDisplayed(true);
    setVariant(options?.type);
    timer.current = setTimeout(() => {
      closeHandler();
    }, 3000); // close snackbar after 3 seconds
  };

  const closeHandler = () => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    setIsDisplayed(false);
    setVariant(undefined);
  };

  return (
    <SnackbarContext.Provider
      value={{
        msg,
        isDisplayed,
        displayMessage: displayHandler,
        onClose: closeHandler,
        variant,
      }}
    >
      {props.children}
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = () => {
  const { displayMessage } = React.useContext(SnackbarContext);
  return displayMessage;
};
