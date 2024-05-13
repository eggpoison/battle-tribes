import { BlueprintType, BuildingMaterial, BlueprintComponentData } from "webgl-test-shared/dist/components";
import { EntityType, EntityTypeString } from "webgl-test-shared/dist/entities";
import { Item, ITEM_INFO_RECORD, HammerItemInfo } from "webgl-test-shared/dist/items";
import { assertUnreachable } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import { BlueprintComponentArray, BuildingMaterialComponentArray, HealthComponentArray, HutComponentArray, TribeComponentArray } from "./ComponentArray";
import { DOOR_HEALTHS, createDoor } from "../entities/buildings/door";
import { EMBRASURE_HEALTHS, createEmbrasure } from "../entities/buildings/embrasure";
import { createBallista } from "../entities/buildings/ballista";
import { createSlingTurret } from "../entities/buildings/sling-turret";
import { TUNNEL_HEALTHS, createTunnel } from "../entities/buildings/tunnel";
import Board from "../Board";
import { WALL_HEALTHS } from "../entities/buildings/wall";
import { SPIKE_HEALTHS } from "../entities/buildings/spikes";
import { createWarriorHut } from "../entities/tribes/warrior-hut";
import { createFenceGate } from "../entities/buildings/fence-gate";
import { FenceConnectionComponentArray, addFenceConnection } from "./FenceConnectionComponent";

const STRUCTURE_WORK_REQUIRED: Record<BlueprintType, number> = {
   [BlueprintType.woodenDoor]: 3,
   [BlueprintType.stoneDoor]: 3,
   [BlueprintType.stoneDoorUpgrade]: 3,
   [BlueprintType.woodenEmbrasure]: 5,
   [BlueprintType.stoneEmbrasure]: 5,
   [BlueprintType.stoneEmbrasureUpgrade]: 5,
   [BlueprintType.woodenTunnel]: 3,
   [BlueprintType.stoneTunnel]: 3,
   [BlueprintType.stoneTunnelUpgrade]: 3,
   [BlueprintType.ballista]: 25,
   [BlueprintType.slingTurret]: 10,
   [BlueprintType.stoneWall]: 5,
   [BlueprintType.stoneFloorSpikes]: 3,
   [BlueprintType.stoneWallSpikes]: 3,
   [BlueprintType.warriorHutUpgrade]: 25,
   [BlueprintType.fenceGate]: 3
};

export class BlueprintComponent {
   public readonly blueprintType: BlueprintType;
   public workProgress = 0;
   public associatedEntityID: number;
   public readonly virtualEntityID: number;

   constructor(shapeType: BlueprintType, associatedEntityID: number, virtualEntityID: number) {
      this.blueprintType = shapeType;
      this.associatedEntityID = associatedEntityID;
      this.virtualEntityID = virtualEntityID;
   }
}

const upgradeBuilding = (building: Entity): void => {
   const materialComponent = BuildingMaterialComponentArray.getComponent(building.id);
   if (materialComponent.material < BuildingMaterial.stone) {
      materialComponent.material++;

      let maxHealthArray!: ReadonlyArray<number>;
      switch (building.type) {
         case EntityType.wall: {
            maxHealthArray = WALL_HEALTHS;
            break;
         }
         case EntityType.embrasure: {
            maxHealthArray = EMBRASURE_HEALTHS;
            break;
         }
         case EntityType.tunnel: {
            maxHealthArray = TUNNEL_HEALTHS;
            break;
         }
         case EntityType.door: {
            maxHealthArray = DOOR_HEALTHS;
            break;
         }
         case EntityType.floorSpikes:
         case EntityType.wallSpikes: {
            maxHealthArray = SPIKE_HEALTHS;
            break;
         }
         default: {
            throw new Error("Don't know how to upgrade building of type " + EntityTypeString[building.type]);
         }
      }
      
      const healthComponent = HealthComponentArray.getComponent(building.id);
      healthComponent.maxHealth = maxHealthArray[materialComponent.material];
      healthComponent.health = healthComponent.maxHealth;
   }
}

