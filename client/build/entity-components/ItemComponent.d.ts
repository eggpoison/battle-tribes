import { ItemComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { ItemType } from "webgl-test-shared/dist/items";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class ItemComponent extends ServerComponent<ServerComponentType.item> {
    readonly itemType: ItemType;
    constructor(entity: Entity, data: ItemComponentData);
    tick(): void;
    updateFromData(_data: ItemComponentData): void;
}
export default ItemComponent;
