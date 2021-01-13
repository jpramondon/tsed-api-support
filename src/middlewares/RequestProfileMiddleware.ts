import * as _ from "lodash";
import { Loggers, RequestProfileData } from "@gearedminds/ts-commons";
import { IMiddleware, Middleware, Req, Res } from "@tsed/common"

@Middleware()
export class RequestProfileMiddleware implements IMiddleware {
    private profileLogger = Loggers.getProfileLogger("RequestProfileMiddleware");

    use(@Req() request: Req, @Res() response: Res) {
        response.locals.start = new Date();
        response.on("finish", () => {
            const profileData = this.getProfileData(request, response);
            this.profileLogger.info(profileData);
        });
        return;
    }

    private getProfileData(request: Req, response: Res): RequestProfileData {
        const end = new Date();
        return new RequestProfileData(request.method, request.query, request.path, response.statusCode, response.locals.userEmail);
    }
}