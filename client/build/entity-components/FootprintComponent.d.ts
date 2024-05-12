import Component from "./Component";
import Entity from "../Entity";
export declare class FootprintComponent extends Component {
    private readonly footstepParticleIntervalSeconds;
    private readonly footstepOffset;
    private readonly footstepSize;
    private readonly footstepLifetime;
    private readonly footstepSoundIntervalDist;
    constructor(entity: Entity, footstepParticleIntervalSeconds: number, footstepOffset: number, footstepSize: number, footstepLifetime: number, footstepSoundIntervalDist: number);
    private numFootstepsTaken;
    private distanceTracker;
    tick(): void;
    private createFootstepSound;
}
export default FootprintComponent;
