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

## Development

### Prerequisites

- Node.js 18.x or higher
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
