import { Probes } from "../models/Probes";
import { Middlewares } from "../middlewares/Middlewares";

export namespace ProbeFactory {

    /**
     * Generate a new `ApiStatusProbe` that take care of `MuteAllRoutesMiddleware` to set its status and value
     */
    export function getApiStatusProbe(): Promise<Probes.ApiStatusProbe> {
        const probe = new Probes.ApiStatusProbe();
        if (Middlewares.MuteAllRoutesMiddleware.isMutedAllRoutes()) {
            probe.value = Probes.ApiStatus.STARTING;
            probe.status = "WARNING";
        } else {
            probe.value = Probes.ApiStatus.RUNNING;
            probe.status = "OK";
        }
        probe.finalize();
        return Promise.resolve(probe);
    }

    /**
     * Generate a new `DbPingProbe` with value equals to `"${duration} ms"` and predetermined status
     * @param ping Function that will be launched for the probe. Must return a number in milliseconds
     * @param critical Value (in ms) that will change status as `CRITICAL` **Default:** _1000_
     * @param warning Value (in ms) that will change status as `WARNING` **Default:** _100_
     */
    export function getDbPingProbe(ping: () => Promise<number>, critical = 1000, warning = 100): Promise<Probes.DbPingProbe> {
        const probe = new Probes.DbPingProbe();
        return ping()
            .then((duration) => {
                if (duration > critical) {
                    probe.status = "CRITICAL";
                } else if (duration > warning) {
                    probe.status = "WARNING";
                } else {
                    probe.status = "OK";
                }
                probe.value = `${duration} ms`;
            })
            .catch((error) => {
                probe.value = error;
                probe.status = "CRITICAL";
            })
            .then(() => {
                probe.finalize();
                return probe;
            });
    }

    export function getGenericProbe(name: string, description: string, test: () => Promise<any>): Promise<Probes.GenericProbe> {
        const probe = new Probes.GenericProbe(name, description);
        return test()
            .then((value) => {
                probe.value = value;
                probe.status = "OK";
            })
            .catch((error) => {
                probe.value = error;
                probe.status = "CRITICAL";
            })
            .then(() => {
                probe.finalize();
                return probe;
            });
    }
}