declare global {
  namespace PrismaJson {
    // you can use classes, interfaces, types, etc.
    type ArtistLink = {
      url: string;
      name: string;
    };
    type Settings = {
      platformPercent: number;
    };
  }
}

export {};
