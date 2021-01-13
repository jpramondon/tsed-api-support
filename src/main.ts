#!/usr/bin/env node

import { ServerLoader } from "@tsed/common";
import * as commander from "commander";
import * as fs from "fs";
import * as path from "path";
import { Swagger } from "./support/SwaggerGenServer";
import { execSync } from "child_process";

commander
    .command("version-file <path-to-package.json-file>")
    .action((packageDotJsonPath: string) => {
        const realPath = path.resolve(packageDotJsonPath);
        if (!fs.existsSync(realPath)) {
            console.log(`File "${realPath}" not found`);
            process.exit(1);
        }
        const packageDotJson = require(realPath);
        let headHash = "";
        try{
            headHash = execSync("git rev-parse HEAD").toString('utf8').trim();
        }
        catch(err) {
            console.log(`Error getting the current branch's hash. This usually means the project is not a git project. \n${err}`);
        }
        let content = `{"version":"${packageDotJson.version}",\n"hash":"${headHash}"}`;
        process.stdout.write(content);
        process.exit(0);
    });

commander
    .command("swagger-file [path-to-server-file]")
    .action(async (serverPath: string) => {
        let settings = undefined;
        if (serverPath !== undefined && serverPath !== "") {
            const realPath = path.resolve(process.cwd(), ...serverPath.split("/"));
            settings = {
                rootDir: realPath,
                swagger: ([{ path: "/spec", outFile: path.resolve(realPath, "swagger.json") }])
            }
        }
        const server = await ServerLoader.bootstrap(Swagger.SwaggerGenServer, settings);
        server.listen()
            .then(() => {
                process.exit(0);
            }).catch((e) => {
                console.error(e);
                process.exit(3);
            });
    });

commander
    .command("*")
    .action(() => {
        console.log("Unknown command\nSee --help for a list of available commands.");
    });

commander.parse(process.argv);