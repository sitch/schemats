import chalk from 'chalk'
import { Command } from 'commander'

import { MySQLDatabase } from '../src/adapters/mysql-adapter'
import { generate } from '../src/compiler'
import { CommandOptions, Config } from '../src/config'
import { write_relative_file_async } from '../src/utils'

export const mysql = (program: Command, argv: string[]) => {
  program
    .command('mysql')
    .description('Generate a typescript schema from mysql')
    .argument('<connection>', 'if left empty will use env variables')
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
    .option('--no-throw-on-missing-type', 'suppress type mapping erros')
    .action(async (connection: string, options: CommandOptions) => {
      const config = new Config(argv, connection, options)
      const database = new MySQLDatabase(config, connection)
      await database.isReady()
      const schema = await generate(config, database)

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
