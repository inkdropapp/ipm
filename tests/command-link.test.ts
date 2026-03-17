import {
  lstat,
  readFile,
  readlink,
  realpath,
  rm,
  writeFile,
  mkdir
} from 'fs/promises'
import { mkdtempSync } from 'fs'
import path from 'path'
import os from 'os'
import { jest } from '@jest/globals'
import { CommandLink } from '../src/commands/link'
import { Environment } from '../src/environment'

describe('CommandLink', () => {
  let command: CommandLink
  let env: Environment
  let tmpDir: string
  let inkdropDir: string
  let sourceDir: string

  beforeEach(async () => {
    // Resolve real path to avoid symlink issues (e.g., macOS /var -> /private/var)
    tmpDir = await realpath(
      mkdtempSync(path.join(os.tmpdir(), 'ipm-link-test-'))
    )
    inkdropDir = path.join(tmpDir, 'inkdrop')
    sourceDir = path.join(tmpDir, 'source-plugin')

    await mkdir(sourceDir, { recursive: true })
    await writeFile(
      path.join(sourceDir, 'package.json'),
      JSON.stringify({ name: 'my-plugin', version: '1.0.0' })
    )

    env = new Environment({ appVersion: '5.0.0' })
    jest.spyOn(env, 'getInkdropDirectory').mockReturnValue(inkdropDir)
    command = new CommandLink(env)
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  describe('package name resolution', () => {
    it('should read name from package.json', async () => {
      const result = await command.run(sourceDir)

      const expectedTarget = path.join(inkdropDir, 'packages', 'my-plugin')
      expect(result).toBe(expectedTarget)

      const stat = await lstat(expectedTarget)
      expect(stat.isSymbolicLink()).toBe(true)

      const linkTarget = await readlink(expectedTarget)
      expect(linkTarget).toBe(sourceDir)
    })

    it('should fall back to directory basename when package.json has no name', async () => {
      await writeFile(
        path.join(sourceDir, 'package.json'),
        JSON.stringify({ version: '1.0.0' })
      )

      const result = await command.run(sourceDir)

      expect(result).toBe(
        path.join(inkdropDir, 'packages', 'source-plugin')
      )
    })

    it('should fall back to directory basename when package.json does not exist', async () => {
      await rm(path.join(sourceDir, 'package.json'))

      const result = await command.run(sourceDir)

      expect(result).toBe(
        path.join(inkdropDir, 'packages', 'source-plugin')
      )
    })

    it('should fall back to directory basename when package.json is invalid JSON', async () => {
      await writeFile(path.join(sourceDir, 'package.json'), 'not valid json')

      const result = await command.run(sourceDir)

      expect(result).toBe(
        path.join(inkdropDir, 'packages', 'source-plugin')
      )
    })

    it('should use explicit name option when provided', async () => {
      const result = await command.run(sourceDir, { name: 'custom-name' })

      const expectedTarget = path.join(inkdropDir, 'packages', 'custom-name')
      expect(result).toBe(expectedTarget)

      const stat = await lstat(expectedTarget)
      expect(stat.isSymbolicLink()).toBe(true)
    })
  })

  describe('target directory', () => {
    it('should link to packages/ by default', async () => {
      const result = await command.run(sourceDir)

      expect(result).toBe(path.join(inkdropDir, 'packages', 'my-plugin'))
      const stat = await lstat(result)
      expect(stat.isSymbolicLink()).toBe(true)
    })

    it('should link to dev/packages/ when dev option is true', async () => {
      const result = await command.run(sourceDir, { dev: true })

      expect(result).toBe(
        path.join(inkdropDir, 'dev', 'packages', 'my-plugin')
      )
      const stat = await lstat(result)
      expect(stat.isSymbolicLink()).toBe(true)
    })
  })

  describe('symlink behavior', () => {
    it('should create parent directories automatically', async () => {
      const result = await command.run(sourceDir)

      const stat = await lstat(result)
      expect(stat.isSymbolicLink()).toBe(true)
    })

    it('should replace an existing symlink', async () => {
      // First link
      await command.run(sourceDir)

      // Create a second source
      const sourceDir2 = path.join(tmpDir, 'source-plugin-2')
      await mkdir(sourceDir2, { recursive: true })
      await writeFile(
        path.join(sourceDir2, 'package.json'),
        JSON.stringify({ name: 'my-plugin', version: '2.0.0' })
      )

      // Link again with same name
      const result = await command.run(sourceDir2)

      const linkTarget = await readlink(result)
      expect(linkTarget).toBe(sourceDir2)
    })

    it('should replace an existing real directory', async () => {
      // Create a real directory at the target path
      const targetPath = path.join(inkdropDir, 'packages', 'my-plugin')
      await mkdir(targetPath, { recursive: true })
      await writeFile(path.join(targetPath, 'index.js'), 'module.exports = {}')

      // Link should replace it
      const result = await command.run(sourceDir)

      const stat = await lstat(result)
      expect(stat.isSymbolicLink()).toBe(true)

      const linkTarget = await readlink(result)
      expect(linkTarget).toBe(sourceDir)
    })

    it('should resolve relative package paths', async () => {
      const originalCwd = process.cwd()
      try {
        process.chdir(tmpDir)
        const result = await command.run('source-plugin')

        const stat = await lstat(result)
        expect(stat.isSymbolicLink()).toBe(true)

        const linkTarget = await readlink(result)
        expect(linkTarget).toBe(sourceDir)
      } finally {
        process.chdir(originalCwd)
      }
    })

    it('should allow reading files through the symlink', async () => {
      await writeFile(path.join(sourceDir, 'index.js'), 'module.exports = 42')

      const result = await command.run(sourceDir)

      const content = await readFile(path.join(result, 'index.js'), 'utf-8')
      expect(content).toBe('module.exports = 42')
    })
  })

  describe('error cases', () => {
    it('should throw when source path does not exist', async () => {
      const nonexistent = path.join(tmpDir, 'nonexistent')

      await expect(command.run(nonexistent)).rejects.toThrow(
        'Package directory does not exist'
      )
    })

    it('should reject package names containing path traversal', async () => {
      await expect(
        command.run(sourceDir, { name: '../../evil' })
      ).rejects.toThrow('Invalid package name')
    })

    it('should reject absolute paths as package names', async () => {
      await expect(
        command.run(sourceDir, { name: '/etc/evil' })
      ).rejects.toThrow('Invalid package name')
    })

    it('should reject empty package names', async () => {
      await expect(
        command.run(sourceDir, { name: '' })
      ).rejects.toThrow('Invalid package name')
    })
  })
})
