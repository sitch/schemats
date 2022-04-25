import { flatMap, size } from 'lodash'

import type {
  EdgeDefinition,
  EntityDefinition,
  ForeignKeyDefinition,
  PropertyDefinition,
  TableDefinition,
} from '../adapters/types'
import type { BackendContext } from '../backends'
import type { BuildContext } from '../compiler'
import { build_type_qualified_coreferences } from '../coreference'
import { postprocess_context } from '../coreference-resolution'
import { code_section, lines, pad_lines } from '../formatters'
import { cast_typedb_type, is_reserved_word, pragma } from '../typemaps/typedb-typemap'
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

export const TypedbAttribute = {
  comment: (_context: BuildContext, _column: PropertyDefinition): string => {
    return ``
  },
  name: ({ config }: BuildContext, { name }: PropertyDefinition): string => {
    return normalize_name(config.formatAttributeName(name))
  },
  type: (_context: BuildContext, _record: PropertyDefinition): string => {
    // return `${prefix(context)}attribute`
    return 'attribute'
  },
}

export const TypedbEntity = {
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

export const TypedbRelation = {
  comment: ({ config }: BuildContext, { constraint }: ForeignKeyDefinition): string => {
    return `${TYPEDB_COMMENT} Source: '${config.schema}.${constraint}'`
  },
  name: (
    { config }: BuildContext,
    { source_table, source_column, target_table, target_column }: ForeignKeyDefinition,
  ): string => {
    const table_source = config.formatRelationName(source_table)
    const attribute_source = config.formatRelationName(source_column)
    const table_destination = config.formatRelationName(target_table)
    const attribute_destination = config.formatRelationName(target_column)

    return normalize_name(
      `${table_source}-${attribute_source}-${table_destination}-${attribute_destination}`,
    )
  },
  type: (context: BuildContext, _foreign_key: ForeignKeyDefinition): string => {
    return `${prefix(context)}relation`
  },
}

export const TypedbEdge = {
  comment: (_context: BuildContext, { comment }: EdgeDefinition): string => {
    return comment ? `${TYPEDB_COMMENT} ${comment}` : ''
  },
  name: (
    { config }: BuildContext,
    { name, source, target }: EdgeDefinition,
  ): string => {
    const domain_name = config.formatRelationName(source.name)
    const codomain_name = config.formatRelationName(target.name)

    return normalize_name(`${domain_name}-${name}-${codomain_name}`)
  },
  type: (context: BuildContext, _foreign_key: EdgeDefinition): string => {
    return `${prefix(context)}relation`
  },
}

//------------------------------------------------------------------------------

const cast_attribute = (context: BuildContext) => (column: PropertyDefinition) => {
  const name = TypedbAttribute.name(context, column)
  const type = TypedbAttribute.type(context, column)
  const value = cast_typedb_type(context, column)
  const comment = TypedbAttribute.comment(context, column)

  const line = `${name} sub ${type}, value ${value};`
  return lines([comment, line])
}

//------------------------------------------------------------------------------

const cast_field =
  (context: BuildContext) =>
  (column: PropertyDefinition): string => {
    const name = TypedbAttribute.name(context, column)
    const comment = TypedbAttribute.comment(context, column)

    return lines([comment, `, owns ${name}`])
  }

//------------------------------------------------------------------------------

const cast_entity =
  (context: BuildContext, _backend: BackendContext) => (record: EntityDefinition) => {
    const name = TypedbEntity.name(context, record)
    const type = TypedbEntity.type(context, record)
    const comment = TypedbEntity.comment(context, record)

    const fields = record.columns.map(cast_field(context))
    const attributes = record.columns.map(cast_attribute(context))

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
  (context: BuildContext, _backend: BackendContext) =>
  (record: ForeignKeyDefinition) => {
    const { config } = context
    const { source_table, source_column, target_table, target_column } = record

    const name = TypedbRelation.name(context, record)
    const type = TypedbRelation.type(context, record)
    const comment = TypedbRelation.comment(context, record)

    const relations = [
      `, owns ${config.formatAttributeName(source_column)}`,
      `, owns ${config.formatAttributeName(target_column)}`,
      `, relates ${config.formatEntityName(source_table)}`,
      `, relates ${config.formatEntityName(target_table)}`,
    ]

    return lines([
      comment,
      `${name} sub ${type}`,
      pad_lines(lines(relations), TYPEDB_INDENT),
      ';',
    ])
  }

const cast_edge =
  (context: BuildContext, _backend: BackendContext) => (record: EdgeDefinition) => {
    const { config } = context
    const { source, target, columns } = record

    const name = TypedbEdge.name(context, record)
    const type = TypedbEdge.type(context, record)
    const comment = TypedbEdge.comment(context, record)

    const relations = [
      ...columns.map(({ name }) => `, owns ${config.formatAttributeName(name)}`),
      `, relates ${config.formatEntityName(source.name)}`,
      `, relates ${config.formatEntityName(target.name)}`,
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

  const node_content = flatMap(nodes, cast_entity(context, backend))
  const edge_content = flatMap(edges, cast_edge(context, backend))
  const entity_content = flatMap(tables, cast_entity(context, backend))
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
