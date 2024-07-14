import { BlueprintType, BuildingMaterial, BlueprintComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID, EntityType, EntityTypeString } from "webgl-test-shared/dist/entities";
import { ComponentArray } from "./ComponentArray";
import { DOOR_HEALTHS, createDoor } from "../entities/structures/door";
import { EMBRASURE_HEALTHS, createEmbrasure } from "../entities/structures/embrasure";
import { createSlingTurret } from "../entities/structures/sling-turret";
import { TUNNEL_HEALTHS, createTunnel } from "../entities/structures/tunnel";
import Board from "../Board";
import { WALL_HEALTHS } from "../entities/structures/wall";
import { SPIKE_HEALTHS } from "../entities/structures/spikes";
import { createWarriorHut } from "../entities/structures/warrior-hut";
import { createFenceGate } from "../entities/structures/fence-gate";
import { placeVirtualBuilding } from "../ai-tribe-building/ai-building";
import { getBlueprintEntityType } from "../entities/blueprint-entity";
import { StructureComponentArray } from "./StructureComponent";
import { calculateStructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { HealthComponentArray } from "./HealthComponent";
import { TribeComponentArray } from "./TribeComponent";
import { BuildingMaterialComponentArray } from "./BuildingMaterialComponent";
import { HutComponentArray } from "./HutComponent";
import { Item, ITEM_INFO_RECORD, HammerItemInfo } from "webgl-test-shared/dist/items/items";
import { TransformComponentArray } from "./TransformComponent";
import { ComponentConfig } from "../components";
import { createEntityHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";

export interface BlueprintComponentParams {
   blueprintType: BlueprintType;
   readonly associatedEntityID: EntityID;
}

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
   public associatedEntityID: EntityID;
   public readonly virtualEntityID: EntityID = 0;

   constructor(params: BlueprintComponentParams) {
      this.blueprintType = params.blueprintType;
      this.associatedEntityID = params.associatedEntityID;
   }
}

export const BlueprintComponentArray = new ComponentArray<ServerComponentType.blueprint, BlueprintComponent>(true, {
   onInitialise: onInitialise,
   onJoin: onJoin,
   onRemove: onRemove,
   serialise: serialise
});

function onInitialise(config: ComponentConfig<ServerComponentType.transform | ServerComponentType.blueprint>): void {
   const blueprintType = config[ServerComponentType.blueprint].blueprintType;

   const entityType = getBlueprintEntityType(blueprintType);
   config[ServerComponentType.transform].hitboxes = createEntityHitboxes(entityType);
}

function onJoin(entityID: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entityID);
   const tribeComponent = TribeComponentArray.getComponent(entityID);
   const blueprintComponent = BlueprintComponentArray.getComponent(entityID);

   const virtualEntityID = tribeComponent.tribe.virtualEntityIDCounter++;

   const entityType = getBlueprintEntityType(blueprintComponent.blueprintType);
   placeVirtualBuilding(tribeComponent.tribe, transformComponent.position, transformComponent.rotation, entityType, virtualEntityID);
   tribeComponent.tribe.buildingsAreDirty = true;

   if (StructureComponentArray.hasComponent(blueprintComponent.associatedEntityID)) {
      const structureComponent = StructureComponentArray.getComponent(blueprintComponent.associatedEntityID);
      structureComponent.activeBlueprintID = entityID;
   }
}

function onRemove(entityID: EntityID): void {
   const tribeComponent = TribeComponentArray.getComponent(entityID);
   const blueprintComponent = BlueprintComponentArray.getComponent(entityID);
   tribeComponent.tribe.removeVirtualBuilding(blueprintComponent.virtualEntityID);
}

const upgradeBuilding = (building: EntityID): void => {
   const materialComponent = BuildingMaterialComponentArray.getComponent(building);
   if (materialComponent.material < BuildingMaterial.stone) {
      materialComponent.material++;

      let maxHealthArray!: ReadonlyArray<number>;
      const entityType = Board.getEntityType(building)!;
      switch (entityType) {
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
            throw new Error("Don't know how to upgrade building of type " + EntityTypeString[entityType]);
         }
      }
      
      const healthComponent = HealthComponentArray.getComponent(building);
      healthComponent.maxHealth = maxHealthArray[materialComponent.material];
      healthComponent.health = healthComponent.maxHealth;
   }
}

