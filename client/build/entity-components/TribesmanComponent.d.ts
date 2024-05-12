import { ServerComponentType, TribesmanAIType, TribesmanComponentData } from "webgl-test-shared/dist/components";
import { ItemType } from "webgl-test-shared/dist/items";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class TribesmanComponent extends ServerComponent<ServerComponentType.tribesman> {
    readonly name: number;
    readonly untitledDescriptor: number;
    aiType: TribesmanAIType;
    relationsWithPlayer: number;
    craftingProgress: number;
    craftingItemType: ItemType;
    constructor(entity: Entity, data: TribesmanComponentData);
    tick(): void;
    updateFromData(data: TribesmanComponentData): void;
}
export default TribesmanComponent;
