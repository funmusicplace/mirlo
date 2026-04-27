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
      emailProvider?: {
        provider?: "sendgrid" | "mailgun";
        fromEmail?: string;
        sendgrid?: {
          apiKey?: string;
        };
        mailgun?: {
          apiKey?: string;
          domain?: string;
        };
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
        artistId?: string;
        purchaseEmail?: string;
        showHeroOnHome?: boolean;
        colors?: {
          button?: string;
          buttonText?: string;
          background?: string;
          text?: string;
          body?: string;
        };
      };
    };
    type Properties = {
      colors?: {
        button?: string;
        buttonText?: string;
        background?: string;
        text?: string;
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
    type NotificationMetaData = {
      ap: {
        actor: string;
      };
    };
  }
}

export {};
