Inkdrop uses `package.json` to allow plugins to include dependencies and metadata.

When installing a package, the app should also install its dependencies listed in `package.json`.
However, unlike npm, Inkdrop doesn't need to support native modules, so you can just download other dependency packages.
Also, the dependencies are always hosted on npm.

The packages should be stored in the `getInkdropDirectory()/packages` directory, which is the Inkdrop's data directory. For example, on macOS, it should be `~/Library/Application Support/inkdrop/packages/<package_name>`.`

So, the installation process is as follows:

- The user calls `ipm.install(package)`
- Download the package tarball from the IPM registry by calling `ipm.registry.downloadPackageTarball()`
  For example, `https://api.inkdrop.app/v1/packages/vim/versions/2.2.2/tarball`
- Unpack the tarball to the `getInkdropDirectory()/packages/<package_name>` directory
- Install the dependencies listed in `package.json`

The dependencies could have recursive dependencies, which is the most complex part.
But I think we can just install the dependencies in a root `node_modules` directory since the most plugins are simple.
