import { IPMRegistry } from '../src/registry'
import { access, unlink } from 'fs/promises'
import { join } from 'path'

describe('Real Tarball Download Test', () => {
  const registry = new IPMRegistry('https://api.inkdrop.app')

  it('should get package info for embed', async () => {
    const packageInfo = await registry.getPackageInfo('embed')

    expect(packageInfo.name).toBe('embed')
    expect(packageInfo.releases.latest).toBeDefined()
    console.log(`📦 embed latest version: ${packageInfo.releases.latest}`)
  })

  it('should get version info for embed@0.3.3', async () => {
    const versionInfo = await registry.getPackageVersionInfo('embed', '0.3.3')

    expect(versionInfo.name).toBe('embed')
    expect(versionInfo.version).toBe('0.3.3')
    expect(versionInfo.dist?.tarball).toBe(
      'https://api.inkdrop.app/v2/packages/embed/versions/0.3.3/tarball'
    )
    console.log(`📦 embed@0.3.3 tarball URL: ${versionInfo.dist?.tarball}`)
  })

  it('should download tarball for embed@0.3.3', async () => {
    const destPath = join('./tmp', 'embed-0.3.3.tgz')

    await registry.downloadPackageTarball('embed', '0.3.3', destPath)

    // Verify the file was downloaded
    await expect(access(destPath)).resolves.not.toThrow()
    console.log(`✅ Tarball downloaded to: ${destPath}`)

    // Clean up
    await unlink(destPath)
  }, 30000)
})
