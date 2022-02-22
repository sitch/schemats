import {Command} from 'commander'
import {  generate } from '../src/generator'
import { MysqlDatabase } from '../src/adapters/mysql-database'
import { Config, CommandOptions } from '../src/config'
import { writeRelFileAsync } from '../src/utils'

export const mysql = async (program: Command, argv: string[]): Promise<void> => {
    program
        .command('mysql')
        .description('Generate a typescript schema from mysql')
        .argument('<connection>', 'The connection string to use, if left empty will use env variables')
        .option('-d, --database <database>', 'the database to use')
        .option('-I, --ignore-field-collisions <field...>', 'fields to ignore when generating tql')
        .option('-s, --schema <schema>', 'the schema to use', 'public')
        .option('-o, --output <filePath>', 'where to save the generated file relative to the current working directory')
        .option('-F, --backend <backend>', 'the output format', 'typescript')
        .option('-e, --enums', 'use enums instead of types')
        .option('-t, --tables <tables...>', 'the tables within the schema')
        .option('-f, --typesFile <typesFile>', 'the file where jsonb types can be imported from')
        .option('-E, --enum-formatter <enumFormatterter>', 'Formatter for enum names')
        .option('-T, --table-formatter <tableFormatterter>', 'Formatter for table names')
        .option('-C, --column-formatter <columnFormatterter>', 'Formatter for column names')
        .option('--typedb-entity-template <typedbEntityTemplate>', 'Formatter for typedb entity names', '{{entity}}')
        .option('--typedb-relation-template <typedbRelationTemplate>', 'Formatter for typedb relation names', '{{relation}}')
        .option('--typedb-attribute-template <typedbAttributeTemplate>', 'Formatter for typedb attribute names', '{{attribute}}')
        .option('--no-header', 'don\'t generate a header')
        .option('--no-throw-on-missing-type', 'don\'t throw an error when pg type cannot be mapped to ts type')
        .action(async (connection: string, options: CommandOptions) => {
            const config = new Config(argv, connection, options)
            const db = new MysqlDatabase(config, connection)
            await db.isReady()
            const schema = await generate(config, db)

            if (config.outputPath) {
              await writeRelFileAsync(schema, config.outputPath);
              console.log(`Written ${config.backend} schema to ${config.outputPath}`);
            } else {
              console.log(schema);
            }
            await db.close();
      })

    program.action(program.help)
}

