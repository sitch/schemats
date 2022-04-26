/* eslint-disable @typescript-eslint/naming-convention */
import PgManyToManyPlugin from '@graphile-contrib/pg-many-to-many'
import simplifyInflectorPlugin from '@graphile-contrib/pg-simplify-inflector'
import { mkdirpSync } from 'fs-extra'
import path from 'path'
import { Pool } from 'pg'
import { createPostGraphileSchema } from 'postgraphile'
import exportPostGraphileSchema from 'postgraphile/build-turbo/postgraphile/schema/exportPostGraphileSchema'
import { addFakeUniqueConstraintFromIndex } from 'postgraphile-index-to-unique-constraint-plugin'
import { postgraphilePolyRelationCorePlugin } from 'postgraphile-polymorphic-relation-plugin'
import { RemoveForeignKeyFieldsPlugin } from 'postgraphile-remove-foreign-key-fields-plugin'

import { logger } from '../src/logger'
import type { Credentials } from './typing'

//-----------------------------------------------------------------------------
// Based on: https://5k-team.trilogy.com/hc/en-us/articles/360016598900-Generate-GraphQL-CRUD-APIs-for-AppSync-from-existing-Aurora-Postgresql-DB
//-----------------------------------------------------------------------------

const CREDENTIALS: Credentials = {
  output: process.env['OUTPUT'] || '.',
  dir: process.env['POSTGRES_GRAPHQL_SCHEMA_DIR'] || '.',
  database: process.env['POSTGRES_DATABASE'] || '',
  host: process.env['POSTGRES_HOST'] || 'localhost',
  uri: process.env['POSTGRES_URI'] || 'INVALID_URI',
  user: process.env['POSTGRES_USER'] || '',
  username: process.env['POSTGRES_USERNAME'] || 'postgres',
  password: process.env['POSTGRES_PASSWORD'] || '',
  protocol: process.env['POSTGRES_PROTOCOL'] || 'postgres',
  schema: process.env['POSTGRES_SCHEMA'] || 'public',
  port: process.env['POSTGRES_PORT'] || '5432',
  readonly: true,
}

const config = {
  // uri: `postgresql://${user}@${host}:${port}/${database}?currentSchema=${schema}`,
  // uri: `postgresql://${user}@${host}:${port}/${database}`,
  schema: CREDENTIALS.schema,
  connectionString: CREDENTIALS.uri,

  createPostGraphileSchemaOptions: {
    disableDefaultMutations: true,
    dynamicJson: true,
    ignoreIndexes: true,
    ignoreRBAC: true,

    // graphileBuildOptions: {
    //   pgOmitListSuffix: true,
    //   pgShortPk: true,
    //   pgSimplifyAllRows: true,
    // },
    // ignoreIndexes: false,
    // ignoreRBAC: true,
    // legacyRelations: 'omit',
    // simpleCollections: 'omit',
    // hideIndexWarnings: true,

    appendPlugins: [
      postgraphilePolyRelationCorePlugin,
      simplifyInflectorPlugin,
      addFakeUniqueConstraintFromIndex,
      PgManyToManyPlugin,
      RemoveForeignKeyFieldsPlugin,
    ],
  },
  exportPostGraphileSchemaOptions: {
    exportGqlSchemaPath: `@generated/postgres/graphql/${CREDENTIALS.database}.graphql`,
    exportJsonSchemaPath: `@generated/postgres/graphql-json/${CREDENTIALS.database}.json`,
  },
}

//-----------------------------------------------------------------------------

async function main() {
  const { exportGqlSchemaPath, exportJsonSchemaPath } =
    config.exportPostGraphileSchemaOptions
  const pgPool = new Pool({ connectionString: config.connectionString })

  await createPostGraphileSchema(
    pgPool,
    config.schema,
    config.createPostGraphileSchemaOptions,
  )
    .then(schema => {
      mkdirpSync(path.dirname(exportGqlSchemaPath))
      mkdirpSync(path.dirname(exportJsonSchemaPath))
      return exportPostGraphileSchema(schema, config.exportPostGraphileSchemaOptions)
    })
    .catch((error: unknown) => logger.error(error))
}

void main()

// import yargs from 'yargs';

// yargs.command(
//   'appsync-schema',
//   'Generates GraphQL Schema for AWS AppSync',
//   yargs => {
//     yargs.option('env', { demandOption: true, describe: 'environment prefix' });
//   },
//   args => {
//     void generateGraphqlSchema();
//     // args.env
//   },
// );
