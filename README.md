# IPM (Inkdrop Package Manager)

This is a utility module for managing Inkdrop packages and themes in the desktop app and other tools.

## Install

```sh
npm install @inkdropapp/ipm
```

## Usage

Import:

```ts
import { IPM } from '@inkdropapp/ipm'

const options = {
  // options for IPM
}
const ipm = new IPM(options)
```

### `getInstalled(): Promise<PackageMetadata[]>`

List installed packages:

```ts
const installedPackages = await ipm.getInstalled()
```

### `getOutdated(): Promise<OutdatedPackageInfo[]>`

List outdated packages:

```ts
const outdatedPackages = await ipm.getOutdated()
```

### `install(name: string, version?: string)`

- `name`: Name of the package to install
- `version`: Optional specific version to install. If not provided, it installs the latest version.

````ts

Install package:

```ts
const result = await ipm.install(package)
````

### `update(name: string, version?: string)`

- `name`: Name of the package to update
- `version`: Optional specific version to update to. If not provided, it updates to the latest version.

````ts

Update package:

```ts
const result = await ipm.update('package-name')
````

### `link(packagePath: string, opts?: { dev?: boolean; name?: string }): Promise<string>`

Create a symlink for a local package in the Inkdrop packages directory. Useful for plugin development.

- `packagePath`: Path to the local package directory
- `opts.dev`: If true, links to `dev/packages` instead of `packages`
- `opts.name`: Override the package name (defaults to `name` from `package.json`, or the directory basename)

Returns the created symlink path.

```ts
// Link to packages/
await ipm.link('./my-plugin')

// Link to dev/packages/ for development
await ipm.link('./my-plugin', { dev: true })

// Link with a custom name
await ipm.link('./my-plugin', { dev: true, name: 'custom-name' })
```

### `uninstall(name: string)`

Uninstall package:

```ts
await ipm.uninstall('package-name')
```

### `publish(opts: { dryrun?: boolean; path?: string })`

Publish a package to the registry. It will use `cwd` to locate the package to publish.

- `dryrun`: If true, simulates the publish process without actually publishing. Default is `false`.
- `path`: Path to the package directory. If not provided, it uses the current working directory.

```ts
await ipm.publish({ dryrun: true, path: './my-package' })
```

### `unpublish(name: string, opts?: { version?: string })`

Unpublish a package or specific version from the registry.

- `name`: Name of the package to unpublish
- `opts.version`: Optional specific version to unpublish. If not provided, unpublishes the entire package.

```ts
// Unpublish entire package
await ipm.unpublish('package-name')

// Unpublish specific version
await ipm.unpublish('package-name', { version: '1.0.0' })
```

### `registry.getPackageInfo(name: string): Promise<PackageInfo>`

Get a package from the registry:

```ts
const packageInfo = await ipm.registry.getPackageInfo('package-name')
```

- `name`: The name of the package to get

### `registry.getPackageVersionInfo(name: string, version: string): Promise<PackageVersionInfo>`

Get information about a specific version of a package:

```ts
const versionInfo = await ipm.registry.getPackageVersionInfo('package-name', '1.0.0')
```

- `name`: The name of the package
- `version`: The specific version to get information for

### `registry.search(params: { q: string }): Promise<PackageInfo[]>`

Search packages with a keyword. Results are filtered to versions compatible with the client's Inkdrop major.

```ts
const searchResults = await ipm.registry.search({ q: 'markdown' })
```

- `q`: Search query string

### `registry.getPackages(opts?: { sort: string, page: number, theme: boolean }): Promise<PackageInfo[]>`

Get packages from the registry:

```ts
const packages = await ipm.registry.getPackages({ sort: 'recency', page: 0 })
```

- `sort`: Sort order ('majority', 'recency', 'newness', 'theme-majority', 'theme-recency', 'theme-newness')
- `page`: Page number for pagination
- `theme`: Whether to filter for themes only

## Development

### Prerequisites

- Node.js 20.x or higher
- pnpm

### Setup

```sh
pnpm install
```

### Scripts

- `pnpm test` - Run tests (Vitest)
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run lint` - Run oxlint
- `pnpm run lint:fix` - Run oxlint with auto-fix
- `pnpm run format` - Format code with oxfmt
- `pnpm run typecheck` - Run TypeScript type checking
- `pnpm run build` - Build with tsdown

### CI/CD

This project uses GitHub Actions for continuous integration. The CI pipeline runs:

- Tests on Node.js 24.x
- Cross-platform testing (Ubuntu, Windows, macOS)
- Linting with oxlint and format checking with oxfmt
- Type checking with TypeScript

All pull requests must pass CI checks before merging.
