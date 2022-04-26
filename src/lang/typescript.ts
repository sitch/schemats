import type { RendererContext } from '../backends/base'

export const TYPESCRIPT_COMMENT = '//'
export const TYPESCRIPT_INDENT = '  '
export const TYPESCRIPT_CHARACTER_LINE_LIMIT = 80
export const TYPESCRIPT_SEPARATOR = '\n'

export const TYPESCRIPT_RESERVED_WORDS = new Set<string>([
  // primatives
  'string',
  'number',
  'package',
])

export const is_reserved_word = (name: string): boolean =>
  TYPESCRIPT_RESERVED_WORDS.has(name)

//------------------------------------------------------------------------------

export const renderer_context: RendererContext = {
  backend: 'typescript',
  comment: TYPESCRIPT_COMMENT,
  indent: TYPESCRIPT_INDENT,
  reserved_words: TYPESCRIPT_RESERVED_WORDS,
  separator: TYPESCRIPT_SEPARATOR,
  character_line_limit: TYPESCRIPT_CHARACTER_LINE_LIMIT,
}
