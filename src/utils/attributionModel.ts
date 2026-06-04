import { resolveGeminiModel, resolveOpenAIModel } from '@ant/model-provider'
import { getMainLoopModel } from './model/model.js'
import { getAPIProvider } from './model/providers.js'

function resolveProviderModel(anthropicModel: string): string {
  switch (getAPIProvider()) {
    case 'openai':
      return resolveOpenAIModel(anthropicModel)
    case 'gemini':
      return resolveGeminiModel(anthropicModel)
    default:
      return anthropicModel
  }
}

export function getRealModelName(): string {
  return resolveProviderModel(getMainLoopModel())
}
