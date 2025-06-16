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
