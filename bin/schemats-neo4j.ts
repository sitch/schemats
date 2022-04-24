import chalk from 'chalk'
import type { Command } from 'commander'
import fs from 'fs-extra'

import { render_julia_octo_from_neo4j_json as render_julia_octo_from_neo4index_json } from '../src/backends/impl/julia-octo-neo4j-json'
import type { CommandOptions } from '../src/config'
import type {
  Neo4jNodeLabel,
  Neo4jReflection,
  Neo4jSpecification,
} from '../src/lang/neo4j'
import { read_json } from '../src/utils'

export const neo4j = (program: Command, _argv: string[]) => {
  program
    .command('neo4j')
    .description('Generate from neo4j json')
    .argument('<neo4j_config_json>', 'Neo4j json file')
    .argument('<neo4j_node_labels_json>', 'Neo4j json file')
    .argument('<neo4j_reflect_json>', 'Neo4j json file')
    .argument('<output>', 'Destination file')
    .option('--json', 'Backend to use')
    .action(
      (
        neo4j_config_json: string,
        neo4j_node_labels_json: string,
        neo4j_reflect_json: string,
        output: string,
        _options: CommandOptions,
      ) => {
        const [specification] = read_json<Neo4jSpecification[]>(neo4j_config_json)
        const node_specifications = read_json<Neo4jNodeLabel[]>(neo4j_node_labels_json)
        const node_reflect = read_json<Neo4jReflection>(neo4j_reflect_json)

        const julia_octo_content = render_julia_octo_from_neo4index_json(
          specification,
          node_specifications,
          node_reflect,
        )
        fs.writeFileSync(output, julia_octo_content)
      },
    )

  program.action(() => console.error(chalk.red(program.helpInformation())))
}
