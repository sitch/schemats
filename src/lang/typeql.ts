import type { RendererContext } from '../backends/base'

export const TYPEQL_COMMENT = '#'
export const TYPEQL_INDENT = '  '
export const TYPEQL_CHARACTER_LINE_LIMIT = 80

export const TYPEQL_RESERVED_WORDS = new Set<string>([
  // datatypes
  'boolean',
  'datetime',
  'double',
  'long',
  'string',

  // 	"COUNT",
  // "MAX",
  // "MEAN",
  // "MEDIAN",
  // "MIN",
  // "STD",
  // "SUM",

  'type',

  // query
  'match',
  'get',
  'define',
  'undefine',
  'delete',
  'compute',
  'insert',

  'abstract',
  'sub',
  'attribute',
  'entity',
  'relation',
  'thing',
  'role',
  'rule',

  'owns',
  'relates',
  'plays',

  'value',
  'isa',
])

export const is_reserved_word = (name: string): boolean =>
  TYPEQL_RESERVED_WORDS.has(name)

//------------------------------------------------------------------------------

export const renderer_context: RendererContext = {
  backend: 'typedb',
  comment: TYPEQL_COMMENT,
  indent: TYPEQL_INDENT,
  reserved_words: TYPEQL_RESERVED_WORDS,
  character_line_limit: TYPEQL_CHARACTER_LINE_LIMIT,
}
