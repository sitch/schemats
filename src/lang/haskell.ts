import type { RendererContext } from '../backends/base'

export const HASKELL_COMMENT = '--'
export const HASKELL_INDENT = '  '
export const HASKELL_CHARACTER_LINE_LIMIT = 80

export const HASKELL_RESERVED_WORDS = new Set<string>([
  // primatives
  'string',
])

export const is_reserved_word = (name: string): boolean =>
  HASKELL_RESERVED_WORDS.has(name)

//------------------------------------------------------------------------------

export const renderer_context: RendererContext = {
  backend: 'haskell',
  comment: HASKELL_COMMENT,
  indent: HASKELL_INDENT,
  reserved_words: HASKELL_RESERVED_WORDS,
  character_line_limit: HASKELL_CHARACTER_LINE_LIMIT,
}
