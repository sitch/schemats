import inflection from 'inflection'
import { flatMap, get, groupBy, partition, size, sortBy, uniq } from 'lodash'

import type { ColumnDefinition, ForeignKey, TableDefinition } from '../adapters/types'
import type { BuildContext } from '../compiler'
import { cast_typedb_coreferences } from '../coreference'
import { banner, lines, pad_lines } from '../formatters'
import { cast_julia_type, translate_type } from '../typemaps/julia-typemap'
import type { BackendContext } from './base'
import { header } from './base'

// const INDENT_COMMENT_LINE1 =
//   '############################################################################'

// const INDENT_COMMENT_LINE2 =
//   '#==========================================================================='

const INDENT_COMMENT_LINE3 =
  '#---------------------------------------------------------------------------'

const normalize_name = (name: string): string => {
  return name
  // return is_reserved_word(name) ? `${name}_` : name;
}

// const prefix = (context: BuildContext) => {
//   return `${context.config.database.toLowerCase()}-`
// }

//------------------------------------------------------------------------------

const Attribute = {
  comment: (_context: BuildContext, _column: ColumnDefinition): string => {
    return ''
  },
  name: ({ config }: BuildContext, { name }: ColumnDefinition): string => {
    return normalize_name(config.formatAttributeName(name))
  },
  type: (context: BuildContext, column: ColumnDefinition): string => {
    return translate_type(context, column)
  },
}

const Entity = {
  comment: (_context: BuildContext, _table: TableDefinition): string => {
    // return `# Table: ${name}`
    return ''
  },
  name: ({ config }: BuildContext, { name }: TableDefinition): string => {
    // name = inflection.singularize(name)
    return normalize_name(config.formatEntityName(name))
  },
}

const Relation = {
  comment: (
    _context: BuildContext,
    {
      primary_table,
      primary_column,
      foreign_table,
      foreign_column,
      constraint,
    }: ForeignKey,
  ): string => {
    return lines([
      constraint && `# Constraint: ${constraint}`,
      `# Relation:   ${primary_table}.${primary_column} => ${foreign_table}.${foreign_column}`,
    ])
  },
  name: ({ config }: BuildContext, { primary_column }: ForeignKey): string => {
    // TODO: improve global suffix handling
    const relation = primary_column.replace(/_id$/, '').replace(/_?I[Dd]$/, '')
    return normalize_name(config.formatRelationName(relation))
  },
  type: (context: BuildContext, foreign_key: ForeignKey): string => {
    const column = { name: foreign_key.foreign_table, columns: [] }
    const name = Entity.name(context, column)
    return `Union{Missing,${name}}`
  },
}

const cast_export = (context: BuildContext) => (record: TableDefinition) => {
  const name = Entity.name(context, record)
  return lines([`export ${name}`])
}

const cast_octo_import = (context: BuildContext) => (record: TableDefinition) => {
  const name = Entity.name(context, record)
  return lines([`Schema.model(${name}, table_name="${name}")`])
}

//------------------------------------------------------------------------------

const cast_field =
  (context: BuildContext) =>
  (column: ColumnDefinition): string => {
    const name = Attribute.name(context, column)
    const type = Attribute.type(context, column)
    const comment = Attribute.comment(context, column)

    const line = `${name}::${type}`
    return lines([comment, line])
  }

//------------------------------------------------------------------------------

const cast_entity = (context: BuildContext) => {
  const relations_map = groupBy(context.foreign_keys, 'primary_table')

  return (record: TableDefinition) => {
    const name = Entity.name(context, record)
    const comment = Entity.comment(context, record)

    const foreign_keys = get(relations_map, record.name, [])

    const [id_columns, attribute_columns] = partition(record.columns, ({ name }) => {
      const name_underscore = inflection.underscore(name)
      return (
        name_underscore == 'id' ||
        name_underscore.endsWith('_id') ||
        name_underscore.endsWith('id')
      )
    })

    const fields = [
      ...sortBy(id_columns, ({ name }) => name.length).map(cast_field(context)),
      // size(id_columns) > 0 && size(attribute_columns) > 0
      //   ? INDENT_COMMENT_LINE3
      //   : false,
      ...sortBy(attribute_columns, column => [
        cast_julia_type(context, column),
        column.name,
      ]).map(cast_field(context)),
    ]
    const relations = foreign_keys.map(cast_relation(context)).sort()

    const field_lines =
      size(fields) > 0
        ? [
            // pad_lines('# iid:DbId', '    '),
            pad_lines(lines(fields), '    '),
          ]
        : []

    const relations_lines =
      size(relations) > 0
        ? [
            pad_lines(INDENT_COMMENT_LINE3, '    '),
            // pad_lines('\n' + INDENT_COMMENT_LINE3, '    '),
            pad_lines('  # Relations:'),
            pad_lines(INDENT_COMMENT_LINE3, '    '),
            pad_lines(lines(relations), '    '),
          ]
        : []

    return lines([
      comment,
      `@kwdef mutable struct ${name}`,
      ...field_lines,
      ...relations_lines,
      'end',
    ])
  }
}

