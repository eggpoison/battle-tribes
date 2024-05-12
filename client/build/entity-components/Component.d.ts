import Entity from "../Entity";
declare abstract class Component {
    readonly entity: Entity;
    constructor(entity: Entity);
    tick?(): void;
    update?(): void;
    /** Called once when the entity is created, just after all the components are added */
    onLoad?(): void;
    onHit?(isDamagingHit: boolean): void;
    onDie?(): void;
    onRemove?(): void;
}
export default Component;
