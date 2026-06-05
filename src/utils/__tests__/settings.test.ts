import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { stateMock } from '../../../tests/mocks/state'

const ALL_SETTING_SOURCES = [
  'userSettings',
  'projectSettings',
  'localSettings',
  'flagSettings',
  'policySettings',
] as const

let dynamicCwd = process.cwd()
let managedRoot = join(tmpdir(), 'settings-test-managed-initial')

mock.module('src/bootstrap/state.js', () => ({
  ...stateMock(),
  getOriginalCwd: () => dynamicCwd,
  getCwdState: () => dynamicCwd,
  getProjectRoot: () => dynamicCwd,
  setOriginalCwd: (cwd: string) => {
    dynamicCwd = cwd
  },
  setCwdState: (cwd: string) => {
    dynamicCwd = cwd
  },
  setProjectRoot: () => {},
  getAllowedSettingSources: () => [...ALL_SETTING_SOURCES],
  getFlagSettingsPath: () => undefined,
  getFlagSettingsInline: () => null,
  setFlagSettingsPath: () => {},
  setFlagSettingsInline: () => {},
  getUseCoworkPlugins: () => false,
  setUseCoworkPlugins: () => {},
  waitForScrollIdle: () => Promise.resolve(),
  markScrollActivity: () => {},
  getIsScrollDraining: () => false,
  getSessionTrustAccepted: () => false,
  setSessionTrustAccepted: () => {},
  getModelStrings: () => null,
  setModelStrings: () => {},
  resetModelStringsForTestingOnly: () => {},
  getMainLoopModelOverride: () => undefined,
  setMainLoopModelOverride: () => {},
  getInitialMainLoopModel: () => 'sonnet',
  setInitialMainLoopModel: () => {},
  getSdkBetas: () => undefined,
  setSdkBetas: () => {},
  getSessionIngressToken: () => undefined,
  setSessionIngressToken: () => {},
  getOauthTokenFromFd: () => undefined,
  setOauthTokenFromFd: () => {},
  getApiKeyFromFd: () => undefined,
  setApiKeyFromFd: () => {},
  getLastClassifierRequests: () => null,
  setLastClassifierRequests: () => {},
  getCachedClaudeMdContent: () => null,
  setCachedClaudeMdContent: () => {},
  getInlinePlugins: () => [],
  setInlinePlugins: () => {},
  getChromeFlagOverride: () => undefined,
  setChromeFlagOverride: () => {},
  getSessionBypassPermissionsMode: () => false,
  setSessionBypassPermissionsMode: () => {},
  getScheduledTasksEnabled: () => true,
  setScheduledTasksEnabled: () => {},
  getSessionCronTasks: () => [],
  addSessionCronTask: () => {},
  removeSessionCronTasks: () => 0,
  setSessionPersistenceDisabled: () => {},
  isSessionPersistenceDisabled: () => false,
  hasExitedPlanModeInSession: () => false,
  setHasExitedPlanMode: () => {},
  needsPlanModeExitAttachment: () => false,
  setNeedsPlanModeExitAttachment: () => {},
  handlePlanModeTransition: () => {},
  needsAutoModeExitAttachment: () => false,
  setNeedsAutoModeExitAttachment: () => {},
  handleAutoModeTransition: () => {},
  hasShownLspRecommendationThisSession: () => false,
  setLspRecommendationShownThisSession: () => {},
  getInitJsonSchema: () => null,
  setInitJsonSchema: () => {},
  getRegisteredHooks: () => ({}),
  registerHookCallbacks: () => {},
  clearRegisteredHooks: () => {},
  clearRegisteredPluginHooks: () => {},
  resetSdkInitState: () => {},
  getPlanSlugCache: () => new Map(),
  getSessionCreatedTeams: () => new Set(),
  getTeleportedSessionInfo: () => null,
  setTeleportedSessionInfo: () => {},
  markFirstTeleportMessageLogged: () => {},
  addInvokedSkill: () => {},
  getInvokedSkills: () => new Map(),
  getInvokedSkillsForAgent: () => new Map(),
  clearInvokedSkills: () => {},
  clearInvokedSkillsForAgent: () => {},
  getMainThreadAgentType: () => undefined,
  setMainThreadAgentType: () => {},
  getIsRemoteMode: () => false,
  setIsRemoteMode: () => {},
  getSystemPromptSectionCache: () => new Map(),
  setSystemPromptSectionCacheEntry: () => {},
  clearSystemPromptSectionState: () => {},
  getLastEmittedDate: () => null,
  setLastEmittedDate: () => {},
  getAdditionalDirectoriesForClaudeMd: () => [],
  setAdditionalDirectoriesForClaudeMd: () => {},
  getAllowedChannels: () => [],
  setAllowedChannels: () => {},
  getHasDevChannels: () => false,
  setHasDevChannels: () => {},
  getPromptCache1hAllowlist: () => null,
  setPromptCache1hAllowlist: () => {},
  getPromptCache1hEligible: () => null,
  setPromptCache1hEligible: () => {},
  getAfkModeHeaderLatched: () => null,
  setAfkModeHeaderLatched: () => {},
  getFastModeHeaderLatched: () => null,
  setFastModeHeaderLatched: () => {},
  getCacheEditingHeaderLatched: () => null,
  setCacheEditingHeaderLatched: () => {},
  clearBetaHeaderLatches: () => {},
  getPromptId: () => null,
  setPromptId: () => {},
  isReplBridgeActive: () => false,
  getModelUsage: () => ({}),
  getUsageForModel: () => undefined,
  resetCostState: () => {},
  setCostStateForRestore: () => {},
  setMeter: () => {},
  getMeter: () => null,
  getSessionCounter: () => null,
  getLocCounter: () => null,
  getPrCounter: () => null,
  getCommitCounter: () => null,
  getCostCounter: () => null,
  getTokenCounter: () => null,
  getCodeEditToolDecisionCounter: () => null,
  getActiveTimeCounter: () => null,
  getLoggerProvider: () => null,
  setLoggerProvider: () => {},
  getEventLogger: () => null,
  setEventLogger: () => {},
  getMeterProvider: () => null,
  setMeterProvider: () => {},
  getTracerProvider: () => null,
  setTracerProvider: () => {},
  getIsInteractive: () => true,
  setIsInteractive: () => {},
  getClientType: () => 'cli',
  setClientType: () => {},
  getKairosActive: () => false,
  setKairosActive: () => {},
  getStrictToolResultPairing: () => false,
  setStrictToolResultPairing: () => {},
  getUserMsgOptIn: () => false,
  setUserMsgOptIn: () => {},
  getSessionSource: () => undefined,
  setSessionSource: () => {},
  getQuestionPreviewFormat: () => undefined,
  setQuestionPreviewFormat: () => {},
  snapshotOutputTokensForTurn: () => {},
  getBudgetContinuationCount: () => 0,
  incrementBudgetContinuationCount: () => {},
  hasUnknownModelCost: () => false,
  setHasUnknownModelCost: () => {},
  getLastMainRequestId: () => undefined,
  setLastMainRequestId: () => {},
  getLastApiCompletionTimestamp: () => null,
  setLastApiCompletionTimestamp: () => {},
  markPostCompaction: () => {},
  consumePostCompaction: () => false,
  addToInMemoryErrorLog: () => {},
  preferThirdPartyAuthentication: () => false,
}))

