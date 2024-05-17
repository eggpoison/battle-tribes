import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { BuildingMaterial } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Tribe from "../../Tribe";
import Entity from "../../Entity";
import { BlueprintComponentArray, BuildingMaterialComponentArray, HealthComponentArray, TribeComponentArray } from "../../components/ComponentArray";
import { HealthComponent } from "../../components/HealthComponent";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { TribeComponent } from "../../components/TribeComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent";
import Board from "../../Board";
import CircularHitbox from "../../hitboxes/CircularHitbox";

const SIZE = 64 - 0.05;

export const WALL_HEALTHS = [25, 75];

export function createWallHitboxes(parentX: number, parentY: number, localID: number, parentRotation: number): ReadonlyArray<RectangularHitbox | CircularHitbox> {
   const hitboxes = new Array<RectangularHitbox | CircularHitbox>();
   hitboxes.push(new RectangularHitbox(parentX, parentY, 1, 0, 0, HitboxCollisionType.hard, localID, parentRotation, SIZE, SIZE, 0));
   return hitboxes;
}

export function createWall(position: Point, rotation: number, tribe: Tribe): Entity {
   const wall = new Entity(position, rotation, EntityType.wall, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createWallHitboxes(wall.position.x, wall.position.y, wall.getNextHitboxLocalID(), wall.rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      wall.addHitbox(hitboxes[i]);
   }

   const material = BuildingMaterial.wood;
   
   HealthComponentArray.addComponent(wall.id, new HealthComponent(WALL_HEALTHS[material]));
   StatusEffectComponentArray.addComponent(wall.id, new StatusEffectComponent(StatusEffect.bleeding));
   TribeComponentArray.addComponent(wall.id, new TribeComponent(tribe));
   BuildingMaterialComponentArray.addComponent(wall.id, new BuildingMaterialComponent(material));

   return wall;
}

export function onWallRemove(wall: Entity): void {
   // Check if the wall has a corresponding blueprint
   const ontopEntities = Board.getEntitiesAtPosition(wall.position.x, wall.position.y);
   for (let i = 0; i < ontopEntities.length; i++) {
      const entity = ontopEntities[i];

      if (entity.type === EntityType.blueprintEntity) {
         const blueprintComponent = BlueprintComponentArray.getComponent(entity.id);
         if (blueprintComponent.associatedEntityID === wall.id) {
            entity.destroy();
            break;
         }
      }
   }
}