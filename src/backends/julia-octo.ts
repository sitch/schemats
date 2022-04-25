import inflection from 'inflection'
import { flatMap, get, groupBy, partition, size, sortBy } from 'lodash'

import type {
  ForeignKeyDefinition,
  PropertyDefinition,
  TableDefinition,
} from '../adapters/types'
import type { BackendContext } from '../backends'
import type { BuildContext } from '../compiler'
import { build_type_qualified_coreferences } from '../coreference'
import { banner, lines } from '../formatters'
import {
  INDENT_COMMENT_LINE,
  JULIA_CHARACTER_LINE_LIMIT,
  JULIA_COMMENT,
  JULIA_INDENT,
  render_module,
  render_module_export,
  render_octo_definitions,
  render_octo_import,
  render_struct,
  render_using_pragma,
} from '../lang/julia'
import { cast_julia_type, translate_type } from '../typemaps/julia-typemap'
import { identifier_like } from '../utils'
import { header } from './base'

const normalize_name = (name: string): string => {
  return name
  // return is_reserved_word(name) ? `${name}_` : name;
}

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

//------------------------------------------------------------------------------

const Entity = {
  comment: (_context: BuildContext, _table: TableDefinition): string => {
    // return `# Table: ${name}`
    return ''
  },
  name: ({ config }: BuildContext, { name }: TableDefinition): string => {
    return normalize_name(config.formatEntityName(name))
  },
}

//------------------------------------------------------------------------------

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
      `# Relation:   ${source_table}.${source_column} => ${target_table}.${target_column}`,
    ])
  },
  name: ({ config }: BuildContext, { source_column }: ForeignKeyDefinition): string => {
    const relation = handle_suffix(source_column)
    return normalize_name(config.formatRelationName(relation))
  },
  type: (context: BuildContext, foreign_key: ForeignKeyDefinition): string => {
    const column = { name: foreign_key.target_table, columns: [] }
    const name = Entity.name(context, column)
    return `Nullable{${name}}`
  },
}

function handle_suffix(column_name: string) {
  // TODO: improve global suffix handling
  return column_name.replace(/_id$/, '').replace(/_?I[Dd]$/, '')
}

//------------------------------------------------------------------------------

const cast_entity = (context: BuildContext) => {
  const relations_map = groupBy(context.foreign_keys, 'source_table')

  return (record: TableDefinition) => {
    const name = Entity.name(context, record)
    const comment = Entity.comment(context, record)

    const foreign_keys = get(relations_map, record.name, [])

    const [id_columns, attribute_columns] = partition(record.columns, ({ name }) =>
      identifier_like(name),
    )

    const fields = [
      ...sortBy(id_columns, ({ name }) => name.length).map(cast_field(context)),
      ...sortBy(attribute_columns, column => [
        cast_julia_type(context, column),
        column.name,
      ]).map(cast_field(context)),
    ]
    const relations = foreign_keys.map(cast_relation(context)).sort()

    const field_lines = size(fields) > 0 ? [lines(fields)] : []
    const relations_lines =
      size(relations) > 0
        ? [INDENT_COMMENT_LINE, '# Relations:', INDENT_COMMENT_LINE, lines(relations)]
        : []

    return render_struct(name, lines([...field_lines, ...relations_lines]), comment)

    // const julia_fields = []

    // return render_julia_struct({
    //   comment,
    //   name,
    //   fields: julia_fields,
    // })
  }
}

const cast_field =
  (context: BuildContext) =>
  (column: PropertyDefinition): string => {
    const name = JuliaAttribute.name(context, column)
    const type = JuliaAttribute.type(context, column)
    const comment = JuliaAttribute.comment(context, column)

    const line = `${name}::${type}`
    return lines([comment, line])
  }

const cast_relation = (context: BuildContext) => (record: ForeignKeyDefinition) => {
  const name = Relation.name(context, record)
  const type = Relation.type(context, record)
  const comment = Relation.comment(context, record)

  const line = `#   ${name}::${type}`
  return lines([comment, line, INDENT_COMMENT_LINE])
}

//------------------------------------------------------------------------------

const cast_export = (context: BuildContext) => (record: TableDefinition) => {
  const name = Entity.name(context, record)
  return render_module_export(name)
}

const cast_octo_import = (context: BuildContext) => (record: TableDefinition) => {
  const name = Entity.name(context, record)
  return render_octo_import(name, name)
}

//------------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/require-await
export const render_julia_octo = async (context: BuildContext) => {
  const tables = context.tables
  const foreign_keys = context.foreign_keys.flat()
  const exported = flatMap(tables, cast_export(context))
  const octo_imports = flatMap(tables, cast_octo_import(context))

  const entities = flatMap(tables, cast_entity(context))
  // TODO: fix
  // const relations = flatMap(foreign_keys, cast_relation(context))

  const backend: BackendContext = {
    backend: 'julia',
    comment: JULIA_COMMENT,
    indent: JULIA_INDENT,
    character_line_limit: JULIA_CHARACTER_LINE_LIMIT,
    coreferences: build_type_qualified_coreferences(context, 'julia'),
  }

  const module_name = inflection.underscore(context.config.database)

  return lines([
    header(context, backend),
    render_module(module_name, [
      lines(exported),
      render_using_pragma(context),
      banner(
        backend.comment,
        lines([`Entities  (${size(tables)})`, `Relations (${size(foreign_keys)})`]),
      ),
      lines(entities, '\n\n'),
      render_octo_definitions(octo_imports),
    ]),
  ])
}
