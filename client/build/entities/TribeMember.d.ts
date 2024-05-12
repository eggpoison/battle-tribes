import { EntityType } from "webgl-test-shared/dist/entities";
import { EntityData, HitData } from "webgl-test-shared/dist/client-server-types";
import Entity from "../Entity";
export declare const TRIBE_MEMBER_Z_INDEXES: Record<string, number>;
export declare function getSecondsSinceLastAction(lastActionTicks: number): number;
export declare function addTribeMemberRenderParts(tribesman: Entity): void;
declare abstract class TribeMember extends Entity {
    private static readonly BLOOD_FOUNTAIN_INTERVAL;
    private lowHealthMarker;
    protected onHit(hitData: HitData): void;
    onDie(): void;
    protected overrideTileMoveSpeedMultiplier(): number | null;
    private updateLowHealthMarker;
    updateFromData(data: EntityData<EntityType>): void;
}
export default TribeMember;
