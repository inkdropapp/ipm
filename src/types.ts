export type PackageSortOptions =
  | 'majority'
  | 'recency'
  | 'newness'
  | 'theme-majority'
  | 'theme-recency'
  | 'theme-newness'

export interface IPMOptions {
  appVersion: string
  appHomePath?: string
  appDataPath?: string
  resourcePath?: string
  apiUrl?: string
  packagesUrl?: string
  accessKeyId?: string
  secretAccessKey?: string
}

export type PackageInfo = {
  name: string
  created_at: number
  updated_at: number
  repository: string
  downloads: number
  releases: {
    latest: string
  }
  readme: string
  metadata: PackageMetadata
  versions?: Record<string, PackageVersionInfo>
  palette?: {
    url: string
  }
}

export type PackageMetadata = {
  name: string
  main: string
  version: string
  description: string
  keywords?: string[]
  repository: string
  license?: string
  engines?: {
    inkdrop?: string
  }
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  // v6 themes declare `theme: true`. The `'ui' | 'syntax' | 'preview'` values are
  // the pre-v6 separate theme types, obsolete now that themes are unified, but still
  // found in installed packages' package.json on disk.
  theme?: boolean | 'ui' | 'syntax' | 'preview'
}

export type PackageVersionInfo = PackageMetadata & {
  dist: {
    tarball: string
  }
}

export type OutdatedPackageInfo = {
  name: string
  version: string
  latestVersion: string
}