mock.module('src/utils/settings/managedPath.js', () => ({
  getManagedFilePath: () => managedRoot,
  getManagedSettingsDropInDir: () => join(managedRoot, 'managed-settings.d'),
}))

mock.module('src/services/remoteManagedSettings/syncCacheState.js', () => ({
  getRemoteManagedSettingsSyncFromCache: () => null,
}))

mock.module('src/utils/settings/mdm/settings.js', () => ({
  getHkcuSettings: () => ({ settings: {}, errors: [] }),
  getMdmSettings: () => ({ settings: {}, errors: [] }),
}))

let getSettingsWithErrors: typeof import('../settings/settings.js').getSettingsWithErrors
let getSettingsFilePathForSource: typeof import('../settings/settings.js').getSettingsFilePathForSource
let resetSettingsCache: typeof import('../settings/settingsCache.js').resetSettingsCache
let setOriginalCwd: (cwd: string) => void

const originalProcessCwd = process.cwd()
const originalHome = process.env.HOME
const originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR
let tempDirs: string[] = []

beforeAll(async () => {
  const settingsModule = await import('../settings/settings.js')
  const settingsCacheModule = await import('../settings/settingsCache.js')
  const stateModule = await import('src/bootstrap/state.js')

  getSettingsWithErrors = settingsModule.getSettingsWithErrors
  getSettingsFilePathForSource = settingsModule.getSettingsFilePathForSource
  resetSettingsCache = settingsCacheModule.resetSettingsCache
  setOriginalCwd = stateModule.setOriginalCwd
})

