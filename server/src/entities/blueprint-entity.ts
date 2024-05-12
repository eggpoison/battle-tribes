import { COLLISION_BITS } from "webgl-test-shared/dist/collision-detection";
import { BlueprintType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StructureType } from "webgl-test-shared/dist/structures";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import { BlueprintComponentArray, HealthComponentArray, TribeComponentArray } from "../components/ComponentArray";
import { HealthComponent } from "../components/HealthComponent";
import { BlueprintComponent } from "../components/BlueprintComponent";
import { TribeComponent } from "../components/TribeComponent";
import Tribe from "../Tribe";
import { placeVirtualBuilding } from "../ai-tribe-building/ai-building";
import { createBuildingHitboxes } from "../buildings";

// @Incomplete: Remove if the associated entity is removed

const getBlueprintEntityType = (blueprintType: BlueprintType): StructureType => {
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
   const blueprintEntity = new Entity(position, EntityType.blueprintEntity, COLLISION_BITS.none, 0);
   blueprintEntity.rotation = rotation;

   const entityType = getBlueprintEntityType(blueprintType);
   const hitboxes = createBuildingHitboxes(entityType, position.x, position.y, blueprintEntity.getNextHitboxLocalID(), rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      blueprintEntity.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(blueprintEntity.id, new HealthComponent(5));
   BlueprintComponentArray.addComponent(blueprintEntity.id, new BlueprintComponent(blueprintType, associatedEntityID, tribe.virtualEntityIDCounter));
   TribeComponentArray.addComponent(blueprintEntity.id, new TribeComponent(tribe));

   tribe.virtualEntityIDCounter++;
   
   return blueprintEntity;
}

export function onBlueprintEntityJoin(blueprintEntity: Entity): void {
   const tribeComponent = TribeComponentArray.getComponent(blueprintEntity.id);
   const blueprintComponent = BlueprintComponentArray.getComponent(blueprintEntity.id);

   const entityType = getBlueprintEntityType(blueprintComponent.blueprintType);
   placeVirtualBuilding(tribeComponent.tribe, blueprintEntity.position.x, blueprintEntity.position.y, blueprintEntity.rotation, entityType, blueprintComponent.virtualEntityID);
   tribeComponent.tribe.buildingsAreDirty = true;
}

export function onBlueprintEntityRemove(blueprintEntity: Entity): void {
   const tribeComponent = TribeComponentArray.getComponent(blueprintEntity.id);
   const blueprintComponent = BlueprintComponentArray.getComponent(blueprintEntity.id);
   tribeComponent.tribe.removeVirtualBuilding(blueprintComponent.virtualEntityID);
}