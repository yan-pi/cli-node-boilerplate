#!/usr/bin/env node

import { program } from "commander";
import inquirer from "inquirer";
import fs from "fs-extra";
import path from "path";
import { exec } from "child_process"; // Importando exec do child_process

program
  .version("1.2.0")
  .description(
    "A CLI tool to generate an optimized and lightweight Node.js boilerplate for quick project starts"
  )
  .action(() => {
    inquirer
      .prompt([
        {
          type: "input",
          name: "project_name",
          message: "What is your project name?",
          validate: (input) => {
            if (input.trim() === "") {
              return "Please enter a project name.";
            }
            return true;
          },
        },
        {
          type: "list",
          name: "packageManager",
          message: "Choose a package manager:",
          choices: ["npm", "yarn", "pnpm"],
          default: "pnpm",
        },
        {
          type: "list",
          name: "framework",
          message: "Choose a framework to use:",
          choices: ["express", "fastify"],
          default: "fastify",
        },
      ])
      .then((answers) => {
        createProject(
          answers.project_name,
          answers.packageManager,
          answers.framework
        );
      });
  })
  .parse(process.argv);

async function getLatestVersion(packageName, packageManager) {
  return new Promise((resolve, reject) => {
    exec(`${packageManager} show ${packageName} version`, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function createProject(project_name, packageManager, framework) {
  const destinationDirectory = path.join(process.cwd(), project_name);

  await fs.ensureDir(destinationDirectory);

  const srcDirPath = path.join(destinationDirectory, "src");
  await fs.ensureDir(srcDirPath);

  let serverConfig;
  if (framework === "express") {
    serverConfig = `import express from 'express';

  const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
`;
  } else if (framework === "fastify") {
    serverConfig = `import fastify from 'fastify';

const app = fastify();

app.get('/test', () => {
  return { message: 'Hello World' };
});

app.listen({
  port: 3000,
}).then(() => {
  console.log('Server is running on port 3000');
});
`;
  }

  const serverFilePath = path.join(srcDirPath, "server.ts");
  await fs.writeFile(serverFilePath, serverConfig);

  const testServerFilePath = path.join(srcDirPath, "test.server.ts");
  const testServerConfig = `// Test file for the server
// Implement your tests here
`;

  await fs.writeFile(testServerFilePath, testServerConfig);

  const huskyDirPath = path.join(destinationDirectory, ".husky");
  await fs.ensureDir(huskyDirPath);

  const huskyHookFilePath = path.join(huskyDirPath, "pre-commit");
  const huskyHookConfig = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

${packageManager} lint-staged
`;

  await fs.writeFile(huskyHookFilePath, huskyHookConfig);
  await fs.chmod(huskyHookFilePath, "755");

  const packageJsonPath = path.join(destinationDirectory, "package.json");

  let dependencies = {
    "@typescript-eslint/eslint-plugin": "7.7.0",
    "@typescript-eslint/parser": "7.7.0",
    "eslint": "9.0.0",
    "eslint-config-prettier": "9.1.0",
    "husky": "9.0.11",
    "lint-staged": "15.2.2",
    "prettier": "3.2.5",
    "tsup": "8.0.2",
    "tsx": "4.7.2",
    "typescript": "5.4.5",
    "vitest": "1.5.0",
  };

  let devDependencies = {
    "@types/node": "^20.10.5",
  };

  if (framework === "express") {
    dependencies = {
      ...dependencies,
      "@types/express": "^4.17.21",
      express: "^4.19.2",
    };
  } else if (framework === "fastify") {
    dependencies = {
      ...dependencies,
      fastify: "^4.26.2",
    };
  }

  const packagesToCheck = [
    "@typescript-eslint/eslint-plugin",
    "@typescript-eslint/parser",
    "eslint",
    "eslint-config-prettier",
    "husky",
    "lint-staged",
    "prettier",
    "tsup",
    "tsx",
    "typescript",
    "vitest",
    "@types/node",
  ];


  if (framework === "express") {
    packagesToCheck.push("express", "@types/express");
  } else if (framework === "fastify") {
    packagesToCheck.push("fastify");
  }

  const latestVersions = await fetchLatestVersions(packagesToCheck, packageManager);

  const packageJson = {
    name: project_name,
    version: "1.0.0",
    description: "",
    main: "server.ts",
    scripts: {
      start: `tsx src/server.ts`,
      build: "tsup src",
      "start:dev": "tsx watch src/server.ts",
      "husky:prepare": `npx husky init`,
      test: "vitest",
      "test:lint": "vitest run",
    },
    husky: {
      hooks: {
        "pre-commit": "lint-staged",
      },
    },
    "lint-staged": {
      "*.{js,jsx,ts,tsx}": [
        `${packageManager} eslint --fix`,
        `${packageManager} prettier --write \"src/**/*.{ts,tsx}\"`,
        `${packageManager} test:lint --passWithNoTests`,
      ],
    },
    keywords: [],
    author: "",
    license: "ISC",
    dependencies: Object.fromEntries(
      Object.keys(dependencies).map((key) => [key, latestVersions[key] || dependencies[key]])
    ),
    devDependencies: Object.fromEntries(
      Object.keys(devDependencies).map((key) => [key, latestVersions[key] || devDependencies[key]])
    ),
  };

  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

  console.log("Installing dependencies...");
  exec(`${packageManager} install`, async (error) => {
    if (error) {
      console.error("Error installing dependencies:", error);
      return;
    }

    console.log("Dependencies installed successfully!");

    console.log("Checking for outdated dependencies...");
    exec(`${packageManager} outdated`, async (error, stdout) => {
      if (error) {
        console.error("Error checking for outdated dependencies:", error);
        return;
      }

      const outdatedPackages = stdout
        .split("\n")
        .slice(1)
        .map((line) => {
          const [packageName, current, wanted, latest, location] = line
            .trim()
            .split(/\s+/);
          return { packageName, current, wanted, latest, location };
        });

      if (outdatedPackages.length > 0) {
        console.log("Updating outdated dependencies...");
        exec(`${packageManager} update`, async (error) => {
          if (error) {
            console.error("Error updating dependencies:", error);
            return;
          }
          console.log("Dependencies updated successfully!");
        });
      } else {
        console.log("All dependencies are up to date.");
      }
    });
  });

  console.log(`Project ${project_name} created successfully!`);
  console.log(
    `To get started, navigate to the directory: ${destinationDirectory}`
  );
  console.log(
    `Tip: run ${packageManager} to install the dependencies and ${packageManager} update to update the dependencies.`
  );
}

async function fetchLatestVersions(packages, packageManager) {
  const versions = {};

  for (const packageName of packages) {
    try {
      const latestVersion = await getLatestVersion(packageName, packageManager);
      versions[packageName] = latestVersion;
    } catch (error) {
      console.error(`Error fetching latest version for ${packageName}:`, error);
    }
  }

  return versions;
}
