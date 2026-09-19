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

Tag the published version on GitHub. From the repository root, replace `2.2.0` with the
current version from `releases/pi-latest/package.json`:

```sh
git tag -a v2.2.0 -m "Release v2.2.0"
git push origin v2.2.0
```

The legacy Canvas2D package uses the `canvas2d` npm tag.
