declare global {
  namespace PrismaJson {
    // you can use classes, interfaces, types, etc.
    type ArtistLink = {
      url: string;
      name: string;
    };
    type Settings = {
      platformPercent: number;
      defaultCurrency?: string;
      stripe?: {
        key?: string;
        webhookSigningSecret?: string;
        webhookConnectSigningSecret?: string;
      };
      sendgrid?: {
        apiKey?: string;
        fromEmail?: string;
      };
      s3?: {
        keyId?: string;
        applicationKey?: string;
        keyName?: string;
        endpoint?: string;
        region?: string;
      };
      instanceCustomization?: {
        title?: string;
        supportEmail?: string;
        artistId?: number;
        purchaseEmail?: string;
        showHeroOnHome?: boolean;
        colors?: {
          primary?: string;
          secondary?: string;
          background?: string;
          foreground?: string;
        };
      };
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