const completeBlueprint = (blueprintEntity: EntityID, blueprintComponent: BlueprintComponent): void => {
   const transformComponent = TransformComponentArray.getComponent(blueprintEntity);
   const tribeComponent = TribeComponentArray.getComponent(blueprintEntity);
   
   Board.destroyEntity(blueprintEntity);

   const entityType = getBlueprintEntityType(blueprintComponent.blueprintType);
   const position = transformComponent.position.copy();
   const connectionInfo = calculateStructureConnectionInfo(position, transformComponent.rotation, entityType, Board.chunks);
   
   // @Cleanup: a lot of copy and paste
   switch (blueprintComponent.blueprintType) {
      case BlueprintType.woodenDoor: {
         createDoor(transformComponent.position.copy(), transformComponent.rotation, tribeComponent.tribe, connectionInfo, BuildingMaterial.wood);
         return;
      }
      case BlueprintType.stoneDoor: {
         createDoor(transformComponent.position.copy(), transformComponent.rotation, tribeComponent.tribe, connectionInfo, BuildingMaterial.stone);
         return;
      }
      case BlueprintType.woodenEmbrasure: {
         createEmbrasure(transformComponent.position.copy(), transformComponent.rotation, tribeComponent.tribe, connectionInfo, BuildingMaterial.wood);
         return;
      }
      case BlueprintType.stoneEmbrasure: {
         createEmbrasure(transformComponent.position.copy(), transformComponent.rotation, tribeComponent.tribe, connectionInfo, BuildingMaterial.stone);
         return;
      }
      case BlueprintType.ballista: {
         createBallista(transformComponent.position.copy(), transformComponent.rotation, tribeComponent.tribe, connectionInfo);
         return;
      }
      case BlueprintType.slingTurret: {
         createSlingTurret(transformComponent.position.copy(), transformComponent.rotation, tribeComponent.tribe, connectionInfo);
         return;
      }
      case BlueprintType.woodenTunnel: {
         createTunnel(transformComponent.position.copy(), transformComponent.rotation, tribeComponent.tribe, connectionInfo, BuildingMaterial.wood);
         return;
      }
      case BlueprintType.stoneTunnel: {
         createTunnel(transformComponent.position.copy(), transformComponent.rotation, tribeComponent.tribe, connectionInfo, BuildingMaterial.stone);
         return;
      }
      case BlueprintType.fenceGate: {
         createFenceGate(transformComponent.position.copy(), transformComponent.rotation, tribeComponent.tribe, connectionInfo);
         
         Board.destroyEntity(blueprintComponent.associatedEntityID);
         
         return;
      }
      case BlueprintType.warriorHutUpgrade: {
         const hut = createWarriorHut(transformComponent.position.copy(), transformComponent.rotation, tribeComponent.tribe, connectionInfo);

         // Remove the previous hut
         Board.destroyEntity(blueprintComponent.associatedEntityID);

         // @Cleanup @Incomplete: should this be done here? Probably should be done on join.
         // Transfer the worker to the warrior hut
         const hutComponent = HutComponentArray.getComponent(blueprintComponent.associatedEntityID);
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
         upgradeBuilding(blueprintComponent.associatedEntityID);
         return;
      }
      default: {
         const unreachable: never = blueprintComponent.blueprintType;
         return unreachable;
      }
   }
}

export function doBlueprintWork(blueprintEntity: EntityID, hammerItem: Item): void {
   const blueprintComponent = BlueprintComponentArray.getComponent(blueprintEntity);
   
   const hammerItemInfo = ITEM_INFO_RECORD[hammerItem.type] as HammerItemInfo;
   blueprintComponent.workProgress += hammerItemInfo.workAmount;
   if (blueprintComponent.workProgress >= STRUCTURE_WORK_REQUIRED[blueprintComponent.blueprintType]) {
      // Construct the building
      completeBlueprint(blueprintEntity, blueprintComponent);
   }
}

function serialise(entityID: number): BlueprintComponentData {
   const blueprintComponent = BlueprintComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.blueprint,
      blueprintType: blueprintComponent.blueprintType,
      buildProgress: blueprintComponent.workProgress / STRUCTURE_WORK_REQUIRED[blueprintComponent.blueprintType],
      associatedEntityID: blueprintComponent.associatedEntityID
   };
}