

# light-starter

CLI to create a Node.js boilerplate with Express or Fastify.

## Installation

```bash
npm install -g light-starter
```

## Usage

```bash
light-starter
```

Follow the prompts to create your Node.js project boilerplate.

## Features

- Choose between Express or Fastify as the server framework.
- Automatically installs the latest versions of dependencies.
- Integrates with Husky and lint-staged for pre-commit linting.

## Dependencies

- [commander](https://www.npmjs.com/package/commander) - For CLI command line options.
- [inquirer](https://www.npmjs.com/package/inquirer) - For interactive prompts.
- [fs-extra](https://www.npmjs.com/package/fs-extra) - For file system operations.
- [execa](https://www.npmjs.com/package/execa) - For executing npm commands programmatically.

## Scripts

- `start`: Starts the server using `tsx src/server.ts`.
- `build`: Builds the TypeScript files using `tsup`.
- `start:dev`: Starts the server in watch mode using `tsx watch src/server.ts`.
- `husky:prepare`: Prepares Husky for linting.
- `test`: Runs tests using `vitest`.
- `test:lint`: Runs linting tests.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

ISC
