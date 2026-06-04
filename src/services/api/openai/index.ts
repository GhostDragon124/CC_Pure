import type { BetaToolUnion } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type { SystemPrompt } from '../../../utils/systemPromptType.js'
import type {
  Message,
  StreamEvent,
  SystemAPIErrorMessage,
  AssistantMessage,
} from '../../../types/message.js'
import type { Tools } from '../../../Tool.js'
import { getOpenAIClient } from './client.js'
import { anthropicMessagesToOpenAI } from './convertMessages.js'
import {
  anthropicToolsToOpenAI,
  anthropicToolChoiceToOpenAI,
} from './convertTools.js'
import { adaptOpenAIStreamToAnthropic } from './streamAdapter.js'
import { resolveOpenAIModel } from './modelMapping.js'
import { normalizeMessagesForAPI } from '../../../utils/messages.js'
import { toolToAPISchema } from '../../../utils/api.js'
import {
  getEmptyToolPermissionContext,
  toolMatchesName,
} from '../../../Tool.js'
import { logForDebugging } from '../../../utils/debug.js'
import { addToTotalSessionCost } from '../../../cost-tracker.js'
import { calculateUSDCost } from '../../../utils/modelCost.js'
import type { Options } from '../claude.js'
import { randomUUID } from 'crypto'
import {
  createAssistantAPIErrorMessage,
  normalizeContentFromAPI,
} from '../../../utils/messages.js'
import { isToolSearchEnabled } from '../../../utils/toolSearch.js'
import {
  isDeferredTool,
  TOOL_SEARCH_TOOL_NAME,
} from '../../../tools/ToolSearchTool/prompt.js'

/**
 * OpenAI-compatible query path. Converts Anthropic-format messages/tools to
 * OpenAI format, calls the OpenAI-compatible endpoint, and converts the
 * SSE stream back to Anthropic BetaRawMessageStreamEvent for consumption
 * by the existing query pipeline.
 */
export async function* queryModelOpenAI(
  messages: Message[],
  systemPrompt: SystemPrompt,
  tools: Tools,
  signal: AbortSignal,
  options: Options,
): AsyncGenerator<
  StreamEvent | AssistantMessage | SystemAPIErrorMessage,
  void
