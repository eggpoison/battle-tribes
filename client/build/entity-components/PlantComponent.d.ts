import { PlantComponentData, PlanterBoxPlant, ServerComponentType } from "webgl-test-shared/dist/components";
import { ItemType } from "webgl-test-shared/dist/items";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
export declare const SEED_TO_PLANT_RECORD: Partial<Record<ItemType, PlanterBoxPlant>>;
declare class PlantComponent extends ServerComponent<ServerComponentType.plant> {
    readonly plant: PlanterBoxPlant;
    growthProgress: number;
    private plantRenderPart;
    constructor(entity: Entity, data: PlantComponentData);
    private updatePlantRenderPart;
    updateFromData(data: PlantComponentData): void;
}
export default PlantComponent;
