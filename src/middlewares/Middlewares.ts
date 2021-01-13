import { Errors, Loggers } from "@gearedminds/ts-commons";
import { Err, Middleware, Res } from "@tsed/common";
import * as Express from "express";
import { Exception } from "ts-httpexceptions";
import { AccessMiddleware as MyAccessMiddleware } from "./AccessMiddleware";
import { AuthenticationMiddleware as MyAuthenticationMiddleware } from "./AuthenticationMiddleware";
import { HeaderMiddleware as MyHeaderMiddleware } from "./HeaderMiddleware";
import { MuteAllRoutesMiddleware as MyMuteAllRoutesMiddleware } from "./MuteAllRoutesMiddleware";
import { RequestProfileMiddleware as MyRequestProfileMiddleware } from "./RequestProfileMiddleware";

export namespace Middlewares {

    @Middleware()
    export class NotFoundMiddleware {
        use(@Res() response: Express.Response) {
            // Json response
            response.status(404).json({ status: 404, message: 'Not found' });
        }
    }

    @Middleware()
    export class ErrorTranslationMiddleware {
        private logger = Loggers.getLogger("TAS-ErrorTranslationMW");

        use(@Err() error: any, @Res() response: Res) {
            // Case of ts-httpexceptions
            if (error instanceof Exception) {
                this.logger.info(`Translating a ts-httpexceptions error ${error}`);
                // Fix this to have it return a Json response
                response.status(error.status).json({
                    status: error.status,
                    name: error.name,
                    message: error.message
                });
                return;
            }
            // Case of Custom Errors
            if (Errors.HttpableError.isHttpableError(error)) {
                this.logger.info(`Translating a Custom error ${error}`);
                response.status(error.httpStatusCode).json(error.toJson());
                return;
            }
            // Case of multiple Errors
            if (Array.isArray(error)) {
                this.logger.info(`Translating a multiple errors ${error}`);
                response.status(error[0].httpStatusCode).json(error.map(err => err.toJson()));
                return;
            }
            // Other kind of error should generate a 500
            this.logger.info(`An anonymous error has been caught by the error translator : ${error}`);
            response.status(500).json(error);
            return;
        }

    }

    export const RequestProfileMiddleware = MyRequestProfileMiddleware;
    export const AuthenticationMiddleware = MyAuthenticationMiddleware;
    export const AccessMiddleware = MyAccessMiddleware;
    export const HeaderMiddleware = MyHeaderMiddleware;
    export const MuteAllRoutesMiddleware = MyMuteAllRoutesMiddleware;
}