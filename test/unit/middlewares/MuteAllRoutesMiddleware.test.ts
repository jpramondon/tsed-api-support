import { Request, Response } from "express";
import * as httpMocks from "node-mocks-http";
import * as sinon from "sinon";

import * as ApiHelper from "../../../src/support/ApiHelper";
import { MuteAllRoutesMiddleware } from "../../../src/middlewares/MuteAllRoutesMiddleware";
import { Logger } from "@tsed/logger";

describe("MuteAllRoutesMiddleware", () => {

    describe("handleAccess", () => {

        const sandbox = sinon.createSandbox();
        let req: Request;
        let muteAllRoutesMiddleware: MuteAllRoutesMiddleware;
        const res: Response = httpMocks.createResponse();
        let debugLoggerSpy: sinon.SinonSpy;
        let errorLoggerSpy: sinon.SinonSpy;
        let resSendStub: sinon.SinonStub;
        let callGetStub: sinon.SinonStub;
        let resStatusSpy: sinon.SinonSpy;


        beforeEach(() => {
            muteAllRoutesMiddleware = new MuteAllRoutesMiddleware();
            callGetStub = sandbox.stub(ApiHelper, "callGet");
            resSendStub = sandbox.stub(res, "send");
            resStatusSpy = sandbox.spy(res, "status");
            debugLoggerSpy = sandbox.stub(Logger.prototype, "debug");
            errorLoggerSpy = sandbox.stub(Logger.prototype, "error");
            muteAllRoutesMiddleware.muteAllRoutesMW_enabled = true;
        });

        afterEach(() => {
            sandbox.restore();
        });

        it("Should accept when path is /_health", () => {
            muteAllRoutesMiddleware.$beforeListen();
            req = httpMocks.createRequest({
                method: 'GET',
                path: '/_health',
            });

            muteAllRoutesMiddleware.use(req, res);
            sinon.assert.calledWith(debugLoggerSpy, "Should path /_health be muted ? false");
        });

        it("Should reject when path is /bacon", () => {
            muteAllRoutesMiddleware.muteAllRoutesMW_enabled = true;
            muteAllRoutesMiddleware.$beforeListen();
            req = httpMocks.createRequest({
                method: 'GET',
                path: '/bacon',
            });
            const expectedStatus = 503;

            muteAllRoutesMiddleware.use(req, res);
            sinon.assert.calledWith(debugLoggerSpy, "Should path /bacon be muted ? true");
            sinon.assert.calledOnce(resSendStub);
            sinon.assert.calledOnce(resStatusSpy);
            sinon.assert.calledWith(resStatusSpy, expectedStatus);
        });

        it("Should accept when path is /bacon and routes are unMuted", () => {
            muteAllRoutesMiddleware.muteAllRoutesMW_enabled = true;
            muteAllRoutesMiddleware.$beforeListen();
            MuteAllRoutesMiddleware.unMute();
            req = httpMocks.createRequest({
                method: 'GET',
                path: '/bacon',
            });
            
            muteAllRoutesMiddleware.use(req, res);
            sinon.assert.calledWith(debugLoggerSpy, "Should path /bacon be muted ? false");
        });
    });
});