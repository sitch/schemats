import { flatMap, get, groupBy, size } from 'lodash'

import type { ColumnDefinition, ForeignKey, TableDefinition } from '../adapters/types'
import type { BuildContext } from '../compiler'
import { cast_typedb_coreferences } from '../coreference'
import { banner, lines, pad_lines } from '../formatters'
import { pragma, translate_type } from '../typemaps/julia-typemap'
import type { BackendContext } from './base'
import { header } from './base'

//------------------------------------------------------------------------------

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
    return ''
  },
  name: ({ config }: BuildContext, { name }: TableDefinition): string => {
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
      `# Relation: ${primary_table}.${primary_column} => ${foreign_table}.${foreign_column}`,
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
    return `Nullable{${name}}`
  },
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

    const fields = record.columns.map(cast_field(context)).sort()
    const relations = foreign_keys.map(cast_relation(context)).sort()

    return lines([
      comment,
      `mutable struct ${name} {`,
      pad_lines('iid:DbId', '  '),
      pad_lines(lines(fields), '  '),
      pad_lines(lines(relations), '  '),
      '}',
    ])
  }
}

//------------------------------------------------------------------------------

const cast_relation = (context: BuildContext) => (record: ForeignKey) => {
  const name = Relation.name(context, record)
  const type = Relation.type(context, record)
  const comment = Relation.comment(context, record)

  const line = `${name}::${type}`
  return lines([comment, line])
}

//------------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/require-await
export const render_julia = async (context: BuildContext) => {
  const tables = context.tables
  const foreign_keys = context.foreign_keys.flat()
  const entities = flatMap(tables, cast_entity(context))
  // const relations = flatMap(foreign_keys, cast_relation(context));

  const backend: BackendContext = {
    backend: 'julia',
    comment: '#',
    indent: '  ',
    coreferences: cast_typedb_coreferences(context),
  }

  return lines([
    header(context, backend),
    pragma(context),
    // coreference_banner(context, backend),
    banner(backend.comment, `Entities (${size(tables)})`),
    banner(backend.comment, `Relations (${size(foreign_keys)})`),
    lines(entities, '\n\n'),
  ])
}
