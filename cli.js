#!/usr/bin/env node

import { program } from 'commander';
import inquirer from 'inquirer';
import * as execa from 'execa';
import fs from 'fs-extra';
import * as path from 'path';

program
  .version('1.0.0')
  .description('CLI to create a Node.js boilerplate')
  .action(() => {
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'project_name',
          message: 'What is your project name?',
          validate: (input) => {
            if (input.trim() === '') {
              return 'Please enter a project name.';
            }
            return true;
          },
        },
        {
          type: 'list',
          name: 'packageManager',
          message: 'Choose a package manager:',
          choices: ['npm', 'yarn', 'pnpm'],
          default: 'npm',
        },
        {
          type: 'list',
          name: 'framework',
          message: 'Choose a framework to use:',
          choices: ['express', 'fastify'],
          default: 'express',
        },
      ])
      .then((answers) => {
        createProject(answers.project_name, answers.packageManager, answers.framework);
      });
  })
  .parse(process.argv);

async function createProject(project_name, packageManager, framework) {
  const destinationDirectory = path.join(process.cwd(), project_name);

  // Create project directory
  await fs.ensureDir(destinationDirectory);

  // Create src directory and server.ts and test.server.ts files
  const srcDirPath = path.join(destinationDirectory, 'src');
  await fs.ensureDir(srcDirPath);

  const serverFilePath = path.join(srcDirPath, 'server.ts');
  const serverConfig = `import ${framework === 'express' ? 'express' : 'fastify'} from '${framework === 'express' ? 'express' : 'fastify'}';

const app = ${framework === 'express' ? 'express()' : 'fastify' }();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
`;

  await fs.writeFile(serverFilePath, serverConfig);

  const testServerFilePath = path.join(srcDirPath, 'test.server.ts');
  const testServerConfig = `// Test file for the server
// Implement your tests here
`;

  await fs.writeFile(testServerFilePath, testServerConfig);

  // Create .husky directory and pre-commit file
  const huskyDirPath = path.join(destinationDirectory, '.husky');
  await fs.ensureDir(huskyDirPath);

  const huskyHookFilePath = path.join(huskyDirPath, 'pre-commit');
  const huskyHookConfig = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

${packageManager} lint-staged
`;

  await fs.writeFile(huskyHookFilePath, huskyHookConfig);
  await fs.chmod(huskyHookFilePath, '755');

  // Update package.json
  const packageJsonPath = path.join(destinationDirectory, 'package.json');
  const packageJson = {
    "name": project_name,
    "version": "1.0.0",
    "description": "",
    "main": "server.ts",
    "scripts": {
      "start": `tsx src/server.ts`,
      "build": "tsup src",
      "start:dev": "tsx watch src/server.ts",
      "husky:prepare": `${packageManager} install`,
      "test": "vitest",
      "test:lint": "vitest run"
    },
    "husky": {
      "hooks": {
        "pre-commit": "lint-staged"
      }
    },
    "lint-staged": {
      "*.{js,jsx,ts,tsx}": [
        `${packageManager} eslint --fix`,
        `${packageManager} prettier --write \"src/**/*.{ts,tsx}\"`,
        `${packageManager} test:lint --passWithNoTests`
      ]
    },
    "keywords": [],
    "author": "",
    "license": "ISC",
    "devDependencies": {
      "@types/express": "^4.17.21",
      "@types/node": "^20.10.5",
      "@typescript-eslint/eslint-plugin": "^6.15.0",
      "@typescript-eslint/parser": "^6.15.0",
      "eslint": "^8.56.0",
      "eslint-config-prettier": "^9.1.0",
      "express": "^4.18.2",
      "husky": "^8.0.3",
      "lint-staged": "^15.2.0",
      "prettier": "^3.1.1",
      "tsup": "^8.0.1",
      "tsx": "^4.7.0",
      "typescript": "^5.3.3",
      "vitest": "^1.1.0"
    }
  };

  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

  console.log(`Project ${project_name} created successfully!`);
  console.log(`To get started, navigate to the directory: ${destinationDirectory}`);
}
