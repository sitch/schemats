import { flatMap, size } from 'lodash'

import type { ColumnDefinition, ForeignKey, TableDefinition } from '../adapters/types'
import type { BuildContext } from '../compiler'
import { cast_typedb_coreferences } from '../coreference'
import { banner, lines, pad_lines } from '../formatters'
import type { RelationshipEdge } from '../relationships'
import { cast_typedb_type, is_reserved_word, pragma } from '../typemaps/typedb-typemap'
import type { BackendContext } from './base'
import { coreference_banner, header } from './base'

export const TYPEDB_COMMENT = '#'
export const TYPEDB_INDENT = '  '
// export const TYPEDB_CHARACTER_LINE_LIMIT = 92
export const TYPEDB_CHARACTER_LINE_LIMIT = 80

//------------------------------------------------------------------------------

export const normalize_name = (name: string): string =>
  is_reserved_word(name) ? `${name}_` : name

const prefix = (context: BuildContext) => {
  return `${context.config.database.toLowerCase()}-`
}

//------------------------------------------------------------------------------

const Attribute = {
  comment: (_context: BuildContext, _column: ColumnDefinition): string => {
    return ``
  },
  name: ({ config }: BuildContext, { name }: ColumnDefinition): string => {
    return normalize_name(config.formatAttributeName(name))
  },
  type: (_context: BuildContext, _record: ColumnDefinition): string => {
    // return `${prefix(context)}attribute`
    return 'attribute'
  },
}

const Entity = {
  comment: (_context: BuildContext, _table: TableDefinition): string => {
    return ``
  },
  name: ({ config }: BuildContext, { name }: TableDefinition): string => {
    return normalize_name(config.formatEntityName(name))
  },
  type: (context: BuildContext, _table: TableDefinition): string => {
    return `${prefix(context)}entity`
  },
}

const Relation = {
  comment: ({ config }: BuildContext, { constraint }: ForeignKey): string => {
    return `# Source: '${config.schema}.${constraint}'`
  },
  name: (
    { config }: BuildContext,
    { primary_table, primary_column, foreign_table, foreign_column }: ForeignKey,
  ): string => {
    const table_source = config.formatRelationName(primary_table)
    const attribute_source = config.formatRelationName(primary_column)
    const table_destination = config.formatRelationName(foreign_table)
    const attribute_destination = config.formatRelationName(foreign_column)

    return normalize_name(
      `${table_source}-${attribute_source}-${table_destination}-${attribute_destination}`,
    )
  },
  type: (context: BuildContext, _foreign_key: ForeignKey): string => {
    return `${prefix(context)}relation`
  },
}

const Edge = {
  comment: (_context: BuildContext, { comment }: RelationshipEdge): string => {
    return comment ? `# ${comment}` : ''
  },
  name: (
    { config }: BuildContext,
    { name, domain, codomain }: RelationshipEdge,
  ): string => {
    const domain_name = config.formatRelationName(domain.name)
    const codomain_name = config.formatRelationName(codomain.name)

    return normalize_name(`${domain_name}-${name}-${codomain_name}`)
  },
  type: (context: BuildContext, _foreign_key: RelationshipEdge): string => {
    return `${prefix(context)}relation`
  },
}

//------------------------------------------------------------------------------

const cast_attribute = (context: BuildContext) => (column: ColumnDefinition) => {
  const name = Attribute.name(context, column)
  const type = Attribute.type(context, column)
  const value = cast_typedb_type(context, column)
  const comment = Attribute.comment(context, column)

  const line = `${name} sub ${type}, value ${value};`
  return lines([comment, line])
}

//------------------------------------------------------------------------------

const cast_field =
  (context: BuildContext) =>
  (column: ColumnDefinition): string => {
    const name = Attribute.name(context, column)
    const comment = Attribute.comment(context, column)

    const line = `, owns ${name}`
    return lines([comment, line])
  }

//------------------------------------------------------------------------------

const cast_entity =
  (context: BuildContext, backend: BackendContext) => (record: TableDefinition) => {
    const name = Entity.name(context, record)
    const type = Entity.type(context, record)
    const comment = Entity.comment(context, record)

    const columns = record.columns.filter(
      ({ name }) => !(name in backend.coreferences.error),
    )

    const fields = columns.map(cast_field(context))
    const attributes = columns.map(cast_attribute(context))

    const line = `${name} sub ${type}`
    return lines([
      comment,
      line,
      pad_lines(lines(fields), '  '),
      ';',
      lines(attributes),
    ])
  }

//------------------------------------------------------------------------------

const cast_relation =
  (context: BuildContext, _backend: BackendContext) => (record: ForeignKey) => {
    const { config } = context
    const { primary_table, primary_column, foreign_table, foreign_column } = record

    const name = Relation.name(context, record)
    const type = Relation.type(context, record)
    const comment = Relation.comment(context, record)

    const line = `${name} sub ${type}`
    const relations = [
      `, owns ${config.formatAttributeName(primary_column)}`,
      `, owns ${config.formatAttributeName(foreign_column)}`,
      `, relates ${config.formatEntityName(primary_table)}`,
      `, relates ${config.formatEntityName(foreign_table)}`,
    ]

    return lines([comment, line, pad_lines(lines(relations), '  '), ';'])
  }

const cast_edge =
  (context: BuildContext, _backend: BackendContext) => (record: RelationshipEdge) => {
    const { config } = context
    const { domain, codomain, properties } = record

    const name = Edge.name(context, record)
    const type = Edge.type(context, record)
    const comment = Edge.comment(context, record)

    const line = `${name} sub ${type}`
    const relations = [
      ...properties.map(({ name }) => `, owns ${config.formatAttributeName(name)}`),
      `, relates ${config.formatEntityName(domain.name)}`,
      `, relates ${config.formatEntityName(codomain.name)}`,
    ]

    return lines([comment, line, pad_lines(lines(relations), '  '), ';'])
  }

//------------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/require-await
export const render_typedb = async (context: BuildContext) => {
  const backend: BackendContext = {
    backend: 'typedb',
    comment: '#',
    indent: '  ',
    character_line_limit: 80,
    coreferences: cast_typedb_coreferences(context),
  }

  const tables = context.tables
  const foreign_keys = context.foreign_keys.flat()
  const entities = flatMap(tables, cast_entity(context, backend))
  const relations = flatMap(foreign_keys, cast_relation(context, backend))
  const edges = flatMap(foreign_keys, cast_edge(context, backend))

  return lines([
    header(context, backend),
    pragma(context),
    coreference_banner(context, backend),
    banner(backend.comment, `Entities (${size(tables)})`),
    lines(entities, '\n\n'),
    banner(backend.comment, `Relations (${size(foreign_keys)})`),
    lines(relations, '\n\n'),
    lines(edges, '\n\n'),
  ])
}
