import { Constant, Middleware, Req, Res } from "@tsed/common";
import * as request from "request-promise-native";
import * as ApiHelper from "../support/ApiHelper";
import * as _ from "lodash";
import { Loggers } from "@gearedminds/ts-commons";

@Middleware()
export class AccessMiddleware {

    private logger = Loggers.getLogger("AccessMiddleware");

    @Constant("accessControlMW_enabled")
    enabled: boolean;

    @Constant("accessControlMW_permissionServiceURL")
    permissionServiceURL: string;

    @Constant("accessControlMW_unprotectedPaths")
    unprotectedPaths: string[];

    @Constant("accessControlMW_roleMappings")
    roleMappings: any[];

    @Constant("accessControlMW_enclosingAppName")
    enclosingAppName: string;

    @Constant("accessControlMW_enclosingAppApiKey")
    enclosingAppApiKey: string;

    use(@Req() request: Req, @Res() response: Res) {
        const path = request.path;
        const method = request.method;
        this.logger.debug(`Access check on path ${path}`);

        if (method === "OPTIONS") {
            this.logger.debug("OPTIONS methods do not require any access check");
            return;
        } else if (this.unprotectedPaths && this.unprotectedPaths.indexOf(path) >= 0) {
            this.logger.debug("Requests to unprotected paths and do not require any access check");
            return;
        } else if (!this.enabled) {
            this.logger.debug("Access middleware disabled. No access check required.");
            return;
        } else {
            const userToken = response.locals.userToken;
            const userEmail = response.locals.userEmail;
            if (userToken) {
                if (userEmail) {
                    this.logger.debug("Get access roles for user with token '%s' and email '%s'", userToken, userEmail);
                    return this.getUserRoles(userEmail)
                        .then(permissions => {
                            if (this.isUserAuthorized(permissions, path, method)) {
                                response.locals.userPermissions = permissions;
                                return;
                            } else {
                                this.logger.error(`User '${userEmail}' not authorized to process '${path}' with '${method}' method. Rejecting call ...`);
                                response.status(403);
                                response.send();
                            }
                        })
                        .catch((reason) => {
                            this.logger.error("Something went wrong when getting access roles. Rejecting call ... %s", reason);
                            response.status(500);
                            response.send();
                        });
                } else {
                    this.logger.error("No user email provided by token introspection. Rejecting call ...");
                    response.status(401);
                    response.send();
                }
            } else {
                this.logger.error("No user token provided. Rejecting call ...");
                response.status(401);
                response.send();
            }
        }
    }

    private getUserRoles(userEmail: string): Promise<Permission[]> {
        const reqOptions: request.RequestPromiseOptions = {
            baseUrl: this.permissionServiceURL,
            headers: {
                "x-api-key": this.enclosingAppApiKey
            }
        };
        return ApiHelper.callGet(this.logger, `/permissions?user=${userEmail}&app=${this.enclosingAppName}`, reqOptions, "AccessManagement")
            .then((data) => {
                return data ? data.permissions : undefined;
            });
    }

    private isUserAuthorized(permissions: Permission[], path: string, method: string): boolean {
        const requestedEndpointRoles: string[] = [];
        this.roleMappings
            .filter(confRole => RegExp(confRole.path).test(path) && confRole.method === method)
            .forEach(confRole => requestedEndpointRoles.push(...confRole.roles));

        if (_.isEmpty(requestedEndpointRoles)) {
            return true;
        } else {
            return permissions.some(permission => requestedEndpointRoles.includes(permission.role));
        }
    }
}

interface Permission {
    role?: string;
    targets?: string[];
}