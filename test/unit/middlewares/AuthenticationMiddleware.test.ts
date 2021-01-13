import { Request, Response } from "express";
import * as httpMocks from "node-mocks-http";
import * as sinon from "sinon";

import * as ApiHelper from "../../../src/support/ApiHelper";
import { AuthenticationMiddleware } from "../../../src/middlewares/AuthenticationMiddleware";
import { Logger } from "@tsed/logger";

describe("AuthenticationMiddleware", () => {

    describe("handleOAuth", () => {

        const sandbox = sinon.createSandbox();
        let authenticationMiddleware: AuthenticationMiddleware;
        let reqWithoutHeaders: Request;
        let reqWithHeaders: Request;
        let reqWrongHeaders: Request;
        const res: Response = httpMocks.createResponse();
        let debugLoggerSpy: sinon.SinonSpy;
        let errorLoggerSpy: sinon.SinonSpy;
        let infoLoggerSpy: sinon.SinonSpy;
        let warnLoggerSpy: sinon.SinonSpy;
        let resSendStub: sinon.SinonStub;
        let callGetStub: sinon.SinonStub;
        let resStatusSpy: sinon.SinonSpy;

        beforeEach(() => {
            authenticationMiddleware = new AuthenticationMiddleware();
            callGetStub = sandbox.stub(ApiHelper, "callGet");
            resSendStub = sandbox.stub(res, "send");
            resStatusSpy = sandbox.spy(res, "status");
            debugLoggerSpy = sandbox.stub(Logger.prototype, "debug");
            errorLoggerSpy = sandbox.stub(Logger.prototype, "error");
            infoLoggerSpy = sandbox.stub(Logger.prototype, "info");
            warnLoggerSpy = sandbox.stub(Logger.prototype, "warn");
            reqWithoutHeaders = httpMocks.createRequest({
                method: 'GET',
                path: '/toast',
                query: {
                    myid: '312'
                }
            });
            reqWithHeaders = httpMocks.createRequest({
                headers: { "Authorization": "toast bacon" },
                method: 'GET',
                path: '/toast',
                query: {
                    myid: '312'
                }
            });
            reqWrongHeaders = httpMocks.createRequest({
                headers: { "Authorization": "toast bacon eggs" },
                method: 'GET',
                path: '/toast',
                query: {
                    myid: '312'
                }
            });
            authenticationMiddleware.enabled = true;
            authenticationMiddleware.oAuth2URL = "/bacon";
            authenticationMiddleware.unprotectedPaths = ["/bacon"];
        });

        afterEach(() => {
            sandbox.restore();
        });

        it("Should accept when path is in unprotected paths", () => {
            authenticationMiddleware.unprotectedPaths = ["/toast"];
            resSendStub.callsFake(() => { throw("response.send() must not be called"); });

            authenticationMiddleware.use(reqWithHeaders, res);

            sinon.assert.calledWith(debugLoggerSpy, "Requests to unprotected paths and do not require any authentication check");
        });

        it("Should accept when environment context is development", () => {
            authenticationMiddleware.enabled = false;
            resSendStub.callsFake(() => { throw("response.send() must not be called"); });

            authenticationMiddleware.use(reqWithHeaders, res);

            sinon.assert.calledWith(debugLoggerSpy, "OAuth middleware disabled. No authentication check required.");
        });

        it("Should reject when authorization header is not provided", () => {
            authenticationMiddleware.use(reqWithoutHeaders, res);

            sinon.assert.calledWith(errorLoggerSpy, "No authentication user token provided. Rejecting call ...");
            sinon.assert.calledOnce(resSendStub);
            sinon.assert.calledOnce(resStatusSpy);
            sinon.assert.calledWith(resStatusSpy, 401);
        });

        it("Should reject when authorization header is provided with wrong value", () => {
            authenticationMiddleware.use(reqWrongHeaders, res);

            sinon.assert.calledWith(errorLoggerSpy, "Bad authentication user token provided. Rejecting call ...");
            sinon.assert.calledOnce(resSendStub);
            sinon.assert.calledOnce(resStatusSpy);
            sinon.assert.calledWith(resStatusSpy, 400);
        });

        it("Should reject if callGet rejects", (done) => {
            const expectedError = { bacon: "sausage", eggs: 3 };
            callGetStub.rejects(expectedError);
            resSendStub.callsFake(() => {
                try {
                    sinon.assert.calledOnce(callGetStub);
                    sinon.assert.calledOnce(infoLoggerSpy);
                    sinon.assert.calledWith(infoLoggerSpy, "User token not active.");
                    sinon.assert.calledOnce(resStatusSpy);
                    sinon.assert.calledWith(resStatusSpy, 401);
                    done();
                }
                catch (reason) {
                    done(reason);
                }
            });

            authenticationMiddleware.use(reqWithHeaders, res);
        });

        it("Should reject if user token has expired", (done) => {
            callGetStub.resolves({ expires_in: 0 });
            resSendStub.callsFake(() => {
                try {
                    sinon.assert.calledOnce(callGetStub);
                    sinon.assert.calledOnce(infoLoggerSpy);
                    sinon.assert.calledWith(infoLoggerSpy, "User token not active.");
                    sinon.assert.calledOnce(resStatusSpy);
                    sinon.assert.calledWith(resStatusSpy, 401);
                    done();
                }
                catch (reason) {
                    done(reason);
                }
            });

            authenticationMiddleware.use(reqWithHeaders, res);
        });

        it("Should reject if user token is not active", (done) => {
            callGetStub.resolves({ error: "toast is bacon" });
            resSendStub.callsFake(() => {
                try {
                    sinon.assert.calledOnce(callGetStub);
                    sinon.assert.calledOnce(infoLoggerSpy);
                    sinon.assert.calledWith(infoLoggerSpy, "User token not active.");
                    sinon.assert.calledOnce(resStatusSpy);
                    sinon.assert.calledWith(resStatusSpy, 401);
                    done();
                }
                catch (reason) {
                    done(reason);
                }
            });

            authenticationMiddleware.use(reqWithHeaders, res);
        });

        it("Should accept if user email is not provided", () => {
            callGetStub.resolves({ expires_in: 2000 });
            resSendStub.callsFake(() => { throw("response.send() must not be called"); });

            authenticationMiddleware.use(reqWithHeaders, res);
        });

        it("Should accept if user token is active", () => {
            callGetStub.resolves({ expires_in: 2000, email: "toast@bacon.com" });
            resSendStub.callsFake(() => { throw("response.send() must not be called"); });

            authenticationMiddleware.use(reqWithHeaders, res);
        });
    });
});