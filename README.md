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

### `getPackage(name: string, version?: string)`

Get package metadata:

```ts
const metadata = await ipm.getPackage('package-name')
```

Get with a specific package version:

```ts
const version = await ipm.getPackage('package-name', 'version-name')
```

### `getInstalled()`

Get installed packages:

```ts
const installedPackages = await ipm.getInstalled()
```

### `getOutdated()`

Get outdated packages:

```ts
const outdatedPackages = await ipm.getOutdated()
```

### `install(package: PackageVersionInfo)`

Install package:

```ts
const result = await ipm.installPackage(package)
```

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
