import { ResearchBenchComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class ResearchBenchComponent extends ServerComponent<ServerComponentType.researchBench> {
    isOccupied: boolean;
    constructor(entity: Entity, data: ResearchBenchComponentData);
    tick(): void;
    updateFromData(data: ResearchBenchComponentData): void;
}
export default ResearchBenchComponent;
