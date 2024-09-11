import { BlueprintType, BuildingMaterial, ServerComponentType } from "battletribes-shared/components";
import { EntityID } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import Board from "../Board";
import { placeVirtualBuilding } from "../ai-tribe-building/ai-building";
import { getBlueprintEntityType } from "../entities/blueprint-entity";
import { StructureComponentArray } from "./StructureComponent";
import { calculateStructureConnectionInfo } from "battletribes-shared/structures";
import { HealthComponentArray } from "./HealthComponent";
import { TribeComponentArray } from "./TribeComponent";
import { BuildingMaterialComponentArray, getStructureHealth } from "./BuildingMaterialComponent";
import { HutComponentArray } from "./HutComponent";
import { Item, ITEM_INFO_RECORD, HammerItemInfo } from "battletribes-shared/items/items";
import { TransformComponentArray } from "./TransformComponent";
import { ComponentConfig } from "../components";
import { createDoorConfig } from "../entities/structures/door";
import { createEntityFromConfig } from "../Entity";
import { createEmbrasureConfig } from "../entities/structures/embrasure";
import { createBallistaConfig } from "../entities/structures/ballista";
import { createSlingTurretConfig } from "../entities/structures/sling-turret";
import { createTunnelConfig } from "../entities/structures/tunnel";
import { createFenceGateConfig } from "../entities/structures/fence-gate";
import { createWarriorHutConfig } from "../entities/structures/warrior-hut";
import { Packet } from "battletribes-shared/packets";
import { createEntityHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";

export interface BlueprintComponentParams {
   blueprintType: BlueprintType;
   associatedEntityID: EntityID;
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

export const BlueprintComponentArray = new ComponentArray<BlueprintComponent>(ServerComponentType.blueprint, true, {
   onInitialise: onInitialise,
   onJoin: onJoin,
   onRemove: onRemove,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
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
      structureComponent.activeBlueprint = entityID;
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

      const health = getStructureHealth(Board.getEntityType(building)!, materialComponent.material);
      
      const healthComponent = HealthComponentArray.getComponent(building);
      healthComponent.maxHealth = health;
      healthComponent.health = health;
   }
}

const completeBlueprint = (blueprintEntity: EntityID, blueprintComponent: BlueprintComponent): void => {
   const transformComponent = TransformComponentArray.getComponent(blueprintEntity);
   const tribeComponent = TribeComponentArray.getComponent(blueprintEntity);
   
   Board.destroyEntity(blueprintEntity);

   const entityType = getBlueprintEntityType(blueprintComponent.blueprintType);
   const position = transformComponent.position.copy();
   const connectionInfo = calculateStructureConnectionInfo(position, transformComponent.rotation, entityType, Board.getWorldInfo());
   
   // @Copynpaste
   switch (blueprintComponent.blueprintType) {
      case BlueprintType.woodenDoor: {
         const config = createDoorConfig();
         config[ServerComponentType.transform].position.x = transformComponent.position.x;
         config[ServerComponentType.transform].position.y = transformComponent.position.y;
         config[ServerComponentType.transform].rotation = transformComponent.rotation;
         config[ServerComponentType.tribe].tribe = tribeComponent.tribe;
         config[ServerComponentType.structure].connectionInfo = connectionInfo;
         config[ServerComponentType.buildingMaterial].material = BuildingMaterial.wood;
         createEntityFromConfig(config);
         return;
      }
      case BlueprintType.stoneDoor: {
         const config = createDoorConfig();
         config[ServerComponentType.transform].position.x = transformComponent.position.x;
         config[ServerComponentType.transform].position.y = transformComponent.position.y;
         config[ServerComponentType.transform].rotation = transformComponent.rotation;
         config[ServerComponentType.tribe].tribe = tribeComponent.tribe;
         config[ServerComponentType.structure].connectionInfo = connectionInfo;
         config[ServerComponentType.buildingMaterial].material = BuildingMaterial.stone;
         createEntityFromConfig(config);
         return;
      }
      case BlueprintType.woodenEmbrasure: {
         const config = createEmbrasureConfig();
         config[ServerComponentType.transform].position.x = transformComponent.position.x;
         config[ServerComponentType.transform].position.y = transformComponent.position.y;
         config[ServerComponentType.transform].rotation = transformComponent.rotation;
         config[ServerComponentType.tribe].tribe = tribeComponent.tribe;
         config[ServerComponentType.structure].connectionInfo = connectionInfo;
         config[ServerComponentType.buildingMaterial].material = BuildingMaterial.wood;
         createEntityFromConfig(config);
         return;
      }
      case BlueprintType.stoneEmbrasure: {
         const config = createEmbrasureConfig();
         config[ServerComponentType.transform].position.x = transformComponent.position.x;
         config[ServerComponentType.transform].position.y = transformComponent.position.y;
         config[ServerComponentType.transform].rotation = transformComponent.rotation;
         config[ServerComponentType.tribe].tribe = tribeComponent.tribe;
         config[ServerComponentType.structure].connectionInfo = connectionInfo;
         config[ServerComponentType.buildingMaterial].material = BuildingMaterial.stone;
         createEntityFromConfig(config);
         return;
      }
      case BlueprintType.ballista: {
         const config = createBallistaConfig();
         config[ServerComponentType.transform].position.x = transformComponent.position.x;
         config[ServerComponentType.transform].position.y = transformComponent.position.y;
         config[ServerComponentType.transform].rotation = transformComponent.rotation;
         config[ServerComponentType.tribe].tribe = tribeComponent.tribe;
         config[ServerComponentType.structure].connectionInfo = connectionInfo;
         createEntityFromConfig(config);
         return;
      }
      case BlueprintType.slingTurret: {
         const config = createSlingTurretConfig();
         config[ServerComponentType.transform].position.x = transformComponent.position.x;
         config[ServerComponentType.transform].position.y = transformComponent.position.y;
         config[ServerComponentType.transform].rotation = transformComponent.rotation;
         config[ServerComponentType.tribe].tribe = tribeComponent.tribe;
         config[ServerComponentType.structure].connectionInfo = connectionInfo;
         createEntityFromConfig(config);
         return;
      }
      case BlueprintType.woodenTunnel: {
         const config = createTunnelConfig();
         config[ServerComponentType.transform].position.x = transformComponent.position.x;
         config[ServerComponentType.transform].position.y = transformComponent.position.y;
         config[ServerComponentType.transform].rotation = transformComponent.rotation;
         config[ServerComponentType.tribe].tribe = tribeComponent.tribe;
         config[ServerComponentType.structure].connectionInfo = connectionInfo;
         config[ServerComponentType.buildingMaterial].material = BuildingMaterial.wood;
         createEntityFromConfig(config);
         return;
      }
      case BlueprintType.stoneTunnel: {
         const config = createTunnelConfig();
         config[ServerComponentType.transform].position.x = transformComponent.position.x;
         config[ServerComponentType.transform].position.y = transformComponent.position.y;
         config[ServerComponentType.transform].rotation = transformComponent.rotation;
         config[ServerComponentType.tribe].tribe = tribeComponent.tribe;
         config[ServerComponentType.structure].connectionInfo = connectionInfo;
         config[ServerComponentType.buildingMaterial].material = BuildingMaterial.stone;
         createEntityFromConfig(config);
         return;
      }
      case BlueprintType.fenceGate: {
         const config = createFenceGateConfig();
         config[ServerComponentType.transform].position.x = transformComponent.position.x;
         config[ServerComponentType.transform].position.y = transformComponent.position.y;
         config[ServerComponentType.transform].rotation = transformComponent.rotation;
         config[ServerComponentType.tribe].tribe = tribeComponent.tribe;
         config[ServerComponentType.structure].connectionInfo = connectionInfo;
         // @Incomplete
         // config[ServerComponentType.buildingMaterial].material = BuildingMaterial.stone;
         createEntityFromConfig(config);

         Board.destroyEntity(blueprintComponent.associatedEntityID);
         
         return;
      }
      case BlueprintType.warriorHutUpgrade: {
         const config = createWarriorHutConfig();
         config[ServerComponentType.transform].position.x = transformComponent.position.x;
         config[ServerComponentType.transform].position.y = transformComponent.position.y;
         config[ServerComponentType.transform].rotation = transformComponent.rotation;
         config[ServerComponentType.tribe].tribe = tribeComponent.tribe;
         config[ServerComponentType.structure].connectionInfo = connectionInfo;
         const hut = createEntityFromConfig(config);

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

function getDataLength(): number {
   return 4 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const blueprintComponent = BlueprintComponentArray.getComponent(entity);

   packet.addNumber(blueprintComponent.blueprintType);
   packet.addNumber(blueprintComponent.workProgress / STRUCTURE_WORK_REQUIRED[blueprintComponent.blueprintType]);
   packet.addNumber(blueprintComponent.associatedEntityID);
}