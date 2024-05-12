import { EntityDebugData } from "webgl-test-shared/dist/client-server-types";
export declare function createDebugDataShaders(): void;
/** Renders all hitboxes of a specified set of entities */
export declare function renderLineDebugData(debugData: EntityDebugData): void;
export declare function renderTriangleDebugData(debugData: EntityDebugData): void;
