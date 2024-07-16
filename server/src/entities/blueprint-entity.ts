import { COLLISION_BITS } from "webgl-test-shared/dist/collision";
import { BlueprintType, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StructureType } from "webgl-test-shared/dist/structures";
import { Point } from "webgl-test-shared/dist/utils";
import { ComponentConfig } from "../components";
   
type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.blueprint
   | ServerComponentType.tribe;

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

export function createBlueprintEntityConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.plant,
         collisionBit: COLLISION_BITS.none,
         collisionMask: 0,
         hitboxes: []
      },
      [ServerComponentType.health]: {
         maxHealth: 5
      },
      [ServerComponentType.blueprint]: {
         blueprintType: BlueprintType.stoneDoor,
         associatedEntityID: 0,
      },
      [ServerComponentType.tribe]: {
         tribe: null,
         tribeType: 0
      }
   };
}