const completeBlueprint = (blueprintEntity: Entity, blueprintComponent: BlueprintComponent): void => {
   const tribeComponent = TribeComponentArray.getComponent(blueprintEntity.id);
   
   blueprintEntity.destroy();
   
   switch (blueprintComponent.blueprintType) {
      case BlueprintType.woodenDoor: {
         createDoor(blueprintEntity.position.copy(), blueprintEntity.rotation, tribeComponent.tribe, BuildingMaterial.wood);
         return;
      }
      case BlueprintType.stoneDoor: {
         createDoor(blueprintEntity.position.copy(), blueprintEntity.rotation, tribeComponent.tribe, BuildingMaterial.stone);
         return;
      }
      case BlueprintType.woodenEmbrasure: {
         createEmbrasure(blueprintEntity.position.copy(), blueprintEntity.rotation, tribeComponent.tribe, BuildingMaterial.wood);
         return;
      }
      case BlueprintType.stoneEmbrasure: {
         createEmbrasure(blueprintEntity.position.copy(), blueprintEntity.rotation, tribeComponent.tribe, BuildingMaterial.stone);
         return;
      }
      case BlueprintType.ballista: {
         createBallista(blueprintEntity.position.copy(), blueprintEntity.rotation, tribeComponent.tribe);
         return;
      }
      case BlueprintType.slingTurret: {
         createSlingTurret(blueprintEntity.position.copy(), blueprintEntity.rotation, tribeComponent.tribe);
         return;
      }
      case BlueprintType.woodenTunnel: {
         createTunnel(blueprintEntity.position.copy(), blueprintEntity.rotation, tribeComponent.tribe, BuildingMaterial.wood);
         return;
      }
      case BlueprintType.stoneTunnel: {
         createTunnel(blueprintEntity.position.copy(), blueprintEntity.rotation, tribeComponent.tribe, BuildingMaterial.stone);
         return;
      }
      case BlueprintType.fenceGate: {
         const previousFenceConnectionComponent = FenceConnectionComponentArray.getComponent(blueprintComponent.associatedEntityID);
         
         createFenceGate(blueprintEntity.position.copy(), blueprintEntity.rotation, tribeComponent.tribe, previousFenceConnectionComponent.connectedSidesBitset, previousFenceConnectionComponent.connectedEntityIDs);
         
         const fence = Board.entityRecord[blueprintComponent.associatedEntityID]!;
         fence.destroy();
         
         return;
      }
      case BlueprintType.warriorHutUpgrade: {
         const hut = createWarriorHut(blueprintEntity.position.copy(), blueprintEntity.rotation, tribeComponent.tribe)

         // Remove the previous hut
         const previousHut = Board.entityRecord[blueprintComponent.associatedEntityID]!;
         previousHut.destroy();

         // Transfer the worker to the warrior hut
         const hutComponent = HutComponentArray.getComponent(previousHut.id);
         if (hutComponent.hasTribesman) {
            tribeComponent.tribe.instantRespawnTribesman(hut);
         }
         return;
      }
      case BlueprintType.stoneWall:
      case BlueprintType.stoneDoorUpgrade:
      case BlueprintType.stoneEmbrasureUpgrade:
      case BlueprintType.stoneTunnelUpgrade:
      case BlueprintType.stoneFloorSpikes:
      case BlueprintType.stoneWallSpikes: {
         const building = Board.entityRecord[blueprintComponent.associatedEntityID]!;
         upgradeBuilding(building);
         return;
      }
      default: {
         const unreachable: never = blueprintComponent.blueprintType;
         return unreachable;
      }
   }
}

export function doBlueprintWork(blueprintEntity: Entity, hammerItem: Item): void {
   const blueprintComponent = BlueprintComponentArray.getComponent(blueprintEntity.id);
   
   const hammerItemInfo = ITEM_INFO_RECORD[hammerItem.type] as HammerItemInfo;
   blueprintComponent.workProgress += hammerItemInfo.workAmount;
   if (blueprintComponent.workProgress >= STRUCTURE_WORK_REQUIRED[blueprintComponent.blueprintType]) {
      // Construct the building
      completeBlueprint(blueprintEntity, blueprintComponent);
   }
}

export function serialiseBlueprintComponent(blueprintEntity: Entity): BlueprintComponentData {
   const blueprintComponent = BlueprintComponentArray.getComponent(blueprintEntity.id);
   return {
      blueprintType: blueprintComponent.blueprintType,
      buildProgress: blueprintComponent.workProgress / STRUCTURE_WORK_REQUIRED[blueprintComponent.blueprintType],
      associatedEntityID: blueprintComponent.associatedEntityID
   };
}