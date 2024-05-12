import Entity from "../Entity";
import Component from "./Component";
declare class EquipmentComponent extends Component {
    private armourRenderPart;
    private gloveRenderParts;
    hasFrostShield: boolean;
    constructor(entity: Entity);
    tick(): void;
    /** Updates the current armour render part based on the entity's inventory component */
    updateArmourRenderPart(): void;
    private updateGloveRenderParts;
    createFrostShieldBreakParticles(): void;
}
export default EquipmentComponent;
