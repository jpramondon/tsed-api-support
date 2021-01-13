import { Constant, Middleware, Req, Res } from "@tsed/common";
import { Loggers } from "@gearedminds/ts-commons";

@Middleware()
export class HeaderMiddleware {
  
  private logger = Loggers.getLogger("HeaderMiddleware");

  @Constant("headerMW_enabled")
  enabled: boolean;

  use(@Req() request: Req, @Res() response: Res) {
    const method = request.method;
    
    if (method === "OPTIONS") {
      this.logger.debug("OPTIONS methods do not require any header check");
      return;
    } else if (!this.enabled) {
      this.logger.debug("Access middleware disabled. No header check required.");
      return;
    } else {
      const appName = request.get("AppName");
      const userEmail = response.locals.userEmail;
      if (appName) {
        this.logger.info(appName ? `AppName is : ${appName}` : "No appName found");
      }
      if (userEmail) {
        this.logger.info(userEmail ? `User email is : ${userEmail}` : "No User email found");
      }
    }
  }
}