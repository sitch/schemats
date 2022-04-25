/* eslint-disable @typescript-eslint/naming-convention */
import chalk from 'chalk'

import { version } from '../package.json'
import type { TableDefinition } from './adapters/types'
import type { BackendName } from './backends'
import { inflect, pretty } from './formatters'
import { caller_relative_path } from './utils'

//------------------------------------------------------------------------------

const ENUM_DELIMITER = '::'

//------------------------------------------------------------------------------

//------------------------------------------------------------------------------

export type UserImport = Set<string>

export const get_user_imports = (
  _config: Config,
  _tables: TableDefinition[] = [],
): UserImport[] => {
  return []
}

//------------------------------------------------------------------------------

export interface ConfigValues {
  logLevel: string
  output?: string | undefined
  outputPath: string | undefined

  schema: string
  typedbSchema?: string
  backend: BackendName
  database: string
  connection: string
  enums?: boolean
  ignoreAttributeCollisions?: string[]
  enumFormatter?: string
  tableFormatter?: string
  columnFormatter?: string

  csvDir: string
  overrideCsvPath?: string

  // NOT USED
  tables: string[]
  writeHeader?: boolean
  typesFile?: string
  throwOnMissingType?: boolean

  typedbEntityTemplate?: string
  typedbRelationTemplate?: string
  typedbAttributeTemplate?: string
}

export type CommandOptions = Partial<ConfigValues> &
  Pick<
    ConfigValues,
    | 'output'
    // | "logLevel"
    | 'schema'
    | 'tables'
    | 'backend'
    | 'database'
    | 'connection'
    | 'csvDir'
    | 'overrideCsvPath'
    | 'typedbSchema'
    | 'ignoreAttributeCollisions'
    | 'typedbEntityTemplate'
    | 'typedbRelationTemplate'
    | 'typedbAttributeTemplate'
  >

export type ConfigOptions = Partial<ConfigValues> &
  Pick<
    ConfigValues,
    | 'output'
    | 'schema'
    | 'logLevel'
    | 'tables'
    | 'backend'
    | 'database'
    | 'connection'
    | 'csvDir'
    | 'overrideCsvPath'
    | 'typedbSchema'
    | 'ignoreAttributeCollisions'
    | 'typedbEntityTemplate'
    | 'typedbRelationTemplate'
    | 'typedbAttributeTemplate'
  >

// const applyDefaults = (
//   config: CommandOptions,
//   argv: string[]
// ): ConfigOptions => ({
//   // ignoreAttributeCollisions: [],
//   writeHeader: true,
//   throwOnMissingType: true,
//   enums: false,
//   ...config,
//   ignoreAttributeCollisions: (config.ignoreAttributeCollisions || []).filter(
//     (x) => !!x
//   ),
//   outputPath: config.output ? relpath(config.output) : config.output,
// });

//------------------------------------------------------------------------------

export class Config {
  public readonly config: ConfigOptions
  public readonly timestamp: string

  constructor(
    private readonly argv: string[],
    public readonly connection: string,
    config: CommandOptions,
  ) {
    this.timestamp = this.generateTimestamp()
    this.argv = argv
    this.config = {
      logLevel: 'INFO',
      // ignoreAttributeCollisions: [],
      writeHeader: true,
      throwOnMissingType: true,
      enums: false,
      ...config,
      ignoreAttributeCollisions: (config.ignoreAttributeCollisions || []).filter(
        value => !!value,
      ),
      outputPath: config.output ? caller_relative_path(config.output) : config.output,
      // user_imports: get_user_imports(config)
    }
  }

  public get command_from_cli() {
    return ['ts-node', 'schemats', ...this.argv.slice(2)].join(' ')
  }

  public get version() {
    return version
  }

  public get outputPath() {
    return this.config.outputPath
  }

  public get database() {
    return this.config.database
  }

  public get backend() {
    return this.config.backend
  }

  public get output() {
    return this.config.output
  }

  public get typedbSchema() {
    return this.config.typedbSchema
  }

  public get enums() {
    return this.config.enums
  }

  public get tables() {
    return this.config.tables
  }

  public get schema() {
    return this.config.schema
  }

  public get writeHeader() {
    return this.config.writeHeader
  }

  public get typesFile() {
    return this.config.typesFile
  }

  public get overrideCsvPath() {
    return this.config.overrideCsvPath
  }

  public get csvDir() {
    return this.config.csvDir
  }

  public get throwOnMissingType() {
    return this.config.throwOnMissingType
  }

  public get ignoreAttributeCollisions(): string[] {
    return this.config.ignoreAttributeCollisions || []
  }

  public formatEnumName(name: string): string {
    return inflect(name.replace(ENUM_DELIMITER, '_'), this.config.enumFormatter)
  }

  public formatTableName(name: string): string {
    return inflect(name, this.config.tableFormatter)
  }

  public formatColumnName(name: string): string {
    return inflect(name, this.config.columnFormatter)
  }

  public formatEntityName(name: string): string {
    return inflect(name, this.config.tableFormatter)
  }

  public formatAttributeName(name: string): string {
    return inflect(name, this.config.columnFormatter)
  }

  public formatRelationName(name: string): string {
    return inflect(name, this.config.columnFormatter)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public log(message: string, data?: any): void {
    if (!['DEBUG'].includes(this.config.logLevel)) {
      return
    }
    if (data) {
      console.info(chalk.cyan(message), pretty(data))
    } else {
      console.info(chalk.cyan(message))
    }
  }

  private generateTimestamp(): string {
    console.warn(chalk.yellow(`⚠️  ${chalk.bold('Bypassing timestamp')}  ⚠️`))
    return '__TIMESTAMP_BYPASS__'

    // TODO: RESTORE
    // return new Date().toUTCString();
  }
}
