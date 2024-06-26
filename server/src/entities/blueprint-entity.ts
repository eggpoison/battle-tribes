import { COLLISION_BITS } from "webgl-test-shared/dist/collision";
import { BlueprintType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StructureType } from "webgl-test-shared/dist/structures";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import { HealthComponent, HealthComponentArray } from "../components/HealthComponent";
import { BlueprintComponent, BlueprintComponentArray } from "../components/BlueprintComponent";
import { TribeComponent, TribeComponentArray } from "../components/TribeComponent";
import Tribe from "../Tribe";
import { createEntityHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";

// @Incomplete: Remove if the associated entity is removed

export function getBlueprintEntityType(blueprintType: BlueprintType): StructureType {
   switch (blueprintType) {
      case BlueprintType.woodenTunnel:
      case BlueprintType.stoneTunnel:
      case BlueprintType.stoneTunnelUpgrade: return EntityType.tunnel;
      case BlueprintType.woodenEmbrasure:
      case BlueprintType.stoneEmbrasure:
      case BlueprintType.stoneEmbrasureUpgrade: return EntityType.embrasure;
      case BlueprintType.woodenDoor:
      case BlueprintType.stoneDoor:
      case BlueprintType.stoneDoorUpgrade: return EntityType.door;
      case BlueprintType.ballista: return EntityType.ballista;
      case BlueprintType.slingTurret: return EntityType.slingTurret;
      case BlueprintType.stoneWall: return EntityType.wall;
      case BlueprintType.stoneFloorSpikes: return EntityType.floorSpikes;
      case BlueprintType.stoneWallSpikes: return EntityType.wallSpikes;
      case BlueprintType.warriorHutUpgrade: return EntityType.warriorHut;
      case BlueprintType.fenceGate: return EntityType.fenceGate;
   }
}

export function createBlueprintEntity(position: Point, rotation: number, blueprintType: BlueprintType, associatedEntityID: number, tribe: Tribe): Entity {
   const blueprintEntity = new Entity(position, rotation, EntityType.blueprintEntity, COLLISION_BITS.none, 0);

   const entityType = getBlueprintEntityType(blueprintType);
   const hitboxes = createEntityHitboxes(entityType);
   for (let i = 0; i < hitboxes.length; i++) {
      blueprintEntity.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(blueprintEntity.id, new HealthComponent(5));
   BlueprintComponentArray.addComponent(blueprintEntity.id, new BlueprintComponent(blueprintType, associatedEntityID, tribe.virtualEntityIDCounter));
   TribeComponentArray.addComponent(blueprintEntity.id, new TribeComponent(tribe));

   tribe.virtualEntityIDCounter++;
   
   return blueprintEntity;
}