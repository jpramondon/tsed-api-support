import { Request, Response } from "express";
import * as httpMocks from "node-mocks-http";
import * as sinon from "sinon";

import * as ApiHelper from "../../../src/support/ApiHelper";
import { AccessMiddleware } from "../../../src/middlewares/AccessMiddleware";
import { Logger } from "@tsed/logger";

describe("AccessMiddleware", () => {

    describe("handleAccess", () => {

        const sandbox = sinon.createSandbox();
        let req: Request;
        let accessMiddleware: AccessMiddleware;
        const res: Response = httpMocks.createResponse();
        let debugLoggerSpy: sinon.SinonSpy;
        let errorLoggerSpy: sinon.SinonSpy;
        let resSendStub: sinon.SinonStub;
        let callGetStub: sinon.SinonStub;
        let resStatusSpy: sinon.SinonSpy;


        beforeEach(() => {
            accessMiddleware = new AccessMiddleware();
            callGetStub = sandbox.stub(ApiHelper, "callGet");
            resSendStub = sandbox.stub(res, "send");
            resStatusSpy = sandbox.spy(res, "status");
            debugLoggerSpy = sandbox.stub(Logger.prototype, "debug");
            errorLoggerSpy = sandbox.stub(Logger.prototype, "error");
            req = httpMocks.createRequest({
                headers: { "Main-Organizational-Unit": "toast" },
                method: 'GET',
                path: '/toast',
                query: {
                    myid: '312'
                }
            });
            res.locals.userEmail = "toast@bacon.com";
            res.locals.userToken = "toast";
            accessMiddleware.enabled = true;
            accessMiddleware.permissionServiceURL = "/bacon";
            accessMiddleware.unprotectedPaths = ["/bacon"];
            accessMiddleware.enclosingAppName = "toast";
            accessMiddleware.roleMappings = [];
            accessMiddleware.enclosingAppApiKey = "bacon";
        });

        afterEach(() => {
            sandbox.restore();
        });

        it("Should accept when path is in unprotected paths", () => {
            accessMiddleware.unprotectedPaths = ["/toast"];

            accessMiddleware.use(req, res);

            sinon.assert.calledWith(debugLoggerSpy, "Requests to unprotected paths and do not require any access check");
        });

        it("Should accept when environment context is development", () => {
            accessMiddleware.enabled = false;

            accessMiddleware.use(req, res);

            sinon.assert.calledWith(debugLoggerSpy, "Access middleware disabled. No access check required.");
        });

        it("Should reject if userToken is not provided", async () => {
            delete res.locals.userToken;

            accessMiddleware.use(req, res);

            sinon.assert.calledWith(errorLoggerSpy, "No user token provided. Rejecting call ...");
            sinon.assert.calledOnce(resSendStub);
            sinon.assert.calledOnce(resStatusSpy);
            sinon.assert.calledWith(resStatusSpy, 401);
        });

        it("Should reject if userEmail is not provided", async () => {
            delete res.locals.userEmail;
            
            accessMiddleware.use(req, res);

            sinon.assert.calledWith(errorLoggerSpy, "No user email provided by token introspection. Rejecting call ...");
            sinon.assert.calledOnce(resSendStub);
            sinon.assert.calledOnce(resStatusSpy);
            sinon.assert.calledWith(resStatusSpy, 401);
        });

        it("Should reject if callGet rejects", (done) => {
            // Arrange & Assert
            callGetStub.rejects();
            resSendStub.callsFake(() => {
                try {
                    sinon.assert.calledOnce(callGetStub);
                    sinon.assert.calledOnce(resStatusSpy);
                    sinon.assert.calledWith(resStatusSpy, 500);
                    done();
                }
                catch (reason) {
                    done(reason);
                }
            });
            
            accessMiddleware.use(req, res);
        });

        it("Should reject if user permissions don't match required roles", (done) => {
            // Arrange & Assert
            callGetStub.resolves({ permissions: [ { role: "BACON", targets: [] }] });
            accessMiddleware.roleMappings = [{ "path": "/toast", "method": "GET", "roles": ["TOAST", "EGGS"] }];
            resSendStub.callsFake(() => {
                try {
                    sinon.assert.calledOnce(callGetStub);
                    sinon.assert.calledOnce(resStatusSpy);
                    sinon.assert.calledWith(resStatusSpy, 403);
                    done();
                }
                catch (reason) {
                    done(reason);
                }
            });
            
            accessMiddleware.use(req, res);
        });

        it("Should accept if roles is an empty list for the user", () => {
            // Arrange & Assert
            callGetStub.resolves({ permissions: []});
            resSendStub.callsFake(() => { throw("response.send() must not be called"); });

            accessMiddleware.use(req, res)
            .catch();
        });

        it("Should accept if roles is undefined for the user", () => {
            // Arrange & Assert
            callGetStub.resolves(undefined);
            resSendStub.callsFake(() => { throw("response.send() must not be called"); });

            accessMiddleware.use(req, res);
        });

        it("Should accept if no rule is required to access endpoint", () => {
            // Arrange & Assert
            callGetStub.resolves({ permissions: [ { role: "TOAST", targets: [] }] });
            accessMiddleware.roleMappings = [{ "path": "/eggs", "method": "GET", "roles": ["TOAST"] }];
            resSendStub.callsFake(() => { throw("response.send() must not be called"); });

            accessMiddleware.use(req, res);
        });

        it("Should accept if permissions match with endpoint", () => {
            // Arrange & Assert
            callGetStub.resolves({ permissions: [ { role: "TOAST", targets: [] }] });
            accessMiddleware.roleMappings = [{ "path": "/toast", "method": "GET", "roles": ["TOAST"] }];
            resSendStub.callsFake(() => { throw("response.send() must not be called"); });
            
            accessMiddleware.use(req, res);
        });

        it("Should accept if roles match with endpoint with multiple roles", () => {
            // Arrange & Assert
            callGetStub.resolves({ permissions: [ { role: "TOAST", targets: [] }] });
            accessMiddleware.roleMappings = [{ "path": "/toast", "method": "GET", "roles": ["TOAST", "EGGS"] }];
            resSendStub.callsFake(() => { throw("response.send() must not be called"); });
            
            accessMiddleware.use(req, res);
        });
    });
});