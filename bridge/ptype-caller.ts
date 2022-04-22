/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable unicorn/no-abusive-eslint-disable */
/* eslint-disable */

// import { PyClass, python } from 'pythonia'

// const ptype_runner = await python('./ptype_runner.py')

// // See: https://github.com/extremeheat/JSPyBridge/blob/master/docs/javascript.md
// class PTypeCaller extends PyClass {
//   parent: any
//   add: any
//   static init: any

//   constructor() {
//     // The second is an array of positional ... `true` maps to degrees. A third arg allows us to specify named arguments.
//     // we could also do `super(ptype_runner.PTypeRunner, null, { degrees: true, integers: false })`
//     // super(ptype_runner.PTypeRunner, [true], { integers: false })
//     super(ptype_runner.PTypeRunner, [], { integers: false })
//   }

//   async mul(a: number, b: number) {
//     // Multiply the cool way
//     let result = a
//     for (let index = 1; index < b; index++) {
//       result = await this.add(result, b)
//     }
//     return result
//   }

//   async div(a: number, b: number): Promise<number> {
//     // Call the superclass's div()
//     return this.parent.div(a, b) as number
//   }
// }

// const runner = await PTypeCaller.init()

// console.log('3 * 3 =', await runner.mul(3, 3)) // 9 !
// console.log('tan(360deg) =', await runner.tan(360)) // 0 !
// console.log('6 / 3 =', await runner.div(6, 3)) // 2 !

// // python.exit()

export {}
