// import inflection from 'inflection'
import { flatMap, get, groupBy, size } from 'lodash'

import type {
  ForeignKeyDefinition,
  PropertyDefinition,
  TableDefinition,
} from '../adapters/types'
import type { BackendContext } from '../backends'
import type { BuildContext } from '../compiler'
import { build_type_qualified_coreferences } from '../coreference'
import { banner, lines, pad_lines } from '../formatters'
import { JULIA_CHARACTER_LINE_LIMIT, JULIA_COMMENT, JULIA_INDENT } from '../lang/julia'
import { translate_type } from '../typemaps/julia-typemap'
import { header } from './base'
// import { inflect } from '../formatters'

//------------------------------------------------------------------------------

const normalize_name = (name: string): string => {
  return name
  // return is_reserved_word(name) ? `${name}_` : name;
}

// const prefix = (context: BuildContext) => {
//   return `${context.config.database.toLowerCase()}-`
// }

//------------------------------------------------------------------------------

const JuliaAttribute = {
  comment: (_context: BuildContext, _column: PropertyDefinition): string => {
    return ''
  },
  name: ({ config }: BuildContext, { name }: PropertyDefinition): string => {
    return normalize_name(config.formatAttributeName(name))
  },
  type: (context: BuildContext, column: PropertyDefinition): string => {
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
      source_table,
      source_column,
      target_table,
      target_column,
      constraint,
    }: ForeignKeyDefinition,
  ): string => {
    return lines([
      constraint && `# Constraint: ${constraint}`,
      `# Relation: ${source_table}.${source_column} => ${target_table}.${target_column}`,
    ])
  },
  name: ({ config }: BuildContext, { source_column }: ForeignKeyDefinition): string => {
    // TODO: improve global suffix handling
    const relation = source_column.replace(/_id$/, '').replace(/_?I[Dd]$/, '')
    return normalize_name(config.formatRelationName(relation))
  },
  type: (context: BuildContext, foreign_key: ForeignKeyDefinition): string => {
    const column = { name: foreign_key.target_table, columns: [] }
    const name = Entity.name(context, column)
    return `Nullable{${name}}`
  },
}

const cast_export = (context: BuildContext) => (record: TableDefinition) => {
  const name = Entity.name(context, record)
  return lines([`export ${name}`])
}

//------------------------------------------------------------------------------

const cast_field =
  (context: BuildContext) =>
  (column: PropertyDefinition): string => {
    const name = JuliaAttribute.name(context, column)
    const type = JuliaAttribute.type(context, column)
    const comment = JuliaAttribute.comment(context, column)

    const line = `${name}::${type}`
    return lines([comment, line])
  }

//------------------------------------------------------------------------------

const cast_entity = (context: BuildContext) => {
  const relations_map = groupBy(context.foreign_keys, 'source_table')

  return (record: TableDefinition) => {
    const name = Entity.name(context, record)
    const comment = Entity.comment(context, record)

    const foreign_keys = get(relations_map, record.name, [])

    const fields = record.columns.map(cast_field(context)).sort()
    const relations = foreign_keys.map(cast_relation(context)).sort()

    return lines([
      comment,
      `Base.@kwdef mutable struct ${name}`,
      // `Base.@kwdef mutable struct ${name} <: AbstractModel {`,
      pad_lines('# iid:DbId', '  '),
      pad_lines(lines(fields), '  '),
      pad_lines('# Relations: '),
      pad_lines(lines(relations), '  '),
      // '}',
      'end',
    ])
  }
}

//------------------------------------------------------------------------------

const cast_relation = (context: BuildContext) => (record: ForeignKeyDefinition) => {
  const name = Relation.name(context, record)
  const type = Relation.type(context, record)
  const comment = Relation.comment(context, record)

  const line = `${name}::${type}`
  return lines([comment, line])
}

//------------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/require-await
export const render_julia_genie = async (context: BuildContext) => {
  const tables = context.tables
  const foreign_keys = context.foreign_keys.flat()
  const exported = flatMap(tables, cast_export(context))
  const entities = flatMap(tables, cast_entity(context))
  // const relations = flatMap(foreign_keys, cast_relation(context));

  const backend: BackendContext = {
    backend: 'julia',
    comment: JULIA_COMMENT,
    indent: JULIA_INDENT,
    character_line_limit: JULIA_CHARACTER_LINE_LIMIT,
    coreferences: build_type_qualified_coreferences(context, 'julia'),
  }

  return lines([
    header(context, backend),
    // pragma(context),

    //     `
    // module ${inflect(context.schema, 'pascal')}

    // import SearchLight: AbstractModel, DbId

    // Nullable{T} = Nullable{T}
    // `,
    `

Nullable{T} = Nullable{T}
`,
    lines(exported, '\n'),

    // coreference_banner(context, backend),
    // banner(backend.comment, `Relations (${size(foreign_keys)})`),
    // banner(backend.comment, `Entities (${size(tables)})`),
    banner(
      backend.comment,
      lines([`Relations (${size(foreign_keys)})`, `Entities (${size(tables)})`]),
    ),
    lines(entities, '\n\n'),
    // 'end\n',
  ])
}
