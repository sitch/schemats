// export interface Typedef<T> {
// default_value?: T | undefined;

export interface Typedef {
  name: string
  has_default: boolean
  is_array: boolean
  is_nullable: boolean
  type: string
}

// const POSTGRES = {
//   smallint: 'Int', // int2`
//   integer: 'Int', // int": "Int", // int4`
//   bigint: 'Int', // int8`
//   'numeric(p, s)': 'Int', // decimal(p, s)`
//   real: 'Int', // float4`
//   'double precision': 'Int', // float8`
//   smallserial: 'Int', // serial2`
//   serial: 'Int', // serial4`
//   bigserial: 'Int', // serial8`

//   money: 'Money',

//   'character varying(n)': 'String', // varchar(n)`
//   'character(n)': 'String', // char(n)`
//   text: 'String',
//   bytea: 'String',
//   timestamp: 'String', // timestamp(p) without time zone`
//   timestamptz: 'String', // timestamp(p) with time zone`

//   date: 'Datetime',
//   time: 'Datetime', // time(p) without time zone`
//   timetz: 'Datetime', // time(p) with time zone`
//   // interval(fields)(p)`

//   boolean: 'Datetime', // bool`

//   // point` `(x,y)`
//   // line` `{A,B,C}`
//   // lseg` `((x1,y1),(x2,y2))`
//   // box` `((x1,y1),(x2,y2))`
//   // path` `((x1,y1),...)`
//   // path` `[(x1,y1),...]`
//   // polygon` `((x1,y1),...)`
//   // circle` `<(x,y),r\>`
//   // cidr`
//   // inet`
//   // macaddr`
//   // [`[`u8`](https://doc.rust-lang.org/std/primitive.u8.htm
//   // macaddr8`
//   // enum`
//   // bit(n)`
//   'bit varying(n)': 'Int', // varbit`
//   // tsvector`
//   // TsVector`
//   // tsquery`
//   // TsQuery`
//   // uuid`
//   // xml`
//   // json`
//   // jsonb`
//   // t[]`
//   // int4range`
//   // (`[`Bound`](https://doc.rust-lang.org/std/collections/e
//   // int8range`
//   // (`[`Bound`](https://doc.rust-lang.org/std/collections/e
//   // numrange`
//   // (`[`Bound`](https://doc.rust-lang.org/std/collections/e
//   // tsrange`
//   // (`[`Bound`](https://doc.rust-lang.org/std/collections/e
//   // tstzrange`
//   // (`[`Bound`](https://doc.rust-lang.org/std/collections/e
//   // daterange`
//   // (`[`Bound`](https://doc.rust-lang.org/std/collections/e
// }
