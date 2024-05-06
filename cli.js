#!/usr/bin/env node
import inquirer from "inquirer";
import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";

const run = async () => {
	const answers = await inquirer.prompt([
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
	]);

	createProject(
		answers.project_name || cli.flags.project_name,
		answers.packageManager || cli.flags.packageManager,
		answers.framework || cli.flags.framework
	);
};

const getLatestVersion = async (packageName) => {
	return new Promise((resolve, reject) => {
		exec(`npm show ${packageName} version`, (error, stdout) => {
			if (error) {
				reject(error);
				return;
			}
			resolve(stdout.trim());
		});
	});
};

const fetchLatestVersions = async (packages, packageManager) => {
	const versions = {};
	console.log("Fetching Latest version of packages...")

	for (const packageName of packages) {
		try {
			const latestVersion = await getLatestVersion(packageName, packageManager);
			versions[packageName] = latestVersion;
		} catch (error) {
			console.error(`Error fetching latest version for ${packageName}:`, error);
		}
	}

	return versions;
};

const createProject = async (projectName, packageManager, framework) => {
	const destinationDirectory = path.join(process.cwd(), projectName);

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
    
    app.get('/test', async (request, reply) => {
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

	const testServerFilePath = path.join(srcDirPath, "server.test.ts");
	const testServerConfig = `
		// Test file for the server
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

	const eslintConfig = `{
		"env": {
			"es2021": true,
			"node": true
		},
		"extends": [
			"eslint:recommended",
			"plugin:@typescript-eslint/recommended",
			"prettier"
		],
		"parser": "@typescript-eslint/parser",
		"parserOptions": {
			"ecmaVersion": "latest",
			"sourceType": "module",
			"project": "./tsconfig.json"
		},
		"plugins": ["@typescript-eslint"],
		"ignorePatterns": ["node_modules", "dist"],
		"rules": {
			"@typescript-eslint/no-unused-vars": "error"
		}
	}`;
	const eslintFilePath = path.join(destinationDirectory, ".eslintrc.json");
	await fs.writeFile(eslintFilePath, eslintConfig);

	const prettierConfig = `{
		"semi": false,
		"singleQuote": false,
		"tabWidth": 2
	}`;
	const prettierFilePath = path.join(destinationDirectory, ".prettierrc.json");
	await fs.writeFile(prettierFilePath, prettierConfig);

	const tsconfigConfig = `{
		"compilerOptions": {
			"target": "ES6",
			"module": "CommonJS",
			"strict": true
		}
	}`;
	const tsconfigFilePath = path.join(destinationDirectory, "tsconfig.json");
	await fs.writeFile(tsconfigFilePath, tsconfigConfig);

	await fs.writeFile(huskyHookFilePath, huskyHookConfig);
	await fs.chmod(huskyHookFilePath, "755");

	const packageJsonPath = path.join(destinationDirectory, "package.json");

	const dependencies = {
		zod: "^3.22.4",
		"eslint-config-prettier": "^9.1.0"
	};

	const devDependencies = {
		"@types/node": "^20.10.5",
		tsup: "^8.0.2",
		tsx: "^4.7.2",
		typescript: "^5.4.5",
		"@eslint/js": "^9.0.0",
		"eslint-config-prettier": "^9.1.0",
		eslint: "^9.0.0",
		"@typescript-eslint/parser": "^7.7.0",
		"@typescript-eslint/eslint-plugin": "^7.7.0",
		prettier: "^3.2.5",
		"typescript-eslint": "^7.5.0",
		globals: "^15.0.0",
		vitest: "^1.5.0",
		husky: "^9.0.11",
		"lint-staged": "^15.2.2"
	};

	if (framework === "express") {
		dependencies["@types/express"] = "^4.17.21";
		dependencies.express = "^4.19.2";
	} else if (framework === "fastify") {
		dependencies["@fastify/cors"] = "^9.0.1";
		dependencies["@fastify/swagger"] = "^8.14.0";
		dependencies["@fastify/swagger-ui"] = "^3.0.0";
		dependencies["fastify-type-provider-zod"] = "^1.1.9";
		dependencies.fastify = "^4.26.2";
	}

	const packagesToCheck = [
		"zod",
		"eslint-config-prettier",
		"prettier",
		"@types/node",
		"tsup",
		"tsx",
		"typescript",
		"@eslint/js",
		"eslint-config-prettier",
		"eslint",
		"@typescript-eslint/parser",
		"@typescript-eslint/eslint-plugin",
		"prettier",
		"typescript-eslint",
		"globals",
		"vitest",
		"husky",
		"lint-staged"
	];

	if (framework === "express") {
		packagesToCheck.push("express", "@types/express");
	} else if (framework === "fastify") {
		packagesToCheck.push("fastify", "@fastify/cors", "@fastify/swagger", "@fastify/swagger-ui", "fastify-type-provider-zod");
	}

	const latestVersions = await fetchLatestVersions(packagesToCheck, packageManager);

	const packageJson = {
		name: projectName,
		version: "1.0.0",
		description: "",
		main: "server.ts",
		scripts: {
			start: `tsx src/server.ts`,
			build: "tsup src",
			"start:dev": "tsx watch src/server.ts",
			"husky:prepare": "npx husky init",
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
				`${packageManager} prettier --write "src/**/*.{ts,tsx}"`,
				`${packageManager} test:lint --passWithNoTests`,
			],
		},
		keywords: [],
		author: "",
		license: "ISC",
		dependencies: Object.fromEntries(
			Object.keys(dependencies).map((key) => [
				key,
				latestVersions[key] || dependencies[key],
			])
		),
		devDependencies: Object.fromEntries(
			Object.keys(devDependencies).map((key) => [
				key,
				latestVersions[key] || devDependencies[key],
			])
		),
	};

	console.log("Generating package.json...");
	await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

	console.log(`Project ${projectName} created successfully!`);
	console.log(
		`To get started, navigate to the directory: ${destinationDirectory}`
	);
	console.log(
		`Tip: run ${packageManager} to install the dependencies and ${packageManager} update to update the dependencies.`
	);
};

run();
