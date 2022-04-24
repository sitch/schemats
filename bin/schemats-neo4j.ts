/* eslint-disable @typescript-eslint/no-non-null-assertion */

import chalk from 'chalk'
import type { Command } from 'commander'
import fs from 'fs-extra'

import { build_context } from '../src/adapters/neo4j-json'
import { render_julia_octo_from_neo4j_json as render_julia_octo_neo4j_json } from '../src/backends/impl/julia-octo-neo4j-json'
import { render } from '../src/compiler'
import { CommandOptions, Config } from '../src/config'
import type {
  Neo4jNodeLabel,
  Neo4jReflection,
  Neo4jSpecification,
} from '../src/lang/neo4j'
import { read_json } from '../src/utils'

export const neo4j = (program: Command, argv: string[]) => {
  program
    .command('neo4j')
    .description('Generate from neo4j json')
    .argument('<neo4j_config_json>', 'Neo4j json file')
    .argument('<neo4j_node_labels_json>', 'Neo4j json file')
    .argument('<neo4j_reflect_json>', 'Neo4j json file')
    .option('-d, --database <database>', 'the database to use')
    .option('-I, --ignore-attribute-collisions <attribute...>')
    .option('-s, --schema <schema>', 'the schema to use', 'public')
    .option('-o, --output <path>', 'generated file relative to the cwd')
    .option('-F, --backend <backend>', 'the output format', 'typescript')
    .option('-e, --enums', 'use enums instead of types')
    .option('-t, --tables <table...>', 'the tables within the schema')
    .option('-f, --typesFile <path>', 'the file where jsonb types can be imported from')
    .option('-E, --enum-formatter <format>', 'Formatter for enum names')
    .option('-T, --table-formatter <format>', 'Formatter for table names')
    .option('-C, --column-formatter <format>', 'Formatter for column names')
    .option('--typedb-entity-template <template>', '{{entity}}')
    .option('--typedb-relation-template <template>', '{{relation}}')
    .option('--typedb-attribute-template <template>', '{{attribute}}')
    .option('--no-header', "don't generate a header")
    .option('--no-throw-on-missing-type', 'suppress type mapping errors')

    .action(
      async (
        neo4j_config_json: string,
        neo4j_node_labels_json: string,
        neo4j_reflect_json: string,
        options: CommandOptions,
      ) => {
        const config = new Config(argv, '', options)

        const [spec1] = read_json<Neo4jSpecification[]>(neo4j_config_json)
        const spec2 = read_json<Neo4jNodeLabel[]>(neo4j_node_labels_json)
        const spec3 = read_json<Neo4jReflection>(neo4j_reflect_json)

        const backend = config.backend
        const output = config.output!
        const context = build_context(config, spec3)

        if (backend === 'julia-octo') {
          const binary = render_julia_octo_neo4j_json(config, spec1, spec2, spec3)
          fs.writeFileSync(output, binary)
        }

        if (backend === 'typedb') {
          const binary = await render(context, backend)
          fs.writeFileSync(output, binary)
        }

        if (backend === 'typedb-loader-config') {
          const binary = await render(context, backend)
          fs.writeFileSync(output, binary)
        }
      },
    )

  program.action(() => console.error(chalk.red(program.helpInformation())))
}
