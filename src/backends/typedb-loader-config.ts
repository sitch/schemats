import sortJson from 'sort-json'

import type { ColumnDefinition, TableDefinition } from '../adapters/types'
import type { BuildContext } from '../compiler'
import { cast_typedb_coreferences } from '../coreference'
import { inflect, pretty } from '../formatters'
import type {
  Configuration,
  DefinitionAttribute,
  GeneratorEntity,
  GeneratorRelation,
} from '../lang/typedb-loader-config'
import type { RelationshipEdge, RelationshipNode } from '../relationships'
import type { BackendContext } from './base'
import { normalize_name } from './typedb'

//-----------------------------------------------------------------------

function cast_definition_attribute({
  name,
  is_nullable,
}: ColumnDefinition): DefinitionAttribute {
  return {
    attribute: normalize_name(name),
    column: name,
    required: !is_nullable,
  }
}

export function data_paths(
  { config: { database, csvDir, overrideCsvPath } }: BuildContext,
  { name }: TableDefinition | RelationshipEdge | RelationshipNode,
): string[] {
  if (overrideCsvPath) {
    return [overrideCsvPath]
  }
  return [`${csvDir}/${database}/${name}.csv`]
}

function is_valid_attribute(backend: BackendContext) {
  return ({ name }: ColumnDefinition) => !(name in backend.coreferences.error)
}

export function cast_table_entity(context: BuildContext, backend: BackendContext) {
  return (table: TableDefinition) => {
    return {
      data: data_paths(context, table),
      insert: {
        entity: inflect(table.name, 'pascal'),
        ownerships: table.columns
          .filter(is_valid_attribute(backend))
          .map(table => cast_definition_attribute(table)),
      },
    }
  }
}

export function cast_node_entity(context: BuildContext, backend: BackendContext) {
  return (node: RelationshipNode) => {
    return {
      data: data_paths(context, node),
      insert: {
        entity: inflect(node.name, 'pascal'),
        ownerships: node.columns
          .filter(is_valid_attribute(backend))
          .map(table => cast_definition_attribute(table)),
      },
    }
  }
}

export function cast_edge_relation(context: BuildContext, backend: BackendContext) {
  return (edge: RelationshipEdge) => {
    return {
      data: data_paths(context, edge),
      insert: {
        relation: inflect(edge.name, 'pascal'),
        ownerships: edge.properties
          .filter(is_valid_attribute(backend))
          .map(table => cast_definition_attribute(table)),
        players: [],
      },
    }
  }
}

export const cast_entities = (context: BuildContext, backend: BackendContext) => {
  const entities: Record<string, GeneratorEntity> = {}
  for (const table of context.tables) {
    entities[table.name] = cast_table_entity(context, backend)(table)
  }
  for (const node of context.nodes) {
    entities[node.name] = cast_node_entity(context, backend)(node)
  }
  return entities
}

export const cast_relations = (context: BuildContext, backend: BackendContext) => {
  const entities: Record<string, GeneratorRelation> = {}
  for (const edge of context.edges) {
    entities[edge.name] = cast_edge_relation(context, backend)(edge)
  }
  return entities
}

export const build = (context: BuildContext): Configuration => {
  const backend: BackendContext = {
    backend: 'typedb',
    comment: '#',
    indent: '  ',
    character_line_limit: 80,
    coreferences: cast_typedb_coreferences(context),
  }

  const entities = cast_entities(context, backend)
  // const attributes =  cast_attributes(context, backend)
  // const relations =  cast_relations(context, backend)

  return {
    globalConfig: {
      separator: ',',
      rowsPerCommit: 50,
      parallelisation: 24,
      schema: context.schema,
    },
    entities,
    // attributes,
    // relations,
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
export const render_typedb_loader_config = async (context: BuildContext) => {
  return pretty(sortJson(build(context)))
}
