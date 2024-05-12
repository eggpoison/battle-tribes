import Hitbox from "./hitboxes/Hitbox";
import Entity from "./Entity";
export declare function collide(entity: Entity, pushedHitbox: Hitbox, pushingHitbox: Hitbox): void;
export declare function resolveWallTileCollisions(entity: Entity): void;