//------------------------------------------------------------------------------

const cast_relation = (context: BuildContext) => (record: ForeignKey) => {
  const name = Relation.name(context, record)
  const type = Relation.type(context, record)
  const comment = Relation.comment(context, record)

  const line = `#   ${name}::${type}`
  return lines([comment, line, INDENT_COMMENT_LINE3])
}

//------------------------------------------------------------------------------

const type_pragma = (context: BuildContext) => {
  const types = uniq(
    context.tables.flatMap(({ columns }) =>
      columns.map(column => cast_julia_type(context, column)),
    ),
  )

  let body: string[] = ['']
  let using_body: string[] = []
  let type_alias_body: string[] = []

  if (
    types.includes('Dates.Date') ||
    types.includes('Dates.DateTime') ||
    types.includes('Dates.Time')
  ) {
    using_body = using_body.concat(['using Dates'])
  }
  if (types.includes('UUID')) {
    using_body = using_body.concat(['using UUIDs'])
  }

  // Block Line
  if (using_body.length > 0) {
    using_body.sort()
    body = body.concat(using_body)
  }

  body = body.concat(['import Base: @kwdef'])
  // body = body.concat([''])
  // body = body.concat(['Nullable{T} = Union{Missing,T}'])

  if (types.includes('Int2')) {
    type_alias_body = type_alias_body.concat(['Int2 = Int8'])
  }
  if (types.includes('Int3')) {
    type_alias_body = type_alias_body.concat(['Int3 = Int8'])
  }
  if (types.includes('Int4')) {
    type_alias_body = type_alias_body.concat(['Int4 = Int8'])
  }
  if (types.includes('Float2')) {
    type_alias_body = type_alias_body.concat(['Float2 = Float16'])
  }
  if (types.includes('Float4')) {
    type_alias_body = type_alias_body.concat(['Float4 = Float16'])
  }
  if (types.includes('Float8')) {
    type_alias_body = type_alias_body.concat(['Float8 = Float16'])
  }
  if (types.includes('JSON')) {
    // type_alias_body = type_alias_body.concat([
    //   'JSONScalar = Union{Missing,Int32,Int64,String,Bool,Float32,Float64}',
    //   'JSON = Union{Missing,JSONScalar,Dict{String,JSON}, Array{JSON}}',
    // ])
    type_alias_body = type_alias_body.concat(['JSON = Any'])
  }

  // Block Line
  if (type_alias_body.length > 0) {
    body = body.concat([''])
    type_alias_body.sort()
    body = body.concat(type_alias_body)
  }

  return body.join('\n')
}

// eslint-disable-next-line @typescript-eslint/require-await
export const render_julia_octo = async (context: BuildContext) => {
  const tables = context.tables
  const foreign_keys = context.foreign_keys.flat()
  const exported = flatMap(tables, cast_export(context))
  const octo_imports = flatMap(tables, cast_octo_import(context))

  const entities = flatMap(tables, cast_entity(context))
  // const relations = flatMap(foreign_keys, cast_relation(context));

  const backend: BackendContext = {
    backend: 'julia',
    comment: '#',
    indent: '    ',
    coreferences: cast_typedb_coreferences(context),
  }

  return lines([
    header(context, backend),
    // Start Module
    `
module ${inflection.underscore(context.config.database)}

`,
    lines(exported, '\n'),
    type_pragma(context),

    // coreference_banner(context, backend),
    // banner(backend.comment, `Relations (${size(foreign_keys)})`),
    // banner(backend.comment, `Entities  (${size(tables)})`),

    banner(
      backend.comment,
      lines([`Entities  (${size(tables)})`, `Relations (${size(foreign_keys)})`]),
    ),
    lines(entities, '\n\n'),

    banner(backend.comment, `Octo Definitions: (${size(octo_imports)})`),
    'function octo_definitions()',
    pad_lines(lines(['import Octo.Schema', ...octo_imports], '\n'), backend.indent),
    'end\n',

    // End module
    'end\n',
  ])
}
