import { Constant, Middleware, Req, Res, IMiddleware } from "@tsed/common";
import { Loggers } from "@gearedminds/ts-commons";

export const UNMUTED_ROUTES = [ "/_health" ];

@Middleware()
export class MuteAllRoutesMiddleware implements IMiddleware {
    private logger = Loggers.getLogger("MuteAllRoutesMiddleware");

    @Constant("muteAllRoutesMW_enabled", false)
    muteAllRoutesMW_enabled: boolean;

    $beforeListen() {
        MuteAllRoutesMiddleware.enabled = this.muteAllRoutesMW_enabled;
    }

    private static enabled: boolean;
    private static mute = true;

    public static isMutedAllRoutes(): boolean {
        return MuteAllRoutesMiddleware.enabled && MuteAllRoutesMiddleware.mute;
    }

    public static unMute() {
        MuteAllRoutesMiddleware.mute = false;
    }
    
    use(@Req() request: Req, @Res() response: Res) {
        const path = request.path;
        this.logger.debug(`Should path ${path} be muted ? ${MuteAllRoutesMiddleware.isMutedAllRoutes() && !UNMUTED_ROUTES.includes(path)}`);
        if (MuteAllRoutesMiddleware.isMutedAllRoutes() && !UNMUTED_ROUTES.includes(path)) {
            response.status(503);
            response.send();
        }
        return;
    }
}