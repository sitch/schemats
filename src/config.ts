import { version } from "../package.json";
import { inflect, pretty } from "./formatters";
import { callerRelPath } from "./utils";
import { TableDefinition } from "./adapters/types";
import chalk from "chalk";

//------------------------------------------------------------------------------

export const ENUM_DELIMITER = "::";

//------------------------------------------------------------------------------

export const BACKENDS = ["typescript", "json", "typedb"] as const;
export type Backends = typeof BACKENDS;
// export type Backend = "typescript" | "json" | "typedb";
export type Backend = string;

//------------------------------------------------------------------------------

export type UserImport = Set<string>;

export const getUserImports = (
  config: Config,
  tables: TableDefinition[] = []
): UserImport[] => {
  return [];
};

//------------------------------------------------------------------------------

export interface ConfigValues {
  logLevel: string;
  output?: string | undefined;
  outputPath: string | undefined;
  typedbEntityTemplate: string;
  typedbRelationTemplate: string;
  typedbAttributeTemplate: string;
  backend: string;
  schema: string;
  database: string;
  connection: string;
  tables: string[];
  enums?: boolean;
  ignoreFieldCollisions: string[];

  writeHeader?: boolean;
  typesFile?: boolean;
  throwOnMissingType?: boolean;

  enumFormatter?: string;
  tableFormatter?: string;
  columnFormatter?: string;
}

export type CommandOptions = Partial<ConfigValues> &
  Pick<
    ConfigValues,
    | "output"
    // | "logLevel"
    | "schema"
    | "tables"
    | "backend"
    | "database"
    | "connection"
    | "ignoreFieldCollisions"
    | "typedbEntityTemplate"
    | "typedbRelationTemplate"
    | "typedbAttributeTemplate"
  >;

export type ConfigOptions = Partial<ConfigValues> &
  Pick<
    ConfigValues,
    | "output"
    | "schema"
    | "logLevel"
    | "tables"
    | "backend"
    | "database"
    | "connection"
    | "ignoreFieldCollisions"
    | "typedbEntityTemplate"
    | "typedbRelationTemplate"
    | "typedbAttributeTemplate"
  >;

// const applyDefaults = (
//   config: CommandOptions,
//   argv: string[]
// ): ConfigOptions => ({
//   // ignoreFieldCollisions: [],
//   writeHeader: true,
//   throwOnMissingType: true,
//   enums: false,
//   ...config,
//   ignoreFieldCollisions: (config.ignoreFieldCollisions || []).filter(
//     (x) => !!x
//   ),
//   outputPath: config.output ? relpath(config.output) : config.output,
// });

//------------------------------------------------------------------------------

export class Config {
  public readonly config: ConfigOptions;
  public readonly timestamp: string;

  constructor(
    private readonly argv: string[],
    public readonly connection: string,
    config: CommandOptions
  ) {
    this.timestamp = this.generateTimestamp();
    this.argv = argv;
    this.config = {
      logLevel: "INFO",
      // ignoreFieldCollisions: [],
      writeHeader: true,
      throwOnMissingType: true,
      enums: false,
      ...config,
      ignoreFieldCollisions: (config.ignoreFieldCollisions || []).filter(
        (x) => !!x
      ),
      outputPath: config.output ? callerRelPath(config.output) : config.output,
      // userImports: getUserImports(config)
    };
  }

  public get commandFromCLI() {
    return ["ts-node", "schemats", ...this.argv.slice(2)].join(" ");
  }

  public get version() {
    return version;
  }

  public get outputPath() {
    return this.config.outputPath;
  }

  public get database() {
    return this.config.database;
  }

  public get backend() {
    return this.config.backend;
  }

  public get enums() {
    return this.config.enums;
  }

  public get tables() {
    return this.config.tables;
  }

  public get schema() {
    return this.config.schema;
  }

  public get writeHeader() {
    return this.config.writeHeader;
  }

  public get typesFile() {
    return this.config.typesFile;
  }

  public get throwOnMissingType() {
    return this.config.throwOnMissingType;
  }

  public get ignoreFieldCollisions(): string[] {
    return this.config.ignoreFieldCollisions;
  }

  public formatEnumName(name: string): string {
    return inflect(
      name.replace(ENUM_DELIMITER, "_"),
      this.config.enumFormatter
    );
  }

  public formatTableName(name: string): string {
    return inflect(name, this.config.tableFormatter);
  }

  public formatColumnName(name: string): string {
    return inflect(name, this.config.columnFormatter);
  }

  public formatEntityName(name: string): string {
    return inflect(name, this.config.tableFormatter);
  }

  public formatAttributeName(name: string): string {
    return inflect(name, this.config.columnFormatter);
  }

  public formatRelationName(name: string): string {
    return inflect(name, this.config.columnFormatter);
  }

  public log(message: string, data?: any): void {
    if (!["DEBUG"].includes(this.config.logLevel)) {
      return;
    }
    if (data) {
      console.info(chalk.cyan(message), pretty(data));
    } else {
      console.info(chalk.cyan(message));
    }
  }

  private generateTimestamp(): string {
    console.warn(chalk.yellow(`⚠️  ${chalk.bold("Bypassing timestamp")}  ⚠️`));
    return "__TIMESTAMP_BYPASS__";

    // TODO: RESTORE
    // return new Date().toUTCString();
  }
}
