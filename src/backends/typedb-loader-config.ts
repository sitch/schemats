import sortJson from 'sort-json'

import type { ColumnDefinition, ForeignKey, TableDefinition } from '../adapters/types'
import type { BuildContext } from '../compiler'
import { cast_typedb_coreferences } from '../coreference'
import { inflect, pretty } from '../formatters'
import type {
  Configuration,
  DefinitionAttribute,
  DefinitionPlayer,
  GeneratorEntity,
  GeneratorRelation,
} from '../lang/typedb-loader-config'
import type { RelationshipEdge, RelationshipNode } from '../relationships'
import type { BackendContext } from './base'
import { normalize_name, Relation } from './typedb'

type AbstractTypedbDataType =
  | TableDefinition
  | RelationshipEdge
  | RelationshipNode
  | ForeignKey

//-----------------------------------------------------------------------

// TODO: eliminate this
// Filter out error coreference values
function is_valid_attribute(backend: BackendContext) {
  return ({ name }: ColumnDefinition) => !(name in backend.coreferences.error)
}

function is_valid_foreign_key(backend: BackendContext) {
  return ({ primary_column, foreign_column }: ForeignKey) =>
    !(primary_column in backend.coreferences.error) &&
    !(foreign_column in backend.coreferences.error)
}

function is_valid_edge(_backend: BackendContext) {
  return (_edge: RelationshipEdge) => true
}

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

function data_paths(context: BuildContext, record: AbstractTypedbDataType): string[] {
  if (context.config.overrideCsvPath) {
    return [context.config.overrideCsvPath]
  }
  const filename = 'name' in record ? record.name : Relation.name(context, record)
  return [`${context.config.csvDir}/${context.config.database}/${filename}.csv`]
}

function cast_table_entity(context: BuildContext, backend: BackendContext) {
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

function cast_node_entity(context: BuildContext, backend: BackendContext) {
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

function cast_edge_relation(context: BuildContext, backend: BackendContext) {
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

function cast_foreign_key_relation_players({
  primary_table,
  primary_column,
  foreign_table,
  foreign_column,
}: ForeignKey): DefinitionPlayer[] {
  return [
    {
      role: primary_table,
      match: {
        type: primary_column,
        attribute: {
          column: primary_column,
        },
      },
    },
    {
      role: foreign_table,
      match: {
        type: foreign_column,
        attribute: {
          column: foreign_column,
        },
      },
    },
  ]
}

function cast_foreign_key_relation(context: BuildContext, _backend: BackendContext) {
  return (foreign_key: ForeignKey): GeneratorRelation => {
    return {
      data: data_paths(context, foreign_key),
      insert: {
        relation: Relation.name(context, foreign_key),
        ownerships: [],
        players: cast_foreign_key_relation_players(foreign_key),
      },
    }
  }
}

const cast_entities = (context: BuildContext, backend: BackendContext) => {
  const entities: Record<string, GeneratorEntity> = {}

  for (const table of context.tables) {
    entities[table.name] = cast_table_entity(context, backend)(table)
  }
  for (const node of context.nodes) {
    entities[node.name] = cast_node_entity(context, backend)(node)
  }
  return entities
}

const cast_relations = (context: BuildContext, backend: BackendContext) => {
  const entities: Record<string, GeneratorRelation> = {}

  for (const foreign_key of context.foreign_keys.filter(
    is_valid_foreign_key(backend),
  )) {
    const name = Relation.name(context, foreign_key)
    const relation = cast_foreign_key_relation(context, backend)(foreign_key)

    console.info(name, relation)
    // entities[name] = relation
  }

  for (const edge of context.edges.filter(is_valid_edge(backend))) {
    entities[edge.name] = cast_edge_relation(context, backend)(edge)
  }
  return entities
}

const build = (context: BuildContext): Configuration => {
  const backend: BackendContext = {
    backend: 'typedb',
    comment: '#',
    indent: '  ',
    character_line_limit: 80,
    coreferences: cast_typedb_coreferences(context),
  }
  if (!context.config.typedbSchema) {
    throw new Error('Missing TypedbSchema')
  }
  return {
    globalConfig: {
      separator: ',',
      rowsPerCommit: 50,
      parallelisation: 24,
      schema: context.config.typedbSchema,
    },
    // attributes: cast_attributes(context, backend),
    entities: cast_entities(context, backend),
    relations: cast_relations(context, backend),
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
export const render_typedb_loader_config = async (context: BuildContext) => {
  return pretty(sortJson(build(context)))
}
