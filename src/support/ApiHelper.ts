import * as request from "request-promise-native";
import * as _ from "lodash";
import { Logger } from "@tsed/logger";

export function callGet(logger: Logger, apiEndPoint: string, reqOptions: request.RequestPromiseOptions, calledService: string): Promise<any> {
    return request.get(apiEndPoint, reqOptions)
        .then((data: any) => {
            if (_.isNil(data) || _.isEmpty(data)) {
                logger.debug(`Received empty response from '${calledService}' service on '${apiEndPoint}'`);
                return undefined;
            }
            logger.debug(`Received following response from '${calledService}' service on '${apiEndPoint}': ` + data);
            return JSON.parse(data);
        });
}