> {
  try {
    // 1. Resolve model name
    const openaiModel = resolveOpenAIModel(options.model)

    // 2. Normalize messages using shared preprocessing
    const messagesForAPI = normalizeMessagesForAPI(messages, tools)

    // 3. Check if tool search is enabled (similar to Anthropic path)
    const useToolSearch = await isToolSearchEnabled(
      options.model,
      tools,
      options.getToolPermissionContext ||
        (async () => getEmptyToolPermissionContext()),
      options.agents || [],
      options.querySource,
    )

    // 4. Build deferred tools set (similar to Anthropic path)
    const deferredToolNames = new Set<string>()
    if (useToolSearch) {
      for (const tool of tools) {
        if (isDeferredTool(tool)) deferredToolNames.add(tool.name)
      }
    }

    // 5. Filter tools (similar to Anthropic path)
    // Never include deferred tools in the API tools array — they are invoked
    // via ExecuteExtraTool which looks them up from the global tool registry
    // at runtime. Keeping the tools array stable preserves the prompt cache.
    let filteredTools = tools
    if (useToolSearch && deferredToolNames.size > 0) {
      filteredTools = tools.filter(tool => {
        // Always include non-deferred tools
        if (!deferredToolNames.has(tool.name)) return true
        // Always include ToolSearchTool (so it can discover more tools)
        if (toolMatchesName(tool, TOOL_SEARCH_TOOL_NAME)) return true
        // All other deferred tools are excluded — use ExecuteExtraTool instead
        return false
      })
    }

    // 6. Build tool schemas
    const toolSchemas = await Promise.all(
      filteredTools.map(tool =>
        toolToAPISchema(tool, {
          getToolPermissionContext: options.getToolPermissionContext,
          tools,
          agents: options.agents,
          allowedAgentTypes: options.allowedAgentTypes,
          model: options.model,
          deferLoading: useToolSearch && deferredToolNames.has(tool.name),
        }),
      ),
    )
    // Filter out non-standard tools (server tools like advisor)
    const standardTools = toolSchemas.filter(
      (t): t is BetaToolUnion & { type: string } => {
        const anyT = t as Record<string, unknown>
        return (
          anyT.type !== 'advisor_20260301' && anyT.type !== 'computer_20250124'
        )
      },
    )

    // 7. Convert messages and tools to OpenAI format
    const openaiMessages = anthropicMessagesToOpenAI(
      messagesForAPI,
      systemPrompt,
    )
    const openaiTools = anthropicToolsToOpenAI(standardTools)
    const openaiToolChoice = anthropicToolChoiceToOpenAI(options.toolChoice)

    // 8. Get client and make streaming request
    const client = getOpenAIClient({
      maxRetries: 0,
      fetchOverride: options.fetchOverride,
      source: options.querySource,
    })

    logForDebugging(
      `[OpenAI] Calling model=${openaiModel}, messages=${openaiMessages.length}, tools=${openaiTools.length}`,
    )

    // 9. Call OpenAI API with streaming
    const stream = await client.chat.completions.create(
      {
        model: openaiModel,
        messages: openaiMessages,
        ...(openaiTools.length > 0 && {
          tools: openaiTools,
          ...(openaiToolChoice && { tool_choice: openaiToolChoice }),
        }),
        stream: true,
        stream_options: { include_usage: true },
        ...(options.temperatureOverride !== undefined && {
          temperature: options.temperatureOverride,
        }),
      },
      {
        signal,
      },
    )

    // 10. Convert OpenAI stream to Anthropic events, then process into
    //    AssistantMessage + StreamEvent (matching the Anthropic path behavior)
    const adaptedStream = adaptOpenAIStreamToAnthropic(stream, openaiModel)

    // Accumulate content blocks and usage, same as the Anthropic path in claude.ts
    const contentBlocks: Record<number, any> = {}
    let partialMessage: any
    let usage = {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    }
    let ttftMs = 0
    const start = Date.now()

    for await (const event of adaptedStream) {
      switch (event.type) {
        case 'message_start': {
          partialMessage = (event as any).message
          ttftMs = Date.now() - start
          if ((event as any).message?.usage) {
            usage = {
              ...usage,
              ...(event as any).message.usage,
            }
          }
          break
        }
        case 'content_block_start': {
          const idx = (event as any).index
          const cb = (event as any).content_block
          if (cb.type === 'tool_use') {
            contentBlocks[idx] = { ...cb, input: '' }
          } else if (cb.type === 'text') {
            contentBlocks[idx] = { ...cb, text: '' }
          } else if (cb.type === 'thinking') {
            contentBlocks[idx] = { ...cb, thinking: '', signature: '' }
          } else {
            contentBlocks[idx] = { ...cb }
          }
          break
        }
        case 'content_block_delta': {
          const idx = (event as any).index
          const delta = (event as any).delta
          const block = contentBlocks[idx]
          if (!block) break
          if (delta.type === 'text_delta') {
            block.text = (block.text || '') + delta.text
          } else if (delta.type === 'input_json_delta') {
            block.input = (block.input || '') + delta.partial_json
          } else if (delta.type === 'thinking_delta') {
            block.thinking = (block.thinking || '') + delta.thinking
          } else if (delta.type === 'signature_delta') {
            block.signature = delta.signature
          }
          break
        }
        case 'content_block_stop': {
          const idx = (event as any).index
          const block = contentBlocks[idx]
          if (!block || !partialMessage) break

          const m: AssistantMessage = {
            message: {
              ...partialMessage,
              content: normalizeContentFromAPI([block], tools, options.agentId),
            },
            requestId: undefined,
            type: 'assistant',
            uuid: randomUUID(),
            timestamp: new Date().toISOString(),
          }
          yield m
          break
        }
        case 'message_delta': {
          const deltaUsage = (event as any).usage
          if (deltaUsage) {
            usage = { ...usage, ...deltaUsage }
          }
          // Update the stop_reason on the last yielded message
          // (we don't have a reference here, but the consumer handles this)
          break
        }
        case 'message_stop':
          break
      }

      // Track cost and token usage (matching the Anthropic path in claude.ts)
      if (
        event.type === 'message_stop' &&
        usage.input_tokens + usage.output_tokens > 0
      ) {
        const costUSD = calculateUSDCost(openaiModel, usage as any)
        addToTotalSessionCost(costUSD, usage as any, options.model)
      }

      // Also yield as StreamEvent for real-time display (matching Anthropic path)
      yield {
        type: 'stream_event',
        event,
        ...(event.type === 'message_start' ? { ttftMs } : undefined),
      } as StreamEvent
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logForDebugging(`[OpenAI] Error: ${errorMessage}`, { level: 'error' })
    yield createAssistantAPIErrorMessage({
      content: `API Error: ${errorMessage}`,
      apiError: 'api_error',
      error: error instanceof Error ? error : new Error(String(error)),
    })
  }
}

/**
 * Checks whether OpenAI thinking/reasoning mode is enabled for a given model.
 *
 * Priority:
 *   1. OPENAI_ENABLE_THINKING env var — if set to a truthy value (1/true/yes/on,
 *      case-insensitive), thinking is forced ON for all models. If set to a falsy
 *      value (0/false/empty), thinking is forced OFF for all models.
 *   2. Model name auto-detect — if the env var is unset, any model whose name
 *      contains "deepseek" (case-insensitive) gets thinking enabled.
 *   3. Default: false.
 */
export function isOpenAIThinkingEnabled(model: string): boolean {
  const env = process.env.OPENAI_ENABLE_THINKING
  if (env !== undefined) {
    const trimmed = env.trim().toLowerCase()
    if (
      trimmed === '1' ||
      trimmed === 'true' ||
      trimmed === 'yes' ||
      trimmed === 'on'
    ) {
      return true
    }
    return false
  }
  return model.toLowerCase().includes('deepseek')
}

/**
 * Builds an OpenAI-compatible chat completions request body.
 *
 * Injects thinking params for all three known formats simultaneously when
 * enableThinking is true:
 *   - thinking: { type: 'enabled' }  — official OpenAI/DeepSeek API
 *   - enable_thinking: true           — vLLM / self-hosted
 *   - chat_template_kwargs: { thinking: true } — vLLM chat template
 *
 * Temperature is excluded when thinking is on (thinking models reject it).
 */
export function buildOpenAIRequestBody(params: {
  model: string
  messages: unknown[]
  tools: unknown[]
  toolChoice: unknown
  enableThinking?: boolean
  temperatureOverride?: number
  maxTokens?: number
  systemPrompt?: unknown
}): Record<string, unknown> {
  const {
    model,
    messages,
    tools,
    toolChoice,
    enableThinking = false,
    temperatureOverride,
    maxTokens,
    systemPrompt,
  } = params

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    stream_options: { include_usage: true },
  }

  if (tools.length > 0) {
    body.tools = tools
    if (toolChoice !== undefined) {
      body.tool_choice = toolChoice
    }
  }

  if (enableThinking) {
    body.thinking = { type: 'enabled' }
    body.enable_thinking = true
    body.chat_template_kwargs = { thinking: true }
  } else if (temperatureOverride !== undefined) {
    body.temperature = temperatureOverride
  }

  if (maxTokens !== undefined) {
    body.max_completion_tokens = maxTokens
  }

  return body
}
