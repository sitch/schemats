/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import chalk from 'chalk'
import type { Command } from 'commander'
import fs from 'fs-extra'
import { get, groupBy, keys, sortBy, uniq } from 'lodash'

import type { CommandOptions } from '../src/config'
import { read_json } from '../src/utils'

export const neo4j = (program: Command, _argv: string[]) => {
  program
    .command('neo4j')
    .description('Generate from neo4j json')
    .argument('<neo4j_config_json>', 'Neo4j json file')
    .argument('<neo4j_node_labels_json>', 'Neo4j json file')
    .argument('<output>', 'Destination file')
    .option('--json', "don't generate a header")
    .action(
      (
        neo4index_config_json: string,
        neo4index_node_labels_json: string,
        output: string,
        _options: CommandOptions,
      ) => {
        const [specification] = read_json<Neo4jSpecification[]>(neo4index_config_json)

        const node_specifications = read_json<Neo4jNodeLabel[]>(
          neo4index_node_labels_json,
        )

        // if (specifications.length !== 1) {
        //   throw new Error('Expected neo4j specification file to be an array of 1')
        // }
        const content = template(specification, node_specifications)
        fs.writeFileSync(output, content)
      },
    )

  program.action(() => console.error(chalk.red(program.helpInformation())))
}

//------------------------------------------------------------------------------

type NodeIdentityMap = Map<number, string>
type NodeLabelsMap = Record<string, Neo4jNodeLabel[]>

interface Neo4jNodeLabel {
  label: string
  property: string
  type: string
  isIndexed: boolean
  uniqueConstraint: boolean
  existenceConstraint: boolean
}
interface Neo4jSpecification {
  nodes: Neo4jNode[]
  relationships: Neo4jRelationship[]
}

interface Neo4jNode {
  identity: number
  properties: Neo4jNodeProperties

  // Unused
  labels: string[]
}

interface Neo4jNodeProperties {
  name: string
  indexes: string[]
  constraints: string[]
}

interface Neo4jRelationship {
  identity: number
  start: number
  end: number
  type: string
  properties: Neo4jRelationshipProperties
}

type Neo4jRelationshipProperties = Record<string, never>

//##############################################################################

const JULIA_TYPES: Record<string, string> = {
  STRING: 'String',
  LIST: 'Array{String}',
  INTEGER: 'Int64',
  LOCAL_DATE_TIME: 'Dates.Datetime',
}

function cast_node_struct(node_labels_map: NodeLabelsMap) {
  return ({
    properties: {
      name,
      indexes,
      // constraints
    },
  }: Neo4jNode) => {
    const index_fields = indexes.map(index => `    ${index}::Union{Missing,Any}`).sort()

    const label_fields = get(node_labels_map, name, []).map(
      ({
        property,
        type,
        // isIndexed,
        uniqueConstraint,
        existenceConstraint,
      }) => {
        let julia_type = JULIA_TYPES[type]
        if (uniqueConstraint) {
          julia_type = `Unique{${julia_type}}`
        }
        if (!existenceConstraint) {
          julia_type = `Union{Missing,${julia_type}}`
        }

        return `    ${property}::${julia_type}`
      },
    )

    const constraint_fields: string[] = [
      // `    id::Int64`
    ]

    const fields = [...constraint_fields, ...index_fields, ...label_fields]

    return `
@kwdef mutable struct ${name}
${fields.join('\n')}
end
`
  }
}

function cast_relationship_struct(node_identity_map: NodeIdentityMap) {
  return (name: string, relationships: Neo4jRelationship[]) => {
    const edges = relationships
      .map(
        ({ start, end }) =>
          `Tuple{${node_identity_map.get(start)!},${node_identity_map.get(end)!}}`,
      )
      .sort()

    return `
@kwdef mutable struct ${name}
    edge::Union{${uniq(edges).join(',')}}
end
`
  }
}

//------------------------------------------------------------------------------

function cast_node_name({ properties: { name } }: Neo4jNode) {
  return `${name}`
}

function cast_relationship_name({ type }: Neo4jRelationship) {
  return `${type}`
}

//##############################################################################

const template = (
  { nodes, relationships }: Neo4jSpecification,
  node_labels: Neo4jNodeLabel[],
) => {
  nodes = sortBy(nodes, 'properties.name')

  const node_identity_map = new Map<number, string>()
  for (const node of nodes) node_identity_map.set(node.identity, node.properties.name)

  const node_labels_map = groupBy(node_labels, 'label')

  const node_names = nodes.map(node => cast_node_name(node)).sort()
  const node_structs = nodes.map(cast_node_struct(node_labels_map)).sort()

  const relationship_groups = groupBy(relationships, cast_relationship_name)
  const relationship_names = sortBy(keys(relationship_groups), name => name)

  const relationship_structs = relationship_names.map(name =>
    cast_relationship_struct(node_identity_map)(name, relationship_groups[name]),
  )

  const node_octo_definitions = node_names.map(
    name => `    Schema.model(${name}; table_name="${name}")`,
  )
  const relationship_octo_definitions = relationship_names.map(
    name => `    Schema.model(${name}; table_name="${name}")`,
  )

  return `################################################################################
#
#  AUTO-GENERATED FILE @ __TIMESTAMP_BYPASS__ - DO NOT EDIT!
#
#  This file was automatically generated by schemats v.2.0.0
#
################################################################################

module ckg

${node_names.map(name => `export ${name}`).join('\n')}
${relationship_names.map(name => `export ${name}`).join('\n')}

using Dates
import Base: @kwdef

# Distinct
Unique{T} = T

#-------------------------------------------------------------------------------
# Nodes         (${node_structs.length})
#-------------------------------------------------------------------------------
${node_structs.join('')}

#-------------------------------------------------------------------------------
# Relationships (${relationship_structs.length})
#-------------------------------------------------------------------------------
${relationship_structs.join('')}


#-------------------------------------------------------------------------------
# Octo Definitions: (${
    node_octo_definitions.length + relationship_octo_definitions.length
  })
#-------------------------------------------------------------------------------

function octo_definitions()
    import Octo.Schema
${node_octo_definitions.join('\n')}
${relationship_octo_definitions.join('\n')}
end

end
`
}

//##############################################################################
