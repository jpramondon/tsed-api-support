import * as chai from "chai";
import * as sinon from "sinon";
import { MuteAllRoutesMiddleware } from "../../../src/middlewares/MuteAllRoutesMiddleware";
import { Probes } from "../../../src/models/Probes";
import { ProbeFactory } from "../../../src/support/ProbeFactory";

describe("ProbeFactory", () => {

    const sandbox = sinon.createSandbox();
    // let muteAllRoutesMiddleware: MuteAllRoutesMiddleware;
    let isMutedAllRoutesStub: sinon.SinonStub;

    beforeEach(() => {
        // muteAllRoutesMiddleware = new MuteAllRoutesMiddleware();
        isMutedAllRoutesStub = sandbox.stub(MuteAllRoutesMiddleware, "isMutedAllRoutes");
    });

    afterEach(() => {
        sandbox.restore();
    })

    describe("getApiStatusProbe", () => {

        it("should initialize an ApiStatusProbe with OK status", () => {
            isMutedAllRoutesStub.returns(false);
            return ProbeFactory.getApiStatusProbe()
                .then((probe: Probes.ApiStatusProbe) => {
                    chai.expect(probe.name).to.deep.equal(Probes.ApiStatusProbe.NAME);
                    chai.expect(probe.description).to.deep.equal("A probe that tells if API is fully running");
                    chai.expect(probe.value).to.deep.equal(Probes.ApiStatus.RUNNING);
                    chai.expect(probe.status).to.deep.equal("OK");
                });
        });

        it("should initialize an ApiStatusProbe with WARNING status", () => {
            isMutedAllRoutesStub.returns(true);
            return ProbeFactory.getApiStatusProbe()
                .then((probe: Probes.ApiStatusProbe) => {
                    chai.expect(probe.name).to.deep.equal(Probes.ApiStatusProbe.NAME);
                    chai.expect(probe.description).to.deep.equal("A probe that tells if API is fully running");
                    chai.expect(probe.value).to.deep.equal(Probes.ApiStatus.STARTING);
                    chai.expect(probe.status).to.deep.equal("WARNING");
                });
        });

    });

    describe("getDbPingProbe", () => {

        it("should initialize a DbPingProbe with OK status", () => {
            const ping = Promise.resolve(1);
            return ProbeFactory.getDbPingProbe(() => ping)
                .then((probe) => {
                    chai.expect(probe.name).to.deep.equal(Probes.DbPingProbe.NAME);
                    chai.expect(probe.description).to.deep.equal("A simple ping of the database");
                    chai.expect(probe.value).to.deep.equal("1 ms");
                    chai.expect(probe.status).to.deep.equal("OK");
                });
        });

        it("should initialize a DbPingProbe with WARNING status", () => {
            const ping = Promise.resolve(101);
            return ProbeFactory.getDbPingProbe(() => ping)
                .then((probe) => {
                    chai.expect(probe.name).to.deep.equal(Probes.DbPingProbe.NAME);
                    chai.expect(probe.description).to.deep.equal("A simple ping of the database");
                    chai.expect(probe.value).to.deep.equal("101 ms");
                    chai.expect(probe.status).to.deep.equal("WARNING");
                });
        });

        it("should initialize a DbPingProbe with CRITICAL status", () => {
            const ping = Promise.resolve(2000);
            return ProbeFactory.getDbPingProbe(() => ping)
                .then((probe) => {
                    chai.expect(probe.name).to.deep.equal(Probes.DbPingProbe.NAME);
                    chai.expect(probe.description).to.deep.equal("A simple ping of the database");
                    chai.expect(probe.value).to.deep.equal("2000 ms");
                    chai.expect(probe.status).to.deep.equal("CRITICAL");
                });
        });

        it("should initialize a DbPingProbe with CRITICAL status with custom values", () => {
            const ping = Promise.resolve(4);
            return ProbeFactory.getDbPingProbe(() => ping, 3, 2)
                .then((probe) => {
                    chai.expect(probe.name).to.deep.equal(Probes.DbPingProbe.NAME);
                    chai.expect(probe.description).to.deep.equal("A simple ping of the database");
                    chai.expect(probe.value).to.deep.equal("4 ms");
                    chai.expect(probe.status).to.deep.equal("CRITICAL");
                });
        });
    });

    describe("getGenericProbe", () => {

        it("should initialize a GenericProbe with a OK status when resolving promise", () => {
            const hello = Promise.resolve("Hello");
            return ProbeFactory.getGenericProbe("TestProbe", "This is my unit test of a probe", () => hello)
                .then((probe) => {
                    chai.expect(probe.name).to.deep.equal("TestProbe");
                    chai.expect(probe.value).to.deep.equal("Hello");
                    chai.expect(probe.description).to.deep.equal("This is my unit test of a probe");
                    chai.expect(probe.status).to.deep.equal("OK");
                });
        });
    });

    describe("getGenericProbe", () => {

        it("should initialize a GenericProbe with a CRITICAL status when rejecting promise", () => {
            const error = Promise.reject("An error occured");
            return ProbeFactory.getGenericProbe("TestProbe", "This is my crashing unit test of a probe", () => error)
                .then((probe) => {
                    chai.expect(probe.name).to.deep.equal("TestProbe");
                    chai.expect(probe.value).to.deep.equal("An error occured");
                    chai.expect(probe.description).to.deep.equal("This is my crashing unit test of a probe");
                    chai.expect(probe.status).to.deep.equal("CRITICAL");
                });
        });
    });

});