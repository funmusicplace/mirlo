declare global {
  namespace PrismaJson {
    // you can use classes, interfaces, types, etc.
    type ArtistLink = {
      url: string;
      name: string;
    };
    type Settings = {
      platformPercent: number;
      instanceArtistId?: number;
    };
    type Properties = {
      colors?: {
        primary?: string;
        secondary?: string;
        background?: string;
        foreground?: string;
      };
      emails?: {
        support?: string;
        purchase?: string;
      };
      titles?: {
        releases?: string;
        merch?: string;
        about?: string;
        posts?: string;
        roster?: string;
        groupName?: string;
        support?: string;
      };
      tileBackgroundImage?: boolean;
    };
  }
}

export {};
