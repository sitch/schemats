# Schemats

Before anything, I would like to give a massive thank you to [sweetiq](https://www.npmjs.com/package/schemats) and their contributors for giving me a huge head start.

The reason I have created a new repo instead of a fork is because I don't support mysql and have some breaking changes due to how this library is consumed by vramework libraries (coming soon). I have kept the name and based off their MIT license as means of attribution and thanks.

## Why Schemats

Being able to weave your database structure through backend APIs, automatically generated JSON schemas and all the way to a button in the frontend allows you to ensure that any breaking change can be caught everywhere. This allows us to some pretty amazing things when it comes to refactoring and maintaining codebases, but that is more for a blog post about Vramework than this readme.

## Quickstart

### Installing

```bash
yarn add -d @vramework/schemats || npm install -d @vramework/schemats
```

### Generating the type definition from schema

Assuming you have the following schema (this is a bit of a random one):

```sql
CREATE SCHEMA "pet_store";

CREATE TYPE "pet_store"."animal" AS enum (
  'cat',
  'dog'
);

CREATE TABLE "pet_store"."user" (
  "uuid" uuid PRIMARY KEY default gen_random_uuid(),
  "name" text NOT NULL
);

CREATE TABLE "pet_store"."pet" (
  "uuid" uuid PRIMARY KEY default gen_random_uuid(),
  "owner" uuid REFERENCES "pet_store"."user",
  "type" pet_store.animal NOT NULL,
  "name" text NOT NULL,
  "birthdate" date,
  "last_seen_location" point
);
```

You can now generate a bunch of different schema definitions.

My personal favourite is the following:


```bash
schemats postgres postgres://postgres@localhost/database -s pet_store -c -e -o db-types.ts
```

While will result in the following typescript file: 

```typescript
/**
 * AUTO-GENERATED FILE @ Sun, 20 Jun 2021 13:21:23 GMT - DO NOT EDIT!
 *
 * This file was automatically generated by schemats v.0.0.0
 * $ schemats generate -C -s pet_store
 *
 */

export enum Animal {
        Cat = 'cat',
        Dog = 'dog' 
}

export interface User { 
        uuid: string
        name: string 
}

export interface Pet { 
        uuid: string
        owner: string | null
        type: Animal
        name: string
        birthdate: Date | null
        lastSeenAt: { x: number, y: number } | null 
}
```

But you have quite a bit of flexbility:

```bash
Usage: schemats postgres [options] [connection]

Generate a typescript schema from postgres

Arguments:
  connection               The connection string to use, if left empty will use env variables

Options:
  -s, --schema <schema>    the schema to use (default: "public")
  -t, --table <tables...>  the tables within the schema (default: "all")
  -c, --camelCase          use camel case for enums and table names
  -e, --enums              use enums instead of types
  -o, --output <output>    where to save the generated file
  --no-header              dont save a header
  -h, --help               display help for command
```

## Using in typescript

You can import all your interfaces / enums from the file:

```typescript
import * as DB from './db-types'

// And then you can start picking how you want your APIs to be used:
type updatePetLocation = Pick<DB.Pet, 'lastSeenAt'>
```

## Tests

So where are the tests? The original schemats library has an amazing 100% coverage and this one has 0.

To be honest, I'm using this library in a few of my current projects and any error in it throws dozens 
in the entire codebase, so it sort of tests itself. That being said I will be looking to add some in again,
but in terms of priorties not my highest.

Thanks!

