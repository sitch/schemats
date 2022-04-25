/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { groupBy, trimEnd, trimStart } from 'lodash'

import type { PropertyDefinition, TableDefinition } from '../adapters/types'
import type { BuildContext } from '../compiler'
import type { Config } from '../config'
import type {
  Neo4jReflection,
  Neo4jReflectionEdge,
  Neo4jReflectionNameSymbol,
  Neo4jReflectionNode,
  Neo4jReflectionProperty,
} from '../lang/neo4j'
import type { EdgeDefinition, EdgeName } from './types'

const cast_node_name = (typeId: Neo4jReflectionNameSymbol): string =>
  trimEnd(trimStart(typeId, ':`'), '`')

const cast_edge_name = (type: string): EdgeName => type

function cast_udt_name([type, ...types]: string[]) {
  if (types.length > 0) {
    console.error([type, ...types])
  }
  return type
}

function is_array(types: string[]) {
  return types.map(type => type.toLowerCase()).some(type => type.includes('array'))
}

function cast_property({
  name,
  types,
  mandatory,
}: Neo4jReflectionProperty): PropertyDefinition {
  return {
    name,
    udt_name: cast_udt_name(types),
    is_nullable: !mandatory,
    has_default: false,
    default_value: undefined,
    is_array: is_array(types),
  }
}

function cast_node({
  // relationships,
  // labels,
  typeId,
  properties,
}: Neo4jReflectionNode) {
  return {
    name: cast_node_name(typeId),
    columns: properties.map(property => cast_property(property)),
  }
}

function cast_edge_list(table_map: Record<string, TableDefinition[]>) {
  return ({ type, paths, properties }: Neo4jReflectionEdge) => {
    return paths.map(
      ({ fromTypeId, toTypeId }): EdgeDefinition => ({
        name: cast_edge_name(type),
        source: table_map[cast_node_name(fromTypeId)]![0]!,
        target: table_map[cast_node_name(toTypeId)]![0]!,
        columns: properties.map(property => cast_property(property)),
      }),
    )
  }
}
//##############################################################################

export function build_context(config: Config, spec: Neo4jReflection): BuildContext {
  const nodes = Object.values(spec.nodes).map(node => cast_node(node))
  const node_map = groupBy(nodes, 'name')
  const edges = Object.values(spec.relationships).flatMap(cast_edge_list(node_map))

  return {
    data_source: 'neo4j',
    schema: config.schema,
    config,
    user_imports: [],
    primary_keys: [],
    foreign_keys: [],
    table_comments: [],
    column_comments: [],
    enums: [],
    tables: [],
    edges,
    nodes,
  }
}

//##############################################################################
