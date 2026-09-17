# Publishing Pi.js

Run the release checks from the repository root:

```sh
npm test
npm run test:firefox
```

Follow the [browser validation policy](../test/README.md#release-browser-coverage).
Review the [v2.2 update guide](../docs/upgrade-2.2.md), package README, and changelog.
Resolve failures and pending baseline approvals before preparing the package.

Build and inspect the distribution:

```sh
npm run build
cd releases/pi-latest
npm pack --dry-run
```

Confirm the package version, full/lite builds, plugin exports, and declarations. The package
must contain distribution files and user documentation, without test campaigns or temporary output.

When publication is intended:

```sh
npm login
npm publish --access public
```

The legacy Canvas2D package uses the `canvas2d` npm tag.
