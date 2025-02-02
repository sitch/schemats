import { get, groupBy, uniq } from 'lodash'

import type { RendererContext } from '../backends/base'
import type { BuildContext } from '../compiler'
import { banner, lines, pad_lines } from '../formatters'
import { cast_julia_type } from '../typemaps/julia-typemap'

export const JULIA_CHARACTER_LINE_LIMIT = 92
export const JULIA_COMMENT = '#'
export const JULIA_INDENT = '    '
export const JULIA_SEPARATOR = '\n'

export const COMMENT_LINE = divider_line('-', 0)
export const INDENT_COMMENT_LINE = divider_line('-', 1)

export const JULIA_RESERVED_WORDS = new Set<string>([
  '__dot__',
  '_cmd',
  '_str',
  '@doc_str',
  'abstract',
  'bitstype',
  'block',
  'call',
  'catch',
  'cell1d',
  'comparison',
  'const',
  'curly',
  'do',
  'end',
  'memq',
  'eqv',
  'false',
  'finally',
  'for',
  'function',
  'global',
  'if',
  'kw',
  'line',
  'local',
  'macro',
  'macrocall',
  'memv',
  'module',
  'mutable',
  'none',
  'parameters',
  'primitive',
  'quote',
  'ref',
  'return',
  'row',
  'string',
  'struct',
  'toplevel',
  'true',
  'try',
  'tuple',
  'type',
  'typealias',
  'typed_comprehension',
  'typed_hcat',
  'typed_vcat',
  'vect',
  'where',
])

export const is_reserved_word = (name: string): boolean =>
  JULIA_RESERVED_WORDS.has(name)

//------------------------------------------------------------------------------

export const renderer_context: RendererContext = {
  backend: 'julia',
  comment: JULIA_COMMENT,
  indent: JULIA_INDENT,
  separator: JULIA_SEPARATOR,
  reserved_words: JULIA_RESERVED_WORDS,
  character_line_limit: JULIA_CHARACTER_LINE_LIMIT,
}

//------------------------------------------------------------------------------

export function divider_line(char = '-', indentation = 0) {
  return `${JULIA_COMMENT}${char.repeat(
    JULIA_CHARACTER_LINE_LIMIT -
      JULIA_COMMENT.length -
      indentation * JULIA_INDENT.length,
  )}`
}

export const render_module = (name: string, lines: string[]) => `
module ${name}

${lines.join('\n')}

end\n`

export function render_module_export(name: string) {
  return `export ${name}`
}

export function render_using_pragma(context: BuildContext) {
  const types = uniq(
    context.tables.flatMap(({ columns }) =>
      columns.map(column => cast_julia_type(context, column)),
    ),
  )

  let body: string[] = ['']
  let using_body: string[] = []
  let type_alias_body: string[] = ['const Nullable{T} = Union{Missing,T}']

  if (
    types.includes('Dates.Date') ||
    types.includes('Dates.DateTime') ||
    types.includes('Dates.Time')
  ) {
    using_body = using_body.concat(['using Dates'])
    using_body = using_body.concat(['using Maybe'])
  }
  if (types.includes('UUID')) {
    using_body = using_body.concat(['using UUIDs'])
  }

  // Block Line
  if (using_body.length > 0) {
    using_body.sort()
    body = body.concat(using_body)
  }

  body = body.concat(['abstract type PostgresTable end'])
  body = body.concat([''])
  // body = body.concat(['import Base: @kwdef'])
  // body = body.concat(['Nullable{T} = Nullable{T}'])

  if (types.includes('Int2')) {
    type_alias_body = type_alias_body.concat(['const Int2 = Int8'])
  }
  if (types.includes('Int3')) {
    type_alias_body = type_alias_body.concat(['const Int3 = Int8'])
  }
  if (types.includes('Int4')) {
    type_alias_body = type_alias_body.concat(['const Int4 = Int8'])
  }
  if (types.includes('Float2')) {
    type_alias_body = type_alias_body.concat(['const Float2 = Float16'])
  }
  if (types.includes('Float4')) {
    type_alias_body = type_alias_body.concat(['const Float4 = Float16'])
  }
  if (types.includes('Float8')) {
    type_alias_body = type_alias_body.concat(['const Float8 = Float16'])
  }
  if (types.includes('JSON')) {
    // type_alias_body = type_alias_body.concat([
    //   'JSONScalar = Nullable{Int32,Int64,String,Bool,Float32,Float64}',
    //   'JSON = Nullable{JSONScalar,Dict{String,JSON}, Array{JSON}}',
    // ])
    type_alias_body = type_alias_body.concat(['const JSON = Any'])
  }

  // Block Line
  if (type_alias_body.length > 0) {
    body = body.concat([''])
    type_alias_body.sort()
    body = body.concat(type_alias_body)
  }

  return body.join('\n')
}

//------------------------------------------------------------------------------

export function render_struct(name: string, body: string, comment?: string) {
  return lines([
    comment,
    `Base.@kwdef mutable struct ${name} <: PostgresTable`,
    pad_lines(body, JULIA_INDENT),
    'end',
  ])
}

export function render_julia_struct({ name, comment, fields, supertype }: JuliaStruct) {
  const field_groups = groupBy(fields, 'category')
  const parent = supertype ? ` <: ${supertype}` : ''

  return lines([
    comment,
    `Base.@kwdef mutable struct ${name}${parent}`,
    pad_lines(
      [
        ...get(field_groups, 'id', []),
        ...get(field_groups, 'relation', []),
        ...get(field_groups, 'attribute', []),
      ].map(field => render_julia_struct_field(field)),
      JULIA_INDENT,
    ),
    'end',
  ])
}

export function render_julia_struct_field({ comment, name, type }: JuliaStructField) {
  return lines([comment, `${name}::${type}`])
}

//------------------------------------------------------------------------------

export function render_octo_import(name: string, table: string) {
  return `Schema.model(${name}; table_name="${table}")`
}

export function render_octo_definitions(octo_imports: string[]) {
  return `${banner(JULIA_COMMENT, `Octo Definitions: (${octo_imports.length})`)}
function octo_definitions()
    import Octo.Schema

${pad_lines(octo_imports.join('\n'), JULIA_INDENT)}

    return nothing
end`
}

//------------------------------------------------------------------------------

export interface JuliaModule {
  category: string
  comment?: string | undefined
  name: string
  exports: string[]
  lines: string[]
}

export interface JuliaStruct {
  category: string
  comment?: string | undefined
  name: string
  fields: JuliaStructField[]
  is_mutable: boolean
  is_kwdef: boolean
  supertype?: string
}

export interface JuliaStructField {
  category: string
  comment?: string | undefined
  name: string
  type: string
  is_unique: boolean
  is_required: boolean
}
