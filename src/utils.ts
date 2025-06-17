import semver from 'semver'
import { PackageInfo } from './types'

export function normalizeVersion(version: string) {
  if (typeof version === 'string') {
    // Remove commit SHA suffix
    return version.replace(/-.*$/, '')
  } else {
    return version
  }
}

// Utility function to get error messages from responses
export async function getErrorMessage(response: Response) {
  let message = `HTTP ${response.status}: ${response.statusText}`
  try {
    const body = (await response.json()) as any
    if (body.message) {
      message += ` - ${body.message}`
    }
  } catch (_e) {
    // Failed to parse JSON, ignore and use basic message
  }
  return message
}

export function getLatestCompatibleVersion(
  pack: PackageInfo,
  targetInkdropVersion: string | null
) {
  if (!targetInkdropVersion) {
    return pack.releases.latest
  }

  let latestVersion: string | null = null
  for (const version in pack.versions) {
    const metadata = pack.versions[version]
    if (!semver.valid(version)) continue
    if (!metadata) continue

    const engine = metadata.engines?.inkdrop || '*'
    if (!semver.validRange(engine)) continue
    if (!semver.minSatisfying([targetInkdropVersion, '4.7.0'], engine)) {
      continue
    }
    if (latestVersion == null) {
      latestVersion = version
    }
    if (semver.gt(version, latestVersion)) {
      latestVersion = version
    }
  }
  return latestVersion
}
