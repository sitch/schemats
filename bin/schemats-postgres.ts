import chalk from 'chalk'
import type { Command } from 'commander'

import { PostgresDatabase } from '../src/adapters/postgres-adapter'
import { generate } from '../src/compiler'
import type { CommandOptions } from '../src/config'
import { Config } from '../src/config'
import { write_relative_file_async } from '../src/utils'

export const postgres = (program: Command, argv: string[]) => {
  program
    .command('postgres')
    .description('Generate a typescript schema from postgres')
    .argument('<connection>', 'if left empty will use env variables')
    .option('-d, --database <database>', 'the database to use')
    .option('-I, --ignore-attribute-collisions <attribute...>', 'Ignore collisions')
    .option('-s, --schema <schema>', 'the schema to use', 'public')
    .option('-o, --output <path>', 'generated file relative to the cwd')
    .option('-F, --backend <backend>', 'the output format', 'typescript')
    .option('-e, --enums', 'use enums instead of types')
    .option('-t, --tables <table...>', 'the tables within the schema')
    .option('-f, --typesFile <path>', 'the file where jsonb types can be imported from')
    .option('-E, --enum-formatter <format>', 'Formatter for enum names', 'none')
    .option('-T, --table-formatter <format>', 'Formatter for table names', 'none')
    .option('-C, --column-formatter <format>', 'Formatter for column names', 'none')
    .option('--typedb-entity-template <template>', '{{entity}}')
    .option('--typedb-relation-template <template>', '{{relation}}')
    .option('--typedb-attribute-template <template>', '{{attribute}}')
    .option('--no-header', "don't generate a header")
    .option('--no-throw-on-missing-type', 'suppress type mapping errors')
    .option('--override-csv-path <csv_path>', 'Force override csv path')
    .action(async (connection: string, options: CommandOptions) => {
      const config = new Config(argv, connection, options)
      const database = new PostgresDatabase(config, connection)
      await database.isReady()
      const schema = await generate(config, database, 'postgres')

      if (config.outputPath) {
        await write_relative_file_async(schema, config.outputPath)
        console.info(`Written ${config.backend} schema to ${config.outputPath}`)
      } else {
        console.info(schema)
      }
      await database.close()
    })

  program.action(() => console.error(chalk.red(program.helpInformation())))
}
