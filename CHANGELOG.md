# Changelog

## [1.1.0](https://github.com/funmusicplace/mirlo/compare/v1.0.0...v1.1.0) (2026-10-30)


### Features

* add custom splash screen fields to the admin general settings ([d686201](https://github.com/funmusicplace/mirlo/commit/d6862017d0403a0ca84eb93ae3246551a59d2ab7))
* add custom splash screen settings, image storage and route ([3e2c1d9](https://github.com/funmusicplace/mirlo/commit/3e2c1d9e7bf256914bf8ad106313958ef26f6973))
* **canimus:** enable fetching of full catalog in canimus format for owned clients ([4cdf278](https://github.com/funmusicplace/mirlo/commit/4cdf278c622bc050cad482688fd4a3ab4671bd8f)), closes [#2515](https://github.com/funmusicplace/mirlo/issues/2515)
* keep the current album cover until the new one is processed ([9b62e6b](https://github.com/funmusicplace/mirlo/commit/9b62e6b305734fdd65a4f7769527f4f47c996a29))
* keep the current avatar and banner until the new one is processed ([d04d788](https://github.com/funmusicplace/mirlo/commit/d04d788249d7b51ca5adb67dad92e9be8ed0c209))
* let UploadContext follow an image job without showing it in the upload panel ([848173a](https://github.com/funmusicplace/mirlo/commit/848173aad81cc33a726ef550bfde1f72da436706))
* reorder tiers ([9c7bdb6](https://github.com/funmusicplace/mirlo/commit/9c7bdb6f90ef8d7d430372dd33a41fa8cb5cfe63))
* reorder tiers ([52de345](https://github.com/funmusicplace/mirlo/commit/52de345081a981e3d634c61560cf6a36bd513945))
* show the custom splash screen on the home page ([024cffc](https://github.com/funmusicplace/mirlo/commit/024cffcac7639b3340ca26651b623e7e7df0e541))
* **translation:** add translation to our e-mail templates ([bd230a3](https://github.com/funmusicplace/mirlo/commit/bd230a388697e87530f1d63d8b38f8a1774c50e6)), closes [#341](https://github.com/funmusicplace/mirlo/issues/341)


### Bug Fixes

* add CI step to check commits ([96ee721](https://github.com/funmusicplace/mirlo/commit/96ee721e76e36daefaad43d2bc641b04ff1a2842))
* add CI step to check commits ([e078358](https://github.com/funmusicplace/mirlo/commit/e078358d25a36cacf223acf7e8cedabd5fb9d803))
* **canimus:** better handling of deleted content and better data filling ([4a2444d](https://github.com/funmusicplace/mirlo/commit/4a2444d05b062b5fbbcbe97dede7de5cbc225add))
* **canimus:** two issues with enabled artists in canimus feed ([f74781e](https://github.com/funmusicplace/mirlo/commit/f74781e21c3e9ba3c01766ab97eab030c4524816))
* **canimus:** various small fixes to how canimus gets loaded ([6021e4b](https://github.com/funmusicplace/mirlo/commit/6021e4b5f8466ae86b1beaf6d5cfcdb55140b970))
* **ci:** translations forgot to enable corepack ([b38ac2b](https://github.com/funmusicplace/mirlo/commit/b38ac2bd87cca2895dbac29d824b3a6886b426c7))
* **ci:** translations forgot to enable corepack ([2f045c0](https://github.com/funmusicplace/mirlo/commit/2f045c057334fba1bfcb45079731f0e9723ab9dc))
* **clients:** add the ability to change a client's name ([14b8890](https://github.com/funmusicplace/mirlo/commit/14b88900bb97aa20256e3be94de7f34291272443))
* **clients:** clean up admin clients table visually ([6e30cb3](https://github.com/funmusicplace/mirlo/commit/6e30cb359fbe719725a0325c5812de83c5583cbc))
* crash on pages with dates when French (France) or Spanish (Argen… ([2ab5fee](https://github.com/funmusicplace/mirlo/commit/2ab5fee826f21520a7590544713ba88f9597b95c))
* crash on pages with dates when French (France) or Spanish (Argentina) is active ([4569f70](https://github.com/funmusicplace/mirlo/commit/4569f700aa9c90f8be196e0845d1524ce5538369))
* **images:** clean up orphaned images ([d84e134](https://github.com/funmusicplace/mirlo/commit/d84e13473527fab181b0b150db0b9a62a0dfd46c))
* **interop:** better interoperability language ([a3dfd3b](https://github.com/funmusicplace/mirlo/commit/a3dfd3bf92b8f140038ecf78662d86c8cb0df19b)), closes [#2516](https://github.com/funmusicplace/mirlo/issues/2516)
* **metadata:** generate more concrete metadata for tracks ([63baca4](https://github.com/funmusicplace/mirlo/commit/63baca44c16b5c685f49a14901a8b2f589ba1b4d))
* **metadata:** generate more concrete metadata for tracks ([d5c1507](https://github.com/funmusicplace/mirlo/commit/d5c1507854d9bf339d03c63b35e981b9b05049c8)), closes [#830](https://github.com/funmusicplace/mirlo/issues/830)
* **metadata:** keep the uploaded file's copyright over the track license ([#830](https://github.com/funmusicplace/mirlo/issues/830)) ([7664444](https://github.com/funmusicplace/mirlo/commit/7664444b4fb06bf7d99d269c875049ed343a7ac9))
* preview the new avatar, banner or cover while it is processed ([5edc721](https://github.com/funmusicplace/mirlo/commit/5edc721a8c4f67871d6b6c4a41502a992927490b))
* **purchase:** don't switch a subscriber's tier when a hosted checkou… ([fc1d980](https://github.com/funmusicplace/mirlo/commit/fc1d98014b86af097eb665a65c5fba0d19f788e7))
* **purchase:** don't switch a subscriber's tier when a hosted checkout is created ([0c61cae](https://github.com/funmusicplace/mirlo/commit/0c61caeae5e860c9d62975e6757ec90a0b875c7b))
* reject image uploads with no file or over the size limit ([25657e7](https://github.com/funmusicplace/mirlo/commit/25657e7b4a33fad97383428ece068a750bac26f4))
* say when an image failed to process in the upload panel ([5807b27](https://github.com/funmusicplace/mirlo/commit/5807b271533714f257d7662b70fe9bcf9680619c))
* **storybook:** fix storybook tests ([831b958](https://github.com/funmusicplace/mirlo/commit/831b9584408fc677d94aa7c68a087296de535820))
* **subscriptions:** bill tier upgrades and keep date, releases and history across switches ([d09245f](https://github.com/funmusicplace/mirlo/commit/d09245f95d5fc534029f615a8ca0246acecbe088))
* **subscriptions:** handle credit-paid and early switch invoices ([3ee0a17](https://github.com/funmusicplace/mirlo/commit/3ee0a1799045b4c090264a5164a1a385fec814a3))
* **subscriptions:** never switch tiers when a checkout starts; credit unused time ([8ad5d03](https://github.com/funmusicplace/mirlo/commit/8ad5d03d51e13d6eb3f1707c356563f986b1ed11))
* **translation:** keep each email in one language and show the charged currency ([#341](https://github.com/funmusicplace/mirlo/issues/341)) ([0507251](https://github.com/funmusicplace/mirlo/commit/0507251c0c5a750659466a9c172b0525b6a2b7b1))
* **translation:** only sync browser language to the profile when none is set ([#341](https://github.com/funmusicplace/mirlo/issues/341)) ([af5a54c](https://github.com/funmusicplace/mirlo/commit/af5a54c17b05bad5ef43f0b4583222c89e8062b7))
