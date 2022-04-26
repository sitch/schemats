import type { RendererContext } from '../backends/base'

export const PYTHON_CHARACTER_LINE_LIMIT = 92
export const PYTHON_COMMENT = '#'
export const PYTHON_INDENT = '    '

export const PYTHON_RESERVED_WORDS = new Set<string>(['def', 'return', 'lambda'])

export const is_reserved_word = (name: string): boolean =>
  PYTHON_RESERVED_WORDS.has(name)

//------------------------------------------------------------------------------

export const renderer_context: RendererContext = {
  backend: 'python',
  comment: PYTHON_COMMENT,
  indent: PYTHON_INDENT,
  reserved_words: PYTHON_RESERVED_WORDS,
  character_line_limit: PYTHON_CHARACTER_LINE_LIMIT,
}
