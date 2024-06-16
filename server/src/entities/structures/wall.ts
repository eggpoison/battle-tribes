import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { BuildingMaterial } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Tribe from "../../Tribe";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { BuildingMaterialComponent, BuildingMaterialComponentArray } from "../../components/BuildingMaterialComponent";
import { StructureComponent, StructureComponentArray } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { Hitbox, RectangularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";

const SIZE = 64 - 0.05;

export const WALL_HEALTHS = [25, 75];

export function createWallHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(1, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, SIZE, SIZE, 0));
   return hitboxes;
}

export function createWall(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const wall = new Entity(position, rotation, EntityType.wall, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createWallHitboxes(wall.getNextHitboxLocalID());
   for (let i = 0; i < hitboxes.length; i++) {
      wall.addHitbox(hitboxes[i]);
   }

   const material = BuildingMaterial.wood;
   
   HealthComponentArray.addComponent(wall.id, new HealthComponent(WALL_HEALTHS[material]));
   StatusEffectComponentArray.addComponent(wall.id, new StatusEffectComponent(StatusEffect.bleeding));
   StructureComponentArray.addComponent(wall.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(wall.id, new TribeComponent(tribe));
   BuildingMaterialComponentArray.addComponent(wall.id, new BuildingMaterialComponent(material));

   return wall;
}