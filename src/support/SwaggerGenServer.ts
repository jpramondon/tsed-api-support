import { ServerLoader, ServerSettings } from "@tsed/common";
import * as path from "path";

export namespace Swagger {

    const rootDir = path.resolve(process.cwd(), "dist", "src");

    @ServerSettings({
        rootDir,
        mount: {
            '/': "${rootDir}/**/controllers/*.ts"
        },
        swagger: ([{ path: "/spec", outFile: path.resolve(rootDir, "swagger.json") }]),
        acceptMimes: ["application/json"]
    })
    export class SwaggerGenServer extends ServerLoader {
        public $onServerInitError(err: any): void {
            console.log(err);
            process.exit(3);
        }
    }
}