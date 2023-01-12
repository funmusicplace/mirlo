import "@emotion/react";

declare module "@emotion/react" {
  interface Color {
    main: string;
  }

  export interface Theme {
    colors: {
      primary: string;
      primaryHighlight: string;
      text: string;
      textDark: string;
      background: string;
      backgroundDark: string;
      warning: string;
      success: string;
    };
  }
}
