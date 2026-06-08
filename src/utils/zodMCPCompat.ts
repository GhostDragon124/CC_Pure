import type { AnyObjectSchema } from '@modelcontextprotocol/sdk/server/zod-compat.js'
import type { $ZodType } from 'zod/v4/core'

// Runtime zod/v4 schemas are zod/v4/core schemas; this only bridges the type-level gap.
export function asMCPSchema<T extends $ZodType>(
  schema: () => T,
): () => AnyObjectSchema {
  return schema as unknown as () => AnyObjectSchema
}
