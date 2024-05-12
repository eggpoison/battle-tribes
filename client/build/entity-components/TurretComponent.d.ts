import { ServerComponentType, TurretComponentData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import ServerComponent from "./ServerComponent";
import RenderPart from "../render-parts/RenderPart";
declare class TurretComponent extends ServerComponent<ServerComponentType.turret> {
    /** The render part which changes texture as the turret charges */
    private readonly aimingRenderPart;
    /** The render part which pivots as the turret aims */
    private readonly pivotingRenderPart;
    private readonly gearRenderParts;
    private projectileRenderPart;
    private chargeProgress;
    constructor(entity: Entity, data: TurretComponentData, aimingRenderPart: RenderPart, pivotingRenderPart: RenderPart, gearRenderParts: ReadonlyArray<RenderPart>);
    private updateAimDirection;
    private updateProjectileRenderPart;
    updateFromData(data: TurretComponentData): void;
}
export default TurretComponent;
