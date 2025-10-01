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
    png: {
      ext: ".png",
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
    square: {
      webp: {
        variants: [
          { width: 3000, height: 3000 },
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
          { width: 3000, height: 3000 },
          { width: 1500, height: 1500 },
          { width: 1200, height: 1200 },
          { width: 960, height: 960 },
          { width: 600, height: 600 },
          { width: 300, height: 300 },
          { width: 120, height: 120 },
          { width: 60, height: 60 },
        ],
      },
      png: {
        variants: [
          { width: 3000, height: 3000 },
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
    banner: {
      webp: {
        variants: [
          { width: 2500, height: 2500 },
          { width: 1250, height: 1250 },
          { width: 1200, height: 630 },
          { width: 1024, height: 1024 },
          { width: 625, height: 625 },
        ],
      },
      // jpeg: {
      //   variants: [
      //     { width: 2500, height: 2500 },
      //     { width: 1250, height: 1250 },
      //     { width: 1200, height: 630 },
      //     { width: 1024, height: 1024 },
      //     { width: 625, height: 625 },
      //   ],
      // },
      // png: {
      //   variants: [
      //     { width: 2500, height: 2500 },
      //     { width: 1250, height: 1250 },
      //     { width: 1200, height: 630 },
      //     { width: 1024, height: 1024 },
      //     { width: 625, height: 625 },
      //   ],
      // },
    },
    avatar: {
      webp: {
        variants: [
          { width: 3000, height: 3000 },
          { width: 1500, height: 1500 },
          { width: 1200, height: 1200 },
          { width: 960, height: 960 },
          { width: 600, height: 600 },
          { width: 300, height: 300 },
          { width: 120, height: 120 },
          { width: 60, height: 60 },
        ],
      },
      // jpeg: {
      //   variants: [
      //     { width: 1500, height: 1500 },
      //     { width: 1200, height: 1200 },
      //     { width: 960, height: 960 },
      //     { width: 600, height: 600 },
      //     { width: 300, height: 300 },
      //     { width: 120, height: 120 },
      //     { width: 60, height: 60 },
      //   ],
      // },
      // png: {
      //   variants: [
      //     { width: 1500, height: 1500 },
      //     { width: 1200, height: 1200 },
      //     { width: 960, height: 960 },
      //     { width: 600, height: 600 },
      //     { width: 300, height: 300 },
      //     { width: 120, height: 120 },
      //     { width: 60, height: 60 },
      //   ],
      // },
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
      png: {
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
