// CC_Pure: ACP agent stub. ACP (Agent Communication Protocol) is not
// enabled in this build; this file exists only to satisfy the typechecker
// for modules that import './agent.js'.

import type {
  AgentSideConnection,
} from '@agentclientprotocol/sdk'
import type * as schema from '@agentclientprotocol/sdk'

const NOT_AVAILABLE = 'ACP agent not available in CC_Pure'

export class AcpAgent {
  readonly sessions = new Map<string, unknown>()

  constructor(_connection: AgentSideConnection) {}

  async initialize(_params: schema.InitializeRequest): Promise<schema.InitializeResponse> {
    throw new Error(NOT_AVAILABLE)
  }
  async newSession(_params: schema.NewSessionRequest): Promise<schema.NewSessionResponse> {
    throw new Error(NOT_AVAILABLE)
  }
  async authenticate(_params: schema.AuthenticateRequest): Promise<schema.AuthenticateResponse> {
    throw new Error(NOT_AVAILABLE)
  }
  async prompt(_params: schema.PromptRequest): Promise<schema.PromptResponse> {
    throw new Error(NOT_AVAILABLE)
  }
  async cancel(_params: schema.CancelNotification): Promise<void> {
    throw new Error(NOT_AVAILABLE)
  }
  async loadSession(_params: schema.LoadSessionRequest): Promise<schema.LoadSessionResponse> {
    throw new Error(NOT_AVAILABLE)
  }
  async unstable_closeSession(_params: schema.CloseSessionRequest): Promise<schema.CloseSessionResponse> {
    throw new Error(NOT_AVAILABLE)
  }
}

export async function runAcpAgent(): Promise<void> {
  throw new Error(NOT_AVAILABLE)
}
