import { access, readFile, rm, mkdir, symlink } from 'fs/promises'
import path from 'path'
import { jest } from '@jest/globals'
import { CommandLink } from '../src/commands/link'
import { Environment } from '../src/environment'
import { logger } from '../src/logger'

jest.mock('fs/promises')
jest.mock('../src/logger')

const mockedAccess = access as jest.MockedFunction<typeof access>
const mockedReadFile = readFile as jest.MockedFunction<typeof readFile>
const mockedRm = rm as jest.MockedFunction<typeof rm>
const mockedMkdir = mkdir as jest.MockedFunction<typeof mkdir>
const mockedSymlink = symlink as jest.MockedFunction<typeof symlink>
const mockedLogger = logger as jest.Mocked<typeof logger>

describe('CommandLink', () => {
  let command: CommandLink
  let mockEnvironment: Environment
  const testInkdropDir = '/test/inkdrop'

  beforeEach(() => {
    jest.clearAllMocks()

    mockEnvironment = new Environment({ appVersion: '5.0.0' })
    jest
      .spyOn(mockEnvironment, 'getInkdropDirectory')
      .mockReturnValue(testInkdropDir)

    command = new CommandLink(mockEnvironment)

    // Default: source path exists
    mockedAccess.mockResolvedValue(undefined as any)
    // Default: package.json with a name
    mockedReadFile.mockResolvedValue(
      JSON.stringify({ name: 'my-plugin', version: '1.0.0' })
    )
    mockedRm.mockResolvedValue(undefined)
    mockedMkdir.mockResolvedValue(undefined as any)
    mockedSymlink.mockResolvedValue(undefined)
  })

  describe('run', () => {
    describe('package name resolution', () => {
      it('should read name from package.json', async () => {
        const sourcePath = '/projects/my-plugin'
        const expectedTarget = path.join(
          testInkdropDir,
          'packages',
          'my-plugin'
        )

        const result = await command.run(sourcePath)

        expect(result).toBe(expectedTarget)
        expect(mockedReadFile).toHaveBeenCalledWith(
          path.join(sourcePath, 'package.json'),
          'utf-8'
        )
      })

      it('should fall back to directory basename when package.json has no name', async () => {
        mockedReadFile.mockResolvedValueOnce(
          JSON.stringify({ version: '1.0.0' })
        )
        const sourcePath = '/projects/my-plugin'
        const expectedTarget = path.join(
          testInkdropDir,
          'packages',
          'my-plugin'
        )

        const result = await command.run(sourcePath)

        expect(result).toBe(expectedTarget)
      })

      it('should fall back to directory basename when package.json does not exist', async () => {
        mockedReadFile.mockRejectedValueOnce(new Error('ENOENT'))
        const sourcePath = '/projects/my-plugin'
        const expectedTarget = path.join(
          testInkdropDir,
          'packages',
          'my-plugin'
        )

        const result = await command.run(sourcePath)

        expect(result).toBe(expectedTarget)
      })

      it('should fall back to directory basename when package.json is invalid JSON', async () => {
        mockedReadFile.mockResolvedValueOnce('not valid json')
        const sourcePath = '/projects/my-plugin'
        const expectedTarget = path.join(
          testInkdropDir,
          'packages',
          'my-plugin'
        )

        const result = await command.run(sourcePath)

        expect(result).toBe(expectedTarget)
      })

      it('should use explicit name option when provided', async () => {
        const sourcePath = '/projects/my-plugin'
        const expectedTarget = path.join(
          testInkdropDir,
          'packages',
          'custom-name'
        )

        const result = await command.run(sourcePath, { name: 'custom-name' })

        expect(result).toBe(expectedTarget)
        expect(mockedReadFile).not.toHaveBeenCalled()
      })
    })

    describe('target directory', () => {
      it('should link to packages/ by default', async () => {
        const sourcePath = '/projects/my-plugin'
        const expectedTarget = path.join(
          testInkdropDir,
          'packages',
          'my-plugin'
        )

        const result = await command.run(sourcePath)

        expect(result).toBe(expectedTarget)
        expect(mockedSymlink).toHaveBeenCalledWith(
          sourcePath,
          expectedTarget,
          'dir'
        )
      })

      it('should link to dev/packages/ when dev option is true', async () => {
        const sourcePath = '/projects/my-plugin'
        const expectedTarget = path.join(
          testInkdropDir,
          'dev',
          'packages',
          'my-plugin'
        )

        const result = await command.run(sourcePath, { dev: true })

        expect(result).toBe(expectedTarget)
        expect(mockedSymlink).toHaveBeenCalledWith(
          sourcePath,
          expectedTarget,
          'dir'
        )
      })
    })

    describe('symlink creation', () => {
      it('should remove existing target before creating symlink', async () => {
        const sourcePath = '/projects/my-plugin'

        await command.run(sourcePath)

        const targetPath = path.join(
          testInkdropDir,
          'packages',
          'my-plugin'
        )
        expect(mockedRm).toHaveBeenCalledWith(targetPath, { force: true })
        // rm should be called before symlink
        const rmOrder = mockedRm.mock.invocationCallOrder[0]
        const symlinkOrder = mockedSymlink.mock.invocationCallOrder[0]
        expect(rmOrder).toBeLessThan(symlinkOrder)
      })

      it('should create parent directories', async () => {
        const sourcePath = '/projects/my-plugin'

        await command.run(sourcePath)

        const targetPath = path.join(
          testInkdropDir,
          'packages',
          'my-plugin'
        )
        expect(mockedMkdir).toHaveBeenCalledWith(path.dirname(targetPath), {
          recursive: true
        })
      })

      it('should resolve relative package paths', async () => {
        const sourcePath = './my-plugin'
        const resolvedPath = path.resolve(sourcePath)

        await command.run(sourcePath)

        expect(mockedAccess).toHaveBeenCalledWith(resolvedPath)
        expect(mockedSymlink).toHaveBeenCalledWith(
          resolvedPath,
          expect.any(String),
          'dir'
        )
      })
    })

    describe('logging', () => {
      it('should log the created link', async () => {
        const sourcePath = '/projects/my-plugin'
        const expectedTarget = path.join(
          testInkdropDir,
          'packages',
          'my-plugin'
        )

        await command.run(sourcePath)

        expect(mockedLogger.info).toHaveBeenCalledWith(
          `${expectedTarget} -> ${sourcePath}`
        )
      })
    })

    describe('error cases', () => {
      it('should throw when source path does not exist', async () => {
        mockedAccess.mockRejectedValueOnce(new Error('ENOENT'))
        const sourcePath = '/nonexistent/path'

        await expect(command.run(sourcePath)).rejects.toThrow(
          `Package directory does not exist: ${sourcePath}`
        )

        expect(mockedSymlink).not.toHaveBeenCalled()
      })

      it('should throw and log when symlink creation fails', async () => {
        const symlinkError = new Error('Permission denied')
        mockedSymlink.mockRejectedValueOnce(symlinkError)
        const sourcePath = '/projects/my-plugin'
        const expectedTarget = path.join(
          testInkdropDir,
          'packages',
          'my-plugin'
        )

        await expect(command.run(sourcePath)).rejects.toThrow(
          `Linking ${expectedTarget} to ${sourcePath} failed: Permission denied`
        )

        expect(mockedLogger.error).toHaveBeenCalled()
      })
    })
  })

  describe('constructor', () => {
    it('should initialize with environment', () => {
      const env = new Environment({ appVersion: '5.0.0' })
      const cmd = new CommandLink(env)

      expect(cmd.env).toBe(env)
    })
  })
})
