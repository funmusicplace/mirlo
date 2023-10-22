import "@emotion/react";

declare module "@emotion/react" {
  interface Color {
    main: string;
  }

  export interface Theme {
    type: "dark" | "light";
    colors: {
      primary: string;
      primaryHighlight: string;
      text: string;
      textDark: string;
      background: string;
      backgroundDark: string;
      warning: string;
      success: string;
      translucentTint: string;
      translucentShade: string;
      black: string;
      white: string;
      pink: {
        main: string;
        light: string;
      };
    };
    borderRadius: string;
    typography: {
      fontFamily: string;
    };
  }
}
