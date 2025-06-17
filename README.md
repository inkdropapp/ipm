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

### `uninstall(name: string)`

Uninstall package:

```ts
await ipm.uninstall('package-name')
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
const versionInfo = await ipm.registry.getPackageVersionInfo(
  'package-name',
  '1.0.0'
)
```

- `name`: The name of the package
- `version`: The specific version to get information for

### `registry.search(params: { q: string, sort?: string, direction?: string }): Promise<PackageInfo[]>`

Search packages with keyword:

```ts
const searchResults = await ipm.registry.search({ q: 'markdown' })
```

- `q`: Search query string
- `sort`: Sort order ('score', 'majority', 'recency', 'newness', 'theme-majority', 'theme-recency', 'theme-newness')
- `direction`: Sort direction ('desc' or 'asc')

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
- npm

### Setup

```sh
npm install
```

### Scripts

- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run typecheck` - Run TypeScript type checking

### CI/CD

This project uses GitHub Actions for continuous integration. The CI pipeline runs:

- Tests on Node.js 18.x, 20.x, and 22.x
- Cross-platform testing (Ubuntu, Windows, macOS)
- Linting with ESLint
- Type checking with TypeScript

All pull requests must pass CI checks before merging.
