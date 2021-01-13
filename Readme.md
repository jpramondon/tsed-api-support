# TSED Api Support

This module is used to secure any nodejs express API using TSED node module (https://tsed.io/).
It handles :

- [Token introspection service](#Token-introspection-service)
- [Permit service](#Permit-service)
- [A tool to mute route before start of an API](#MuteAllRoutesMiddleware)

Each one is a middleware.

It also provides a set of [HTTP errors](#HTTP-errors), [Probes](#Probes), a [Logger factory](#Logger-factory) and a [swagger generator tool](#swagger-generator-tool) (related to TSED). 

# Token introspection service

This service is used to introspect the provided user token.

Builder options required by this middleware :

```javascript
    // skip all checks if set to false
    authenticationMW_enabled: boolean;
    // URL of the oAuth service
    authenticationMW_oauthServiceURL: string;
    // uri(s) for which all checks are disabled
    authenticationMW_unprotectedPaths: string[];
```

If the user token is not successfully introspected or the authentication failed, a `401` error code is returned.

# Permit service

This service is used to get roles of the calling user for a given application

After getting roles, the middleware checks if the method & the path are authorized for this user (crossing data with returned roles).
If the endpoint does not require specific permission, the user is authorized by default.

Builder options required by this middleware :

```javascript
    // skip all checks if set to false
    accessControlMW_enabled: boolean;
    // skip all Headers checks if set to false
    headerMW_enabled: boolean;
    // URL of the permit service
    accessControlMW_permissionServiceURL: string;
    // uri(s) for which all checks are disabled
    accessControlMW_unprotectedPaths: string[];
    // roles/path/method mapping to know if the user is authorized to access this endpoint
    accessControlMW_roleMappings: any[];
    // the name of the application
    accessControlMW_enclosingAppName: string;
    // x-api-key of calling api
    accessControlMW_enclosingAppApiKey: string;
```
# Header service

This service is used to get information about enclosing app and user

Builder options required by this middleware :

```javascript
    // skip all Headers checks if set to false
    headerMW_enabled: boolean;
```

# MuteAllRoutesMiddleware

This middleware is used to allow the start of an API when database is not totally up (migration in progress)

It allows to serve the /_health only endpoint when some migrations are running

```javascript
    // enable the middleware
    muteAllRoutesMW_enabled: boolean;
```

When using this middleware, the [ApiStatusProbe](#ApiStatusProbe) will now show a `warning` status when the API is not totally up

When you're ready to unleash your routes (allow access to any other routes than just `/_health`), you have the responsibility to call the `unMute` method of this middleware.

```typescript
Middlewares.MuteAllRoutesMiddleware.unMute();
```

**While this method is not called**, all another route than `/_health` will return a **503 error code**

# HTTP Errors

By importing `Errors` from this module, the following errors are available:

- `NoContentFoundError` returning a `204` response. It is often used for empty search result.
- `ValidationError` returning a `400` response. It is often used for request parameters/body validation errors.
- `NotFoundError` returning a `404` response. It is often used when getting/updating/deleting an unknown resource.
- `ConflictError` returning a `409` response. It is often used when updating a resource which is in conflict with another one.
- `TechnicalError` returning a `500` response. It is used for internal server error.
- `ServiceUnavailableError` returning a `503` response. It is used when API can't answer due to server side errors.

When combined with the `ErrorTranslationMiddleware`, these errors are automatically handled as valid json output with the matching status code.

# Probes

Probes are used for the endpoint `/_health` in order to have a quick check up of an API

The model of a probe is defined as follow :

```javascript
    name: string; // The name of the probe
    description: string; // A quick description
    value: any; // It's value (could be a number for a ping, or an enum, ...)
    status: "OK" | "WARNING" | "CRITICAL"; // A value that speaks for itself
    start: number; // The begin time of the probe
    end: number; // The end time of the probe
```

Probes are wrapped in a `HealthProbeResponse`

## HealthProbeResponse

```typescript
export interface HealthProbeResponse {
    version: string;
    probes: AbstractProbe[];
    status: ProbeStatus;
}
```

You can use it like this

```typescript
const version = Env.getVersion();
const result: Probes.HealthProbeResponse = {
    version,
    probes: [],
    status: "OK"
};
```

## ApiStatusProbe

This probe has en empty constructor, so you can't define its name and description
Value and status are set in the constructor whith the value of the [MuteAllRoutesMiddleware](#MuteAllRoutesMiddleware)

- When routes are muted, value will have the value `starting` and status the value `WARNING`
- When routes are unmuted, value will have the value `running` and status the value `OK`

You can use it like this

```typescript
ProbeFactory.getApiStatusProbe()
    .then((probe) => {
        result.probes.push(probe);
    });
```

In case of you're using several probes in your `/_health` endpoint, you can quickly find this one by searching on its name

```typescript
const probes: Probes.AbstractProbe[] = res.body.probes;
const statusProbe = probes.find(probe => probe.name === Probes.ApiStatusProbe.NAME);
```

## DbPingProbe

A probe that is used to get the response time of a database.

This probe uses the 3 states of status with default values as follows:

| duration | status     |
| -        | -          |
| > 1s     | `CRITICAL` |
| > 100ms  | `WARNING`  |
| ≤ 100ms  | `OK`       |

This probe needs a `Promise<number>` in order to retrieve the correct status. You can set your own limit values for `WARNING` and `CRITICAL` status with optional parameters.

```typescript
// MyDatabaseClass.ts
public async ping(): Promise<number> {
    const pingStart = moment();
    return this.sequelize.query("select * from types")
        .then(() => {
            const pingEnd = moment();
            return pingEnd.diff(pingStart, "milliseconds");
        })
        .catch(() => -1);
}

// HealthController.ts
ProbeFactory.getDbPingProbe(() => ping) // For default values
    .then((probe) => {
        result.probes.push(probe);
    });

const criticalPing = 2000;
const warningPing = 500;
ProbeFactory.getDbPingProbe(() => ping, criticalPing, warningPing) // For custom values
    .then((probe) => {
        result.probes.push(probe);
    });
```

You can find it by its name as the ApiStatusProbe

```typescript
const probes: Probes.AbstractProbe[] = res.body.probes;
const dbPingProbe = probes.find(probe => probe.name === Probes.DbPingProbe.NAME);
```

## GenericProbe

A probe in which you can define its name and description. It allows you to define your own Probes when needed

A Factory is available in order to set properly all attributes of a probe

```typescript
ProbeFactory.getGenericProbe("PgDbProbe", "A simple ping of the Postgresql database", () => SequelizeManager.ping())
    .then((probe: Probes.GenericProbe) => {
        if (probe.value > 100000000) {
            probe.status = "WARNING";
        }
        probe.value = `${probe.value} nanoseconds`;
        probeResult.probes.push(probe);
    })
```

# Logger factory

By importing `Logger`from this module, you can get a logger with `getLogger("...")` method and use common logger methods on it (`error`, `warn`, `debug`; `info`, ...). The name given to `getLogger(name)` is traced in logs and is usefull for debug.

# Swagger generator tool

The `tsed-api-support swagger-file` command generates the swagger.json file

# Version file generator

The lib also comes with another bin that generates a version file (`version.json`) that could prove very handy when exposing a project's current version through an endpoint without having to embed/parse/read the whole package `package.json` file.

Just try the following command : `> tsed-api-support version-file ./package.json > version.json`

# Installation

Just either add the component to your *package.json* file (recommended way) or issue an `npm install` command.

```shell
npm install @gearedminds/tsed-api-support
```