beforeEach(() => {
  tempDirs = []
  managedRoot = makeTempDir('settings-managed-')
  resetSettingsCache()
})

afterEach(() => {
  resetSettingsCache()
  process.chdir(originalProcessCwd)
  restoreEnv('HOME', originalHome)
  restoreEnv('CLAUDE_CONFIG_DIR', originalClaudeConfigDir)
  setOriginalCwd(originalProcessCwd)

  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true })
  }
  tempDirs = []
})

describe('settings source path collision guard', () => {
  test('does not let localSettings override userSettings when CWD is HOME', () => {
    const homeDir = makeTempDir('settings-home-')
    const configDir = configureSession({ homeDir, cwdDir: homeDir })

    writeSettings(getSettingsFilePathForSource('userSettings'), {
      model: 'good-model',
    })
    writeSettings(getSettingsFilePathForSource('localSettings'), {
      model: 'evil-override',
    })

    const { settings, errors } = getSettingsWithErrors()

    expect(errors).toEqual([])
    expect(configDir).toBe(join(homeDir, '.claude'))
    expect(settings.model).toBe('good-model')
  })

  test('lets localSettings override userSettings when CWD is not HOME', () => {
    const homeDir = makeTempDir('settings-home-')
    const projectDir = makeTempDir('settings-project-')
    configureSession({ homeDir, cwdDir: projectDir })

    writeSettings(getSettingsFilePathForSource('userSettings'), {
      model: 'global-model',
    })
    writeSettings(getSettingsFilePathForSource('localSettings'), {
      model: 'local-model',
    })

    const { settings, errors } = getSettingsWithErrors()

    expect(errors).toEqual([])
    expect(settings.model).toBe('local-model')
  })

  test('returns empty settings when no settings files exist', () => {
    const homeDir = makeTempDir('settings-home-')
    const projectDir = makeTempDir('settings-project-')
    configureSession({ homeDir, cwdDir: projectDir })

    const { settings, errors } = getSettingsWithErrors()

    expect(errors).toEqual([])
    expect(settings).toEqual({})
  })

  test('does not report an error for an empty settings.local.json', () => {
    const homeDir = makeTempDir('settings-home-')
    const projectDir = makeTempDir('settings-project-')
    configureSession({ homeDir, cwdDir: projectDir })

    writeSettings(getSettingsFilePathForSource('localSettings'), {})

    const { settings, errors } = getSettingsWithErrors()

    expect(errors).toEqual([])
    expect(settings).toEqual({})
  })
})

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

function configureSession({
  homeDir,
  cwdDir,
}: {
  homeDir: string
  cwdDir: string
}): string {
  const configDir = join(homeDir, '.claude')
  mkdirSync(configDir, { recursive: true })
  mkdirSync(join(cwdDir, '.claude'), { recursive: true })

  process.env.HOME = homeDir
  process.env.CLAUDE_CONFIG_DIR = configDir
  process.chdir(cwdDir)
  setOriginalCwd(cwdDir)
  resetSettingsCache()

  return configDir
}

function writeSettings(path: string | undefined, settings: object): void {
  expect(path).toBeDefined()
  writeFileSync(path!, `${JSON.stringify(settings, null, 2)}\n`)
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key]
  } else {
    process.env[key] = value
  }
}
