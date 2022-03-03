# MySQL: Data Types

The following is a list of datatypes available in MySQL, which includes string, numeric, date/time, and large object datatypes.

## String Datatypes

The following are the **String Datatypes** in MySQL:

| Data Type Syntax   | Maximum Size                                     | Explanation                                                                                                                                                          |
| ------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CHAR(size)`       | Maximum size of 255 characters.                  | Where **size** is the number of characters to store. Fixed-length strings. Space padded on right to equal **size** characters.                                       |
| `VARCHAR(size)`    | Maximum size of 255 characters.                  | Where **size** is the number of characters to store. Variable-length string.                                                                                         |
| `TINYTEXT(size)`   | Maximum size of 255 characters.                  | Where **size** is the number of characters to store.                                                                                                                 |
| `TEXT(size)`       | Maximum size of 65,535 characters.               | Where **size** is the number of characters to store.                                                                                                                 |
| `MEDIUMTEXT(size)` | Maximum size of 16,777,215 characters.           | Where **size** is the number of characters to store.                                                                                                                 |
| `LONGTEXT(size)`   | Maximum size of 4GB or 4,294,967,295 characters. | Where **size** is the number of characters to store.                                                                                                                 |
| `BINARY(size)`     | Maximum size of 255 characters.                  | Where **size** is the number of binary characters to store. Fixed-length strings. Space padded on right to equal **size** characters.<br>(Introduced in MySQL 4.1.2) |
| `VARBINARY(size)`  | Maximum size of 255 characters.                  | Where **size** is the number of characters to store. Variable-length string.<br>(Introduced in MySQL 4.1.2)                                                          |

## Numeric Datatypes

The following are the **Numeric Datatypes** in MySQL:

| Data Type Syntax | Maximum Size                                                                                                                            | Explanation                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `BIT`            | Very small integer value that is equivalent to `TINYINT(1)`. Signed values range from -128 to 127. Unsigned values range from 0 to 255. |
| `TINYINT(m)`     | Very small integer value. Signed values range from -128 to 127. Unsigned values range from 0 to 255.                                    |
| `SMALLINT(m)`    | Small integer value. Signed values range from -32768 to 32767. Unsigned values range from 0 to 65535.                                   |
| `MEDIUMINT(m)`   | Medium integer value. Signed values range from -8388608 to 8388607. Unsigned values range from 0 to 16777215.                           |
| `INT(m)`         | Standard integer value. Signed values range from -2147483648 to 2147483647. Unsigned values range from 0 to 4294967295.                 |
| `BIGINT(m)`      | Big integer value. Signed values range from -9223372036854775808 to 1. Unsigned values range from 0 to 18446744073709551615.            |
| `DECIMAL(m,d)`   | Unpacked fixed point number. `m` defaults to 10, if not specified. `d` defaults to 0, if not specified.                                 | Where `m` is the total digits and `d` is the number ofdigits after the decimal.                                              |
| `FLOAT(m,d)`     | Single precision floating point number.                                                                                                 | Where `m` is the total digits and `d` is the number ofdigits after the decimal.                                              |
| `DOUBLE(m,d)`    | Double precision floating point number.                                                                                                 | Where `m` is the total digits and `d` is the number ofdigits after the decimal.                                              |
| `BOOLEAN`        | Synonym for `TINYINT(1)`                                                                                                                | Treated as a boolean data type where a value of 0 is considered to be `FALSE` and any other value isconsidered to be `TRUE`. |

## Date/Time Datatypes

The following are the **Date/Time Datatypes** in MySQL:

| Data Type Syntax | Maximum Size                                                              | Explanation                         |
| ---------------- | ------------------------------------------------------------------------- | ----------------------------------- |
| `DATE`           | Values range from '1000-01-01' to '9999-12-31'.                           | Displayed as 'YYYY-MM-DD'.          |
| `DATETIME`       | Values range from '1000-01-01 00:00:00' to '9999-12-31 23:59:59'.         | Displayed as 'YYYY-MM-DD HH:MM:SS'. |
| `TIMESTAMP(m)`   | Values range from '1970-01-01 00:00:01' UTC to '2038-01-19 03:14:07' UTC. | Displayed as 'YYYY-MM-DD HH:MM:SS'. |
| `TIME`           | Values range from '-838:59:59' to '838:59:59'.                            | Displayed as 'HH:MM:SS'.            |
| `YEAR[(2\|4)]`   | Year value as 2 digits or 4 digits.                                       | Default is 4 digits.                |

## Large Object (LOB) Datatypes

The following are the **LOB Datatypes** in MySQL:

| Data Type Syntax | Maximum Size                                     | Explanation                                                                                              |
| ---------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `TINYBLOB`       | Maximum size of 255 bytes.                       |
| `BLOB(size)`     | Maximum size of 65,535 bytes.                    | Where size is the number of characters to store.<br>_(size is optional and was introduced in MySQL 4.1)_ |
| `MEDIUMBLOB`     | Maximum size of 16,777,215 bytes.                |
| `LONGTEXT`       | Maximum size of 4GB or 4,294,967,295 characters. |

_Taken from https://www.techonthenet.com/mysql/datatypes.php_

Source: https://gist.github.com/nmsmith22389/69271303e107f1a4a0d5bcaaacafadf3#file-mysql-data-types-cheat-sheet-md
