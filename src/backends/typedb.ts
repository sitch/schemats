import { flatMap, size } from 'lodash'

import type { ColumnDefinition, ForeignKey, TableDefinition } from '../adapters/types'
import type { BuildContext } from '../compiler'
import { build_type_qualified_coreferences } from '../coreference'
import { code_section, lines, pad_lines } from '../formatters'
import type { RelationshipEdge } from '../relationships'
import { cast_typedb_type, is_reserved_word, pragma } from '../typemaps/typedb-typemap'
import type { BackendContext } from './base'
import { coreference_banner, header } from './base'

export const TYPEDB_COMMENT = '#'
export const TYPEDB_INDENT = '  '
export const TYPEDB_CHARACTER_LINE_LIMIT = 80

//------------------------------------------------------------------------------

export const normalize_name = (name: string): string =>
  is_reserved_word(name) ? `${name}_` : name

const prefix = (context: BuildContext) => {
  return `${context.config.database.toLowerCase()}-`
}

//------------------------------------------------------------------------------

// TODO: eliminate this
// Filter out error coreference values
export function is_valid_attribute(backend: BackendContext) {
  return ({ name }: ColumnDefinition) => !(name in backend.coreferences.error)
}

export function is_valid_foreign_key(backend: BackendContext) {
  return ({ primary_column, foreign_column }: ForeignKey) =>
    !(primary_column in backend.coreferences.error) &&
    !(foreign_column in backend.coreferences.error)
}

export function verify_foreign_key(backend: BackendContext) {
  return (foreign_key: ForeignKey) => {
    if (is_valid_foreign_key(backend)(foreign_key)) {
      return [foreign_key]
    }
    console.error('Skipping table foreign_key', foreign_key)
    return []
  }
}

export function verify_node_or_table(backend: BackendContext) {
  return (table: TableDefinition) => {
    const columns = table.columns.filter(column => {
      const valid = is_valid_attribute(backend)(column)
      if (!valid) {
        console.error(`Skipping table: ${table.name}`, column)
      }
      return valid
    })
    return [{ ...table, columns }]
  }
}

export function verify_edge(backend: BackendContext) {
  return (edge: RelationshipEdge) => {
    const properties = edge.columns.filter(property => {
      const valid = is_valid_attribute(backend)(property)
      if (!valid) {
        console.error(`Skipping edge: ${edge.name}`, property)
      }
      return valid
    })
    return [{ ...edge, properties }]
  }
}
//------------------------------------------------------------------------------

export const Attribute = {
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

export const NodeOrEntity = {
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

export const Relation = {
  comment: ({ config }: BuildContext, { constraint }: ForeignKey): string => {
    return `${TYPEDB_COMMENT} Source: '${config.schema}.${constraint}'`
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

export const Edge = {
  comment: (_context: BuildContext, { comment }: RelationshipEdge): string => {
    return comment ? `${TYPEDB_COMMENT} ${comment}` : ''
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

    return lines([comment, `, owns ${name}`])
  }

//------------------------------------------------------------------------------

const cast_node_or_entity =
  (context: BuildContext, backend: BackendContext) => (record: TableDefinition) => {
    const name = NodeOrEntity.name(context, record)
    const type = NodeOrEntity.type(context, record)
    const comment = NodeOrEntity.comment(context, record)

    const columns = record.columns.filter(
      ({ name }) => !(name in backend.coreferences.error),
    )
    const fields = columns.map(cast_field(context))
    const attributes = columns.map(cast_attribute(context))

    return lines([
      comment,
      `${name} sub ${type}`,
      pad_lines(lines(fields), TYPEDB_INDENT),
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

    const relations = [
      `, owns ${config.formatAttributeName(primary_column)}`,
      `, owns ${config.formatAttributeName(foreign_column)}`,
      `, relates ${config.formatEntityName(primary_table)}`,
      `, relates ${config.formatEntityName(foreign_table)}`,
    ]

    return lines([
      comment,
      `${name} sub ${type}`,
      pad_lines(lines(relations), TYPEDB_INDENT),
      ';',
    ])
  }

const cast_edge =
  (context: BuildContext, _backend: BackendContext) => (record: RelationshipEdge) => {
    const { config } = context
    const { domain, codomain, columns } = record

    const name = Edge.name(context, record)
    const type = Edge.type(context, record)
    const comment = Edge.comment(context, record)

    const relations = [
      ...columns.map(({ name }) => `, owns ${config.formatAttributeName(name)}`),
      `, relates ${config.formatEntityName(domain.name)}`,
      `, relates ${config.formatEntityName(codomain.name)}`,
    ]
    const attributes = columns.map(cast_attribute(context))

    return lines([
      comment,
      `${name} sub ${type}`,
      pad_lines(lines(relations), TYPEDB_INDENT),
      ';',
      lines(attributes),
    ])
  }

//------------------------------------------------------------------------------

export function postprocess_context(
  context: BuildContext,
  backend: BackendContext,
): BuildContext {
  const nodes = context.nodes.flatMap(verify_node_or_table(backend))
  const edges = context.edges.flatMap(verify_edge(backend))
  const tables = context.tables.flatMap(verify_node_or_table(backend))
  const foreign_keys = context.foreign_keys.flat().flatMap(verify_foreign_key(backend))

  return { ...context, nodes, edges, tables, foreign_keys }
}

// eslint-disable-next-line @typescript-eslint/require-await
export const render_typedb = async (prev_context: BuildContext) => {
  const backend: BackendContext = {
    backend: 'typedb',
    comment: TYPEDB_COMMENT,
    indent: TYPEDB_INDENT,
    character_line_limit: 80,
    coreferences: build_type_qualified_coreferences(prev_context, 'typedb'),
  }

  const context = postprocess_context(prev_context, backend)
  const { nodes, edges, tables, foreign_keys } = context

  const node_content = flatMap(nodes, cast_node_or_entity(context, backend))
  const edge_content = flatMap(edges, cast_edge(context, backend))
  const entity_content = flatMap(tables, cast_node_or_entity(context, backend))
  const relation_content = flatMap(foreign_keys, cast_relation(context, backend))

  const section = code_section(backend)

  return lines([
    header(context, backend),
    pragma(context),
    coreference_banner(context, backend),
    coreference_banner(prev_context, backend),
    ...section('Nodes', size(nodes), node_content),
    ...section('Edges', size(edges), edge_content),
    ...section('Entities', size(tables), entity_content),
    ...section('Relations', size(foreign_keys), relation_content),
  ])
}
