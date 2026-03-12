# Tasks

- [x] Task 1: Update `elemToString` signature and usage in `wuWxml.js` to accept `filePath`
  - [x] Update `elemToString` function definition to accept `filePath` as a 5th argument.
  - [x] Update recursive calls to `elemToString` inside `elemRecursion` and `elemToString` itself to pass `filePath`.
  - [x] Update `doWxml` function to pass `path.resolve(dir, name)` (or just `name` if relative is preferred, but user said "specific file path", likely absolute) to `elemToString`. I will use `path.resolve(dir, name)` to be precise.

- [x] Task 2: Update `wxmlify` signature and usage in `wuWxml.js` to accept and log `filePath`
  - [x] Update `wxmlify` function definition to destructure `filePath` from the options object (3rd argument).
  - [x] Update the error logging logic inside `wxmlify` to include `filePath` in the log message.
  - [x] Update calls to `wxmlify` inside `elemToString` to pass `filePath` in the options object.
