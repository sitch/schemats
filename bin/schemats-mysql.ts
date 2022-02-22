import * as commander from 'commander'
import { Config, CommandOptions, generate } from '../src/generator'
import { MysqlDatabase } from '../src/schema-mysql'
import { promises } from 'fs'
import { relative } from 'path'

// work-around for:
// TS4023: Exported variable 'command' has or is using name 'local.Command'
// from external module "node_modules/commander/typings/index" but cannot be named.
export type Command = commander.Command

export const mysql = async (program: Command): Promise<void> => {
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
        .option('--no-header', 'don\'t generate a header')
        .option('--no-throw-on-missing-type', 'don\'t throw an error when pg type cannot be mapped to ts type')
        .action(async (connection: string, options: CommandOptions) => {
            const config = new Config(connection, options)
            const db = new MysqlDatabase(config, connection)
            await db.isReady()
            const schema = await generate(config, db)

            if (options?.output) {
                const outputPath = relative(process.cwd(), options.output)
                await promises.writeFile(outputPath, schema, 'utf8')
                console.log(`Written ${options.backend} schema to ${outputPath}`)
            } else {
                console.log(schema)
            }
            await db.close()
        })

    program.action(program.help)
}
