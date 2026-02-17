import { CommandGetOutdated } from '../src/commands/get-outdated'
import { CommandInstall } from '../src/commands/install'
import { Environment } from '../src/environment'
import { IPMRegistry } from '../src/registry'

describe('Real Get Outdated Test', () => {
  it('should detect outdated packages with real data from ./tmp directory', async () => {
    // Create a real environment and registry for actual operations
    const realEnvironment = new Environment({
      appVersion: '5.9.0',
      appHomePath: './tmp' // Use ./tmp directory
    })
    const realRegistry = new IPMRegistry('5.9.0', 'https://api.inkdrop.app')

    console.log('🔍 Starting real getOutdated test with math package...')

    // First, ensure we have the math package installed for testing
    const realCommandInstall = new CommandInstall(
      '5.9.0',
      realEnvironment,
      realRegistry
    )

    const realCommandGetOutdated = new CommandGetOutdated(
      '5.9.0',
      realEnvironment,
      realRegistry
    )

    const fs = await import('fs/promises')
    const path = await import('path')

    // Check if math package is already installed
    const packageDir = path.default.join('./tmp', 'packages', 'math')
    const packageJsonPath = path.default.join(packageDir, 'package.json')

    let currentVersion: string

    try {
      await fs.access(packageJsonPath)
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8')
      const packageJson = JSON.parse(packageJsonContent)
      currentVersion = packageJson.version
      console.log(`📦 Math package already installed (v${currentVersion})`)
    } catch {
      console.log('📦 Math package not found, installing it first...')
      await realCommandInstall.run('math')

      // Read the version after installation
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8')
      const packageJson = JSON.parse(packageJsonContent)
      currentVersion = packageJson.version
      console.log(`✅ Math package installed (v${currentVersion})`)
    }

    // Now test getOutdated to see if math package needs updates
    console.log('🔍 Checking for outdated packages...')
    const outdatedPackages = await realCommandGetOutdated.run()

    console.log(`📊 Found ${outdatedPackages.length} outdated package(s)`)

    // Check if math package is in the outdated list
    const mathOutdated = outdatedPackages.find(pkg => pkg.name === 'math')

    if (mathOutdated) {
      console.log(`📈 Math package is outdated:`)
      console.log(`   Current version: ${mathOutdated.version}`)
      console.log(`   Latest version:  ${mathOutdated.latestVersion}`)

      expect(mathOutdated.name).toBe('math')
      expect(mathOutdated.version).toBeDefined()
      expect(mathOutdated.latestVersion).toBeDefined()
      expect(mathOutdated.version).not.toBe(mathOutdated.latestVersion)

      // Validate version format
      expect(mathOutdated.version).toMatch(/^\d+\.\d+\.\d+/)
      expect(mathOutdated.latestVersion).toMatch(/^\d+\.\d+\.\d+/)
    } else {
      console.log(`✅ Math package is up to date (v${currentVersion})`)
    }

    // Test that the function returns an array
    expect(Array.isArray(outdatedPackages)).toBe(true)

    // Log all outdated packages for debugging
    if (outdatedPackages.length > 0) {
      console.log('\n📋 All outdated packages:')
      outdatedPackages.forEach(pkg => {
        console.log(`   • ${pkg.name}: ${pkg.version} → ${pkg.latestVersion}`)
      })
    } else {
      console.log('✨ All packages are up to date!')
    }

    // Verify the structure of any outdated packages
    outdatedPackages.forEach(pkg => {
      expect(pkg).toHaveProperty('name')
      expect(pkg).toHaveProperty('version')
      expect(pkg).toHaveProperty('latestVersion')
      expect(typeof pkg.name).toBe('string')
      expect(typeof pkg.version).toBe('string')
      expect(typeof pkg.latestVersion).toBe('string')
    })

    console.log('✅ Real getOutdated test completed successfully')
  }, 60000) // 60 second timeout for real API calls and file operations

  it('should handle case with no packages installed', async () => {
    // Create a separate environment pointing to a non-existent directory
    const emptyEnvironment = new Environment({
      appVersion: '5.9.0',
      appHomePath: './tmp-empty-test' // Use a directory that doesn't exist
    })
    const realRegistry = new IPMRegistry('5.9.0', 'https://api.inkdrop.app')

    const realCommandGetOutdated = new CommandGetOutdated(
      '5.9.0',
      emptyEnvironment,
      realRegistry
    )

    console.log('🔍 Testing getOutdated with no packages installed...')

    const outdatedPackages = await realCommandGetOutdated.run()

    expect(Array.isArray(outdatedPackages)).toBe(true)
    expect(outdatedPackages).toHaveLength(0)

    console.log('✅ Correctly handled empty packages directory')
  }, 30000)

  it('should create an outdated scenario by downgrading math package', async () => {
    // This test simulates an outdated package by manually creating an older version
    const realEnvironment = new Environment({
      appVersion: '5.9.0',
      appHomePath: './tmp-outdated-test'
    })
    const realRegistry = new IPMRegistry('5.9.0', 'https://api.inkdrop.app')

    const realCommandGetOutdated = new CommandGetOutdated(
      '5.9.0',
      realEnvironment,
      realRegistry
    )

    const fs = await import('fs/promises')
    const path = await import('path')

    console.log('🔧 Creating simulated outdated package scenario...')

    // Create the packages directory structure
    const packagesDir = path.default.join('./tmp-outdated-test', 'packages')
    const mathPackageDir = path.default.join(packagesDir, 'math')

    await fs.mkdir(mathPackageDir, { recursive: true })

    // Create a fake outdated package.json for math package
    const outdatedPackageJson = {
      name: 'math',
      version: '1.0.0', // Much older version than current
      main: './lib/index',
      description:
        'Add math syntax support to the editor and the preview (outdated test version)',
      repository: 'https://github.com/inkdropapp/inkdrop-math',
      engines: {
        inkdrop: '>=5.0.0'
      }
    }

    const packageJsonPath = path.default.join(mathPackageDir, 'package.json')
    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(outdatedPackageJson, null, 2)
    )

    console.log(
      `📦 Created simulated outdated math package (v${outdatedPackageJson.version})`
    )

    // Now test getOutdated
    const outdatedPackages = await realCommandGetOutdated.run()

    console.log(`📊 Found ${outdatedPackages.length} outdated package(s)`)

    // Math should definitely be outdated since we set it to v1.0.0
    const mathOutdated = outdatedPackages.find(pkg => pkg.name === 'math')

    expect(mathOutdated).toBeDefined()
    expect(mathOutdated!.name).toBe('math')
    expect(mathOutdated!.version).toBe('1.0.0')
    expect(mathOutdated!.latestVersion).toBeDefined()

    console.log(`📈 Confirmed math package is outdated:`)
    console.log(`   Current version: ${mathOutdated!.version}`)
    console.log(`   Latest version:  ${mathOutdated!.latestVersion}`)

    // Clean up the test directory
    try {
      await fs.rm('./tmp-outdated-test', { recursive: true, force: true })
      console.log('🧹 Cleaned up test directory')
    } catch (error) {
      console.log('⚠️ Could not clean up test directory:', error)
    }

    console.log('✅ Simulated outdated scenario test completed successfully')
  }, 60000)
})
