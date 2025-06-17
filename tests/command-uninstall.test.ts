import { jest } from '@jest/globals'
import { access, rm } from 'fs/promises'
import path from 'path'
import { CommandUninstall } from '../src/commands/uninstall'
import { Environment } from '../src/environment'
import { logger } from '../src/logger'

jest.mock('fs/promises')
jest.mock('../src/logger')

const mockedAccess = access as jest.MockedFunction<typeof access>
const mockedRm = rm as jest.MockedFunction<typeof rm>
const mockedLogger = logger as jest.Mocked<typeof logger>

describe('CommandUninstall', () => {
  let command: CommandUninstall
  let mockEnvironment: Environment
  const testInkdropDir = '/test/inkdrop'
  const testPackageName = 'test-package'
  const testPackageDir = path.join(testInkdropDir, 'packages', testPackageName)

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Create mock environment
    mockEnvironment = new Environment({ appVersion: '5.0.0' })
    jest.spyOn(mockEnvironment, 'getInkdropDirectory').mockReturnValue(testInkdropDir)

    // Create command instance
    command = new CommandUninstall(mockEnvironment)

    // Default mock behaviors
    mockedAccess.mockRejectedValue(new Error('ENOENT')) // Default: package doesn't exist
    mockedRm.mockResolvedValue(undefined) // Default: successful removal
  })

  describe('run', () => {
    describe('successful uninstall', () => {
      beforeEach(() => {
        // Mock package exists
        mockedAccess.mockResolvedValueOnce(undefined as any)
      })

      it('should successfully uninstall an existing package', async () => {
        const result = await command.run(testPackageName)

        expect(result).toBe(true)
        expect(mockedAccess).toHaveBeenCalledWith(testPackageDir)
        expect(mockedRm).toHaveBeenCalledWith(testPackageDir, {
          recursive: true,
          force: true
        })
        expect(mockedLogger.info).toHaveBeenCalledWith(`Uninstalling ${testPackageName}...`)
        expect(mockedLogger.info).toHaveBeenCalledWith(`Successfully uninstalled ${testPackageName}`)
        expect(mockedLogger.error).not.toHaveBeenCalled()
      })

      it('should use correct package directory path', async () => {
        const packageName = 'my-custom-package'
        const expectedPath = path.join(testInkdropDir, 'packages', packageName)

        await command.run(packageName)

        expect(mockedAccess).toHaveBeenCalledWith(expectedPath)
        expect(mockedRm).toHaveBeenCalledWith(expectedPath, {
          recursive: true,
          force: true
        })
      })

      it('should handle package names with special characters', async () => {
        const packageName = '@scope/package-name'
        const expectedPath = path.join(testInkdropDir, 'packages', packageName)

        await command.run(packageName)

        expect(mockedAccess).toHaveBeenCalledWith(expectedPath)
        expect(mockedRm).toHaveBeenCalledWith(expectedPath, {
          recursive: true,
          force: true
        })
      })
    })

    describe('error cases', () => {
      it('should throw error when package is not installed', async () => {
        // mockedAccess already configured to reject by default (package doesn't exist)

        await expect(command.run(testPackageName)).rejects.toThrow(
          `Package \`${testPackageName}\` is not installed`
        )

        expect(mockedAccess).toHaveBeenCalledWith(testPackageDir)
        expect(mockedRm).not.toHaveBeenCalled()
        expect(mockedLogger.error).toHaveBeenCalledWith(
          `Failed to uninstall ${testPackageName}:`,
          expect.any(Error)
        )
      })

      it('should throw error when rm operation fails', async () => {
        // Mock package exists but removal fails
        mockedAccess.mockResolvedValueOnce(undefined as any)
        const removeError = new Error('Permission denied')
        mockedRm.mockRejectedValueOnce(removeError)

        await expect(command.run(testPackageName)).rejects.toThrow('Permission denied')

        expect(mockedAccess).toHaveBeenCalledWith(testPackageDir)
        expect(mockedRm).toHaveBeenCalledWith(testPackageDir, {
          recursive: true,
          force: true
        })
        expect(mockedLogger.info).toHaveBeenCalledWith(`Uninstalling ${testPackageName}...`)
        expect(mockedLogger.error).toHaveBeenCalledWith(
          `Failed to uninstall ${testPackageName}:`,
          removeError
        )
      })

      it('should treat access errors as package not installed', async () => {
        // Any access error (including permission errors) is treated as "package doesn't exist"
        const accessError = new Error('Permission denied')
        mockedAccess.mockRejectedValueOnce(accessError)

        await expect(command.run(testPackageName)).rejects.toThrow(
          `Package \`${testPackageName}\` is not installed`
        )

        expect(mockedAccess).toHaveBeenCalledWith(testPackageDir)
        expect(mockedRm).not.toHaveBeenCalled()
        expect(mockedLogger.error).toHaveBeenCalledWith(
          `Failed to uninstall ${testPackageName}:`,
          expect.any(Error)
        )
      })
    })

    describe('logging', () => {
      beforeEach(() => {
        mockedAccess.mockResolvedValueOnce(undefined as any)
      })

      it('should log uninstall start and success messages', async () => {
        await command.run(testPackageName)

        expect(mockedLogger.info).toHaveBeenNthCalledWith(1, `Uninstalling ${testPackageName}...`)
        expect(mockedLogger.info).toHaveBeenNthCalledWith(2, `Successfully uninstalled ${testPackageName}`)
      })

      it('should log error messages when operations fail', async () => {
        const error = new Error('Test error')
        mockedRm.mockRejectedValueOnce(error)

        await expect(command.run(testPackageName)).rejects.toThrow()

        expect(mockedLogger.error).toHaveBeenCalledWith(
          `Failed to uninstall ${testPackageName}:`,
          error
        )
      })
    })
  })

  describe('constructor', () => {
    it('should initialize with environment', () => {
      const env = new Environment({ appVersion: '5.0.0' })
      const cmd = new CommandUninstall(env)

      expect(cmd.env).toBe(env)
    })
  })

  describe('pathExists (indirectly tested)', () => {
    it('should properly detect existing packages', async () => {
      mockedAccess.mockResolvedValueOnce(undefined as any)

      await command.run(testPackageName)

      expect(mockedAccess).toHaveBeenCalledWith(testPackageDir)
      expect(mockedRm).toHaveBeenCalled()
    })

    it('should properly detect non-existing packages', async () => {
      // mockedAccess already configured to reject by default

      await expect(command.run(testPackageName)).rejects.toThrow('is not installed')

      expect(mockedAccess).toHaveBeenCalledWith(testPackageDir)
      expect(mockedRm).not.toHaveBeenCalled()
    })
  })
})