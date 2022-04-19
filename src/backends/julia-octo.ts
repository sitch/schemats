import inflection from 'inflection'
import { flatMap, get, groupBy, partition, size } from 'lodash'

import { ColumnDefinition, ForeignKey, TableDefinition } from '../adapters/types'
import { BuildContext } from '../compiler'
import { cast_typedb_coreferences } from '../coreference'
import { banner, lines, pad_lines } from '../formatters'
// import { inflect } from '../formatters'
import { translate_type } from '../typemaps/julia-typemap'
import { BackendContext, header } from './base'

const INDENT_COMMENT_LINE =
  '#-----------------------------------------------------------------------------'

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
  comment: (_context: BuildContext, { name }: TableDefinition): string => {
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
    return `Nullable{${name}}`
  },
}

// const cast_export = (context: BuildContext) => (record: TableDefinition) => {
//   const name = Entity.name(context, record)
//   return lines([`export ${name}`])
// }

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
      return name_underscore == 'id' || name_underscore.endsWith('_id')
    })

    const fields = [
      ...id_columns.map(cast_field(context)).sort(),
      ...attribute_columns.map(cast_field(context)).sort(),
    ]
    const relations = foreign_keys.map(cast_relation(context)).sort()

    const field_lines =
      size(fields) > 0
        ? [
            // pad_lines('# iid:DbId', '  '),
            pad_lines(lines(fields), '  '),
          ]
        : []

    const relations_lines =
      size(relations) > 0
        ? [
            '\n',
            pad_lines(INDENT_COMMENT_LINE, '  '),
            pad_lines('# Relations:'),
            pad_lines(INDENT_COMMENT_LINE, '  '),
            pad_lines(lines(relations), '  '),
            pad_lines(INDENT_COMMENT_LINE, '  '),
          ]
        : []

    return lines([
      comment,
      `@kwdef mutable struct ${name}`,
      // `@kwdef mutable struct ${name} <: AbstractModel {`,

      ...field_lines,
      ...relations_lines,
      // '}',
      'end',
    ])
  }
}

//------------------------------------------------------------------------------

const cast_relation = (context: BuildContext) => (record: ForeignKey) => {
  const name = Relation.name(context, record)
  const type = Relation.type(context, record)
  const comment = Relation.comment(context, record)

  const line = `${name}::${type}`
  return lines([comment, line, INDENT_COMMENT_LINE])
}

//------------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/require-await
export const render_julia_octo = async (context: BuildContext) => {
  const tables = context.tables
  const foreign_keys = context.foreign_keys.flat()
  // const exported = flatMap(tables, cast_export(context))
  const octo_imports = flatMap(tables, cast_octo_import(context))

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
    // pragma(context),

    //     `
    // module ${inflect(context.schema, 'pascal')}

    // import SearchLight: AbstractModel, DbId
    // import Base: @kwdef

    // Nullable{T} = Union{T,Nothing}
    // `,
    `
import Base: @kwdef

Nullable{T} = Union{T,Nothing}
`,
    // lines(exported, '\n'),

    // coreference_banner(context, backend),
    // banner(backend.comment, `Relations (${size(foreign_keys)})`),
    // banner(backend.comment, `Entities (${size(tables)})`),
    banner(
      backend.comment,
      lines([`Relations (${size(foreign_keys)})`, `Entities (${size(tables)})`]),
    ),
    lines(entities, '\n\n'),
    // 'end\n',

    banner(backend.comment, `Models: ${size(octo_imports)}`),
    lines(octo_imports, '\n'),
  ])
}
