import { AmmoBoxComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { BallistaAmmoType } from "webgl-test-shared/dist/items";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class AmmoBoxComponent extends ServerComponent<ServerComponentType.ammoBox> {
    ammoType: BallistaAmmoType | null;
    ammoRemaining: number;
    private ammoWarningRenderPart;
    constructor(entity: Entity, data: AmmoBoxComponentData);
    private updateAmmoType;
    updateFromData(data: AmmoBoxComponentData): void;
}
export default AmmoBoxComponent;
