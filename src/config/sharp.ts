export default {
  defaultOptions: {
    webp: {
      ext: ".webp",
      outputOptions: {
        chromaSubsampling: "4:4:4",
        lossless: true,
        optimiseCoding: true,
        quantisationTable: 3,
        progressive: false,
        smartSubsample: true,
      },
    },
    jpeg: {
      ext: ".jpg",
      outputOptions: {
        chromaSubsampling: "4:4:4",
        optimiseCoding: true,
        quantisationTable: 3,
        progressive: false,
        optimiseScans: false, // required mozjpeg support
        trellisQuantisation: true, // required mozjpeg support
        overshootDeringing: true, // required mozjpeg support
      },
    },
  },
  config: {
    banner: {
      webp: {
        variants: [
          { width: 2500, height: 500 },
          { width: 1250, height: 250 },
          { width: 625, height: 125 },
        ],
      },
      jpeg: {
        variants: [
          { width: 2500, height: 500 },
          { width: 1250, height: 250 },
          { width: 625, height: 125 },
        ],
      },
    },
    avatar: {
      webp: {
        variants: [
          { width: 1500, height: 1500 },
          { width: 1200, height: 1200 },
          { width: 960, height: 960 },
          { width: 600, height: 600 },
          { width: 300, height: 300 },
          { width: 120, height: 120 },
          { width: 60, height: 60 },
        ],
      },
      jpeg: {
        variants: [
          { width: 1500, height: 1500 },
          { width: 1200, height: 1200 },
          { width: 960, height: 960 },
          { width: 600, height: 600 },
          { width: 300, height: 300 },
          { width: 120, height: 120 },
          { width: 60, height: 60 },
        ],
      },
    },
    artwork: {
      webp: {
        variants: [
          { width: 1500, height: 1500 },
          { width: 1200, height: 1200 },
          { width: 960, height: 960 },
          { width: 600, height: 600 },
          { width: 300, height: 300 },
          { width: 120, height: 120 },
          { width: 60, height: 60 },
        ],
      },
      jpeg: {
        variants: [
          { width: 1500, height: 1500 },
          { width: 1200, height: 1200 },
          { width: 960, height: 960 },
          { width: 600, height: 600 },
          { width: 300, height: 300 },
          { width: 120, height: 120 },
          { width: 60, height: 60 },
        ],
      },
    },
  },
};
