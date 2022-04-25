import sortJson from 'sort-json'

import type {
  EdgeDefinition,
  ForeignKeyDefinition,
  NodeDefinition,
  PropertyDefinition,
  TableDefinition,
} from '../adapters/types'
import type { BackendContext } from '../backends'
import type { BuildContext } from '../compiler'
import { build_type_qualified_coreferences } from '../coreference'
import {
  is_valid_attribute,
  is_valid_foreign_key,
  postprocess_context,
} from '../coreference-resolution'
import { inflect, pretty } from '../formatters'
import type {
  Configuration,
  DefinitionAttribute,
  DefinitionPlayer,
  GeneratorEntity,
  GeneratorRelation,
} from '../lang/typedb-loader-config'
import { normalize_name, TypedbRelation } from './typedb'

type AbstractTypedbDataType =
  | TableDefinition
  | EdgeDefinition
  | NodeDefinition
  | ForeignKeyDefinition

//-----------------------------------------------------------------------

function cast_definition_attribute({
  name,
  is_nullable,
}: PropertyDefinition): DefinitionAttribute {
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
  const filename = 'name' in record ? record.name : TypedbRelation.name(context, record)
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
  return (node: NodeDefinition) => {
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
  return (edge: EdgeDefinition) => {
    return {
      data: data_paths(context, edge),
      insert: {
        relation: inflect(edge.name, 'pascal'),
        ownerships: edge.columns
          .filter(is_valid_attribute(backend))
          .map(table => cast_definition_attribute(table)),
        players: [],
      },
    }
  }
}

function cast_foreign_key_relation_players({
  source_table,
  source_column,
  target_table,
  target_column,
}: ForeignKeyDefinition): DefinitionPlayer[] {
  return [
    {
      role: source_table,
      match: {
        type: source_column,
        attribute: {
          column: source_column,
        },
      },
    },
    {
      role: target_table,
      match: {
        type: target_column,
        attribute: {
          column: target_column,
        },
      },
    },
  ]
}

function cast_foreign_key_relation(context: BuildContext, _backend: BackendContext) {
  return (foreign_key: ForeignKeyDefinition): GeneratorRelation => {
    return {
      data: data_paths(context, foreign_key),
      insert: {
        relation: TypedbRelation.name(context, foreign_key),
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
    const name = TypedbRelation.name(context, foreign_key)
    const relation = cast_foreign_key_relation(context, backend)(foreign_key)

    console.info('cast_relations', name, 'players', relation.insert.players)
    // TODO: Fix
    // entities[name] = relation
  }

  // for (const edge of context.edges.filter(is_valid_edge(backend))) {
  for (const edge of context.edges) {
    entities[edge.name] = cast_edge_relation(context, backend)(edge)
  }
  return entities
}

const build = (prev_context: BuildContext): Configuration => {
  const backend: BackendContext = {
    backend: 'typedb',
    comment: '#',
    indent: '  ',
    character_line_limit: 80,
    coreferences: build_type_qualified_coreferences(prev_context, 'typedb'),
  }
  const context = postprocess_context(prev_context, backend)

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
