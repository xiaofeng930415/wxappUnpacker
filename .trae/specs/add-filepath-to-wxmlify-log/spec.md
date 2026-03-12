# Add File Path to wxmlify Error Logging Spec

## Why
When `wxmlify` encounters an undefined or null string, it logs an error. Currently, this error log lacks the specific file path context, making it difficult to pinpoint the source of the issue in large projects. The user requested to add parameter passing to record the specific file path.

## What Changes
- Modify `wxmlify` function signature in `wuWxml.js` to accept a `filePath` in its options object.
- Update `wxmlify` to include `filePath` in the error log message.
- Modify `elemToString` function signature in `wuWxml.js` to accept `filePath` as an argument.
- Update `elemToString` to pass `filePath` when calling `wxmlify`.
- Update recursive calls within `elemToString` to propagate `filePath`.
- Update `doWxml` function in `wuWxml.js` to pass the resolved file path when calling `elemToString`.

## Impact
- Affected specs: None directly.
- Affected code: `wuWxml.js`.
- Error logs will now contain the file path where the `wxmlify` error occurred.

## ADDED Requirements
### Requirement: Pass File Path to wxmlify
The system SHALL pass the current file path down to `wxmlify` function.

#### Scenario: Error Logging with File Path
- **WHEN** `wxmlify` is called with an undefined or null string
- **THEN** the error log should include the `filePath` passed to it.

## MODIFIED Requirements
### Requirement: wxmlify Function Signature
The `wxmlify` function signature will be updated to destructure `filePath` from the options object.

### Requirement: elemToString Function Signature
The `elemToString` function signature will be updated to accept `filePath` as an argument (likely the 5th argument).
