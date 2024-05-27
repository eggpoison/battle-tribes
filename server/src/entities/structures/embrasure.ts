import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { BuildingMaterial } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Tribe from "../../Tribe";
import Entity from "../../Entity";
import { ArrowComponentArray, BuildingMaterialComponentArray, HealthComponentArray, TribeComponentArray } from "../../components/ComponentArray";
import { HealthComponent } from "../../components/HealthComponent";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { TribeComponent } from "../../components/TribeComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent";
import { StructureComponentArray, StructureComponent } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { Hitbox } from "../../hitboxes/hitboxes";

const VERTICAL_HITBOX_WIDTH = 12 - 0.05;
const VERTICAL_HITBOX_HEIGHT = 20 - 0.05;

const HORIZONTAL_HITBOX_WIDTH = 24 - 0.05;
const HORIZONTAL_HITBOX_HEIGHT = 16 - 0.05;

export const EMBRASURE_HEALTHS = [15, 45];

export function createEmbrasureHitboxes(parentPosition: Point, localID: number, parentRotation: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   
   // Add the two vertical hitboxes (can stop arrows)
   hitboxes.push(new RectangularHitbox(parentPosition, 0.4, -(64 - VERTICAL_HITBOX_WIDTH) / 2 + 0.025, 0, HitboxCollisionType.hard, localID, parentRotation, VERTICAL_HITBOX_WIDTH, VERTICAL_HITBOX_HEIGHT, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));
   hitboxes.push(new RectangularHitbox(parentPosition, 0.4, (64 - VERTICAL_HITBOX_WIDTH) / 2 - 0.025, 0, HitboxCollisionType.hard, localID, parentRotation, VERTICAL_HITBOX_WIDTH, VERTICAL_HITBOX_HEIGHT, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));

   // Add the two horizontal hitboxes (cannot stop arrows)
   hitboxes.push(new RectangularHitbox(parentPosition, 0.4, -(64 - HORIZONTAL_HITBOX_WIDTH) / 2 + 0.025, 0, HitboxCollisionType.hard, localID, parentRotation, HORIZONTAL_HITBOX_WIDTH, HORIZONTAL_HITBOX_HEIGHT, 0, HitboxCollisionBit.ARROW_PASSABLE, DEFAULT_HITBOX_COLLISION_MASK));
   hitboxes.push(new RectangularHitbox(parentPosition, 0.4, (64 - HORIZONTAL_HITBOX_WIDTH) / 2 + 0.025, 0, HitboxCollisionType.hard, localID, parentRotation, HORIZONTAL_HITBOX_WIDTH, HORIZONTAL_HITBOX_HEIGHT, 0, HitboxCollisionBit.ARROW_PASSABLE, DEFAULT_HITBOX_COLLISION_MASK));

   return hitboxes;
}

export function createEmbrasure(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo, material: BuildingMaterial): Entity {
   const embrasure = new Entity(position, rotation, EntityType.embrasure, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createEmbrasureHitboxes(position, embrasure.getNextHitboxLocalID(), rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      embrasure.addHitbox(hitboxes[i]);
   }
   
   HealthComponentArray.addComponent(embrasure.id, new HealthComponent(EMBRASURE_HEALTHS[material]));
   StatusEffectComponentArray.addComponent(embrasure.id, new StatusEffectComponent(StatusEffect.bleeding));
   StructureComponentArray.addComponent(embrasure.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(embrasure.id, new TribeComponent(tribe));
   BuildingMaterialComponentArray.addComponent(embrasure.id, new BuildingMaterialComponent(material));

   return embrasure;
}

export function onEmbrasureCollision(collidingEntity: Entity, pushedHitboxIdx: number): void {
   if (collidingEntity.type === EntityType.woodenArrowProjectile) {
      const arrowComponent = ArrowComponentArray.getComponent(collidingEntity.id);
      if (arrowComponent.ignoreFriendlyBuildings) {
         return;
      }

      if (pushedHitboxIdx <= 1) {
         collidingEntity.destroy();
      }
   }
}