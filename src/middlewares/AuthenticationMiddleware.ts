import { Constant, Middleware, Req, Res } from "@tsed/common";
import * as ApiHelper from "../support/ApiHelper";
import * as _ from "lodash";
import { Loggers } from "@gearedminds/ts-commons";

@Middleware()
export class AuthenticationMiddleware {

    private logger = Loggers.getLogger("AuthenticationMiddleware");

    @Constant("authenticationMW_enabled")
    enabled: boolean;

    @Constant("authenticationMW_oauthServiceURL")
    oAuth2URL: string;

    @Constant("authenticationMW_unprotectedPaths")
    unprotectedPaths: string[];

    use(@Req() request: Req, @Res() response: Res) {
        const path = request.path;
        const method = request.method;
        this.logger.debug(`Authentication check on path ${path}`);

        const authToken = request.header("Authorization");

        if (method === "OPTIONS") {
            this.logger.debug("OPTIONS methods do not require any authentication check");
            this.traceAuthToken(authToken);
            return;
        } else if (this.unprotectedPaths && this.unprotectedPaths.indexOf(path) >= 0) {
            this.logger.debug("Requests to unprotected paths and do not require any authentication check");
            this.traceAuthToken(authToken);
            return;
        } else if (!this.enabled) {
            this.logger.debug("OAuth middleware disabled. No authentication check required.");
            this.traceAuthToken(authToken);
            return;
        } else {
            if (authToken) {
                const decodedAuthToken = this.decodeUserToken(authToken);
                if (decodedAuthToken) {
                    return this.introspectUserToken(decodedAuthToken.payload)
                        .then((parsedToken: any) => {
                            if (!_.isNil(parsedToken) && !_.isNil(parsedToken.expires_in) && Number(parsedToken.expires_in) > 0) {
                                this.logger.debug("User token introspection validated !");
                                response.locals.userToken = decodedAuthToken.payload;
                                if (!_.isNil(parsedToken.email)) {
                                    response.locals.userEmail = parsedToken.email;
                                }
                                return;
                            }
                            else {
                                this.logger.info("User token not active.");
                                response.status(401);
                                response.send();
                            }
                        });
                } else {
                    this.logger.error("Bad authentication user token provided. Rejecting call ...");
                    response.status(400);
                    response.send();
                }
            } else {
                this.logger.error("No authentication user token provided. Rejecting call ...");
                response.status(401);
                response.send();
            }
        }
    }

    private traceAuthToken(token: string): void {
        if (token) {
            const decodedToken = this.decodeUserToken(token);
            this.logger.debug(`Authorization header was provided anyway ${JSON.stringify(decodedToken)}`);
        }
    }

    private decodeUserToken(token: string): IJsonWebToken {
        const tokenBits = token.split(" ");
        switch (tokenBits.length) {
            case 1:
                return { payload: tokenBits[0].trim() };
            case 2:
                return { payload: tokenBits[1].trim(), header: tokenBits[0].trim() };
            default:
                return null;
        }
    }

    private introspectUserToken(token: string): Promise<any> {
        this.logger.debug("Authentication user token needs to be introspected");
        return ApiHelper.callGet(this.logger, `${this.oAuth2URL}/tokeninfo?access_token=${token}`, {}, "Authentication")
            .then(authResponse => {
                this.logger.debug(`Access token response is: ${JSON.stringify(authResponse)}`);
                return authResponse;
            })
            .catch((reason) => {
                this.logger.debug(`Token is invalid: ${JSON.stringify(reason)}`);
                return undefined;
            });
    }

}

interface IJsonWebToken {
    payload: string;
    header?: string;
}