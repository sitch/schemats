import chalk from 'chalk'
import type { Command } from 'commander'
import fs from 'fs-extra'

import { render_julia_octo_from_neo4j_json as render_julia_octo_neo4j_json } from '../src/backends/impl/julia-octo-neo4j-json'
import { render_typedb_loader_config_neo4j_json } from '../src/backends/impl/typedb-loader-config-neo4j-json'
import { render_typedb_neo4j_json } from '../src/backends/impl/typedb-neo4j-json'
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
    .option('--backend <backend>', 'Backend to render')
    .action(
      (
        neo4j_config_json: string,
        neo4j_node_labels_json: string,
        neo4j_reflect_json: string,
        output: string,
        { backend }: { backend: string },
      ) => {
        const [spec1] = read_json<Neo4jSpecification[]>(neo4j_config_json)
        const spec2 = read_json<Neo4jNodeLabel[]>(neo4j_node_labels_json)
        const spec3 = read_json<Neo4jReflection>(neo4j_reflect_json)

        if (backend === 'julia-octo') {
          const binary = render_julia_octo_neo4j_json(spec1, spec2, spec3)
          fs.writeFileSync(output, binary)
        }

        if (backend === 'typedb') {
          const binary = render_typedb_neo4j_json(spec1, spec2, spec3)
          fs.writeFileSync(output, binary)
        }

        if (backend === 'typedb-loader-config') {
          const binary = render_typedb_loader_config_neo4j_json(spec1, spec2, spec3)
          fs.writeFileSync(output, binary)
        }
      },
    )

  program.action(() => console.error(chalk.red(program.helpInformation())))
}
