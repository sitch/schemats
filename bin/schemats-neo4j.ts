import chalk from 'chalk'
import type { Command } from 'commander'
import fs from 'fs-extra'

import type { CommandOptions } from '../src/config'
import { read_json } from '../src/utils'

//------------------------------------------------------------------------------

type NodeMap = Map<number, string>

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

//------------------------------------------------------------------------------

function cast_node(_node_map: NodeMap) {
  return (node: Neo4jNode) => {
    const { properties } = node
    const { name, indexes, constraints } = properties

    const comments =
      constraints.length > 0 ? `# constraints: ${constraints.join(',')}\n` : ''
    const fields = indexes.map(index => `  ${index}::Union{Missing,Any}`).join('\n')

    return `
${comments}@kwdef mutable struct ${name}
${fields}
end
`
  }
}

function cast_relationship(node_map: NodeMap) {
  return (relationship: Neo4jRelationship) => {
    const { start, end, type } = relationship

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const source = node_map.get(start)!

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const destination = node_map.get(end)!

    return `
@kwdef mutable struct ${source}_${type}_${destination}
  source::${source}
  destination::${destination}
end
`
  }
}

//##############################################################################

const template = ({ nodes, relationships }: Neo4jSpecification) => {
  const node_map = new Map<number, string>()
  for (const node of nodes) node_map.set(node.identity, node.properties.name)

  return [
    `
################################################################################
#
#  AUTO-GENERATED FILE @ __TIMESTAMP_BYPASS__ - DO NOT EDIT!
#
#  This file was automatically generated by schemats v.2.0.0
#
################################################################################
`,
    'module ckg',
    // Exports
    // TODO: implement
    `
#-------------------------------------------------------------------------------
# Nodes (${nodes.length})
#-------------------------------------------------------------------------------
`,
    ...nodes.map(node => cast_node(node_map)(node)),
    `
  #-------------------------------------------------------------------------------
  # Relationships (${relationships.length})
  #-------------------------------------------------------------------------------
  `,
    ...relationships.map(relationship => cast_relationship(node_map)(relationship)),

    // Octo Definitions
    // TODO: implement

    // end module
    'end',
  ].join('')
}

//##############################################################################

export const neo4j = (program: Command, _argv: string[]) => {
  program
    .command('neo4j')
    .description('Generate from neo4j json')
    .argument('<neo4j_config>', 'Neo4j json file')
    .argument('<output>', 'Destination file')
    .option('--json', "don't generate a header")
    .action((neo4j_config: string, output: string, _options: CommandOptions) => {
      const specifications = read_json<Neo4jSpecification[]>(neo4j_config)

      if (specifications.length !== 1) {
        // console.error(specifications)
        throw new Error('Expected neo4j specification file to be an array of 1')
      }
      const content = template(specifications[0])
      fs.writeFileSync(output, content)
    })

  program.action(() => console.error(chalk.red(program.helpInformation())))
}
