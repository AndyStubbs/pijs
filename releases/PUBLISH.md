# Publishing Pi.js

Run the release checks from the repository root:

```sh
npm test
npm run test:firefox
```

Follow the [browser validation policy](../test/README.md#release-browser-coverage).
Review the [v2.3 update guide](../docs/UPGRADE-V2.3.md), package README, and changelog.
Resolve failures and pending baseline approvals before preparing the package.

Build and inspect the distribution:

```sh
npm run build
npm run release:check
cd releases/pi-latest
npm pack --dry-run
```

`npm run release:check` confirms that `package.json`, `releases/pi-latest/package.json`, and the
version banners of the bundles and declarations agree. Confirm the full/lite builds, plugin
exports, and declarations. The package must contain distribution files and user documentation,
without test campaigns or temporary output.

## Tag and verify

Commit everything for the release to `main` through a pull request first. Then tag that commit
and push the tag. From the repository root, replace `2.3.0` with the version in
`releases/pi-latest/package.json`:

```sh
git tag -a v2.3.0 -m "Release v2.3.0"
git push origin v2.3.0
```

The tag starts the release workflow (`.github/workflows/release.yml`). It runs the tests on
Linux, Windows, and macOS, builds the package on Linux, checks that the tag and the versions
agree, and attaches the packed tarball to the draft GitHub release `v2.3.0`. Follow it with:

```sh
gh run watch
```

If the workflow fails, fix the cause on `main`, then move the tag to the fixed commit and push
it again (`git tag -f -a v2.3.0 -m "Release v2.3.0"`, then `git push -f origin v2.3.0`). The
workflow updates the same draft.

## Publish

Publish the tarball the release workflow verified, not a local build. Download it from the
draft release and publish it:

```sh
gh release download v2.3.0 --pattern "*.tgz"
npm login
npm publish pijs-web-2.3.0.tgz --access public
```

Then publish the GitHub release. The tag already exists, so this starts no new workflow run:

```sh
gh release edit v2.3.0 --draft=false
```

A published release is never changed by the workflow; a later run for the same tag fails
instead.

## Snapshot

Copy `releases/pi-latest/dist` to the versioned snapshot `releases/pi-<version>`, named from
the version in `releases/pi-latest/package.json`. Run it on the tagged commit, after
`npm run build`:

```sh
npm run snapshot
```

The command refuses to overwrite an existing snapshot. Commit the snapshot through a pull
request.
