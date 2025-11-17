import { CommandInstall } from '../src/commands/install'
import { Environment } from '../src/environment'
import { IPMRegistry } from '../src/registry'

describe('Real Installation Test', () => {
  it('should actually install the math package to ./tmp directory', async () => {
    // Create a real environment and registry for actual installation
    const realEnvironment = new Environment({
      appVersion: '5.9.0',
      appHomePath: './tmp' // Install to ./tmp directory
    })
    const realRegistry = new IPMRegistry('https://api.inkdrop.app')
    const realCommandInstall = new CommandInstall(
      '5.9.0',
      realEnvironment,
      realRegistry
    )

    console.log('🚀 Starting real installation of math package...')

    // Actually install the math package
    await realCommandInstall.run('math')

    // Verify the package was actually installed
    const fs = await import('fs/promises')
    const path = await import('path')

    const packageDir = path.default.join('./tmp', 'packages', 'math')
    const packageJsonPath = path.default.join(packageDir, 'package.json')

    // Check that the package directory exists
    await expect(fs.access(packageDir)).resolves.not.toThrow()

    // Check that package.json exists and has correct content
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8')
    const packageJson = JSON.parse(packageJsonContent)

    expect(packageJson.name).toBe('math')
    expect(packageJson.description).toContain('math syntax support')
    expect(packageJson.main).toBeDefined()

    console.log(`✅ Math package successfully installed to: ${packageDir}`)
    console.log(`📦 Package version: ${packageJson.version}`)
    console.log(`📝 Description: ${packageJson.description}`)

    // Check if dependencies were installed
    const nodeModulesPath = path.default.join(packageDir, 'node_modules')
    try {
      await fs.access(nodeModulesPath)
      console.log(`📦 Dependencies installed to: ${nodeModulesPath}`)

      // List some key dependencies
      const katexPath = path.default.join(nodeModulesPath, 'katex')
      const reactKatexPath = path.default.join(
        nodeModulesPath,
        '@matejmazur',
        'react-katex'
      )

      try {
        await fs.access(katexPath)
        console.log(`✅ KaTeX dependency found`)
      } catch {
        console.log(`⚠️ KaTeX dependency not found`)
      }

      try {
        await fs.access(reactKatexPath)
        console.log(`✅ @matejmazur/react-katex scoped dependency found`)
      } catch {
        console.log(`⚠️ @matejmazur/react-katex scoped dependency not found`)
      }
    } catch {
      console.log(`⚠️ No node_modules directory found`)
    }

    // Check if lib directory exists (the built code)
    const libPath = path.default.join(packageDir, 'lib')
    try {
      await fs.access(libPath)
      console.log(`✅ Built code found in lib directory`)
    } catch {
      console.log(`⚠️ No lib directory found`)
    }
  }, 60000) // 60 second timeout for real API call and file operations
})
