export namespace Probes {

    export interface HealthProbeResponse {
        version: string;
        probes: AbstractProbe[];
        status: ProbeStatus;
    }

    export abstract class AbstractProbe {

        public readonly name: string;
        public status: ProbeStatus;
        public value: any;
        public readonly start: number;
        public end: number;
        public description: string;

        constructor(name: string, description: string) {
            this.start = Date.now();
            this.name = name;
            this.description = description;
        }

        public finalize() {
            this.end = Date.now();
        }
    }

    export class GenericProbe extends AbstractProbe {
        constructor(name: string, description?: string) {
            super(name, description);
        }
    }

    export enum ApiStatus {
        STARTING = "starting",
        RUNNING = "running"
    }
    export class ApiStatusProbe extends AbstractProbe {
        public static readonly NAME = "API Status";

        constructor() {
            super(ApiStatusProbe.NAME, "A probe that tells if API is fully running");
        }
    }

    export class DbPingProbe extends AbstractProbe {
        public static readonly NAME = "Database Ping";

        constructor() {
            super(DbPingProbe.NAME, "A simple ping of the database");
        }
    }

    export type ProbeStatus = "OK" | "WARNING" | "CRITICAL";
}