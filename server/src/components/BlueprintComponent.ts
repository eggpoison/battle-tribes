import { HitboxTag } from "../../../shared/dist/boxes.js";
import { BlueprintType, ServerComponentType, BuildingMaterial } from "../../../shared/dist/components.js";
import { Entity } from "../../../shared/dist/entities.js";
import { HammerItemType, ITEM_INFO_RECORD } from "../../../shared/dist/items/items.js";
import { Packet } from "../../../shared/dist/packets.js";
import { Point } from "../../../shared/dist/utils.js";
import { Bytes } from "../../../shared/dist/constants.js";
import { ComponentArray } from "./ComponentArray.js";
import { getBlueprintEntityType } from "../entities/blueprint-entity.js";
import { StructureComponentArray } from "./StructureComponent.js";
import { TribeComponentArray } from "./TribeComponent.js";
import { BuildingMaterialComponentArray, upgradeMaterial } from "./BuildingMaterialComponent.js";
import { HutComponentArray } from "./HutComponent.js";
import { getHitboxesByTag, TransformComponentArray } from "./TransformComponent.js";
import { createDoorConfig } from "../entities/structures/door.js";
import { createEmbrasureConfig } from "../entities/structures/embrasure.js";
import { createBallistaConfig } from "../entities/structures/ballista.js";
import { createSlingTurretConfig } from "../entities/structures/sling-turret.js";
import { createTunnelConfig } from "../entities/structures/tunnel.js";
import { createFenceGateConfig } from "../entities/structures/fence-gate.js";
import { createWarriorHutConfig } from "../entities/structures/warrior-hut.js";
import { createEntity, destroyEntity, getEntityLayer } from "../world.js";
import { createScrappyConfig } from "../entities/tribes/automatons/scrappy.js";
import { createCogwalkerConfig } from "../entities/tribes/automatons/cogwalker.js";
import { registerDirtyEntity } from "../server/player-clients.js";
import { calculateEntityPlaceInfo } from "../structure-placement.js";
import { createWallConfig } from "../entities/structures/wall.js";

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
   [BlueprintType.fenceGate]: 3,
   [BlueprintType.stoneBracings]: 2,
   [BlueprintType.scrappy]: 10,
   [BlueprintType.cogwalker]: 20,
};

export class BlueprintComponent {
   public readonly blueprintType: BlueprintType;
   public workProgress = 0;
   public associatedEntityID: Entity;
   public readonly virtualEntityID: Entity = 0;

   constructor(blueprintType: BlueprintType, associatedEntityID: Entity) {
      this.blueprintType = blueprintType;
      this.associatedEntityID = associatedEntityID;
   }
}

export const BlueprintComponentArray = new ComponentArray<BlueprintComponent>(ServerComponentType.blueprint, true, getDataLength, addDataToPacket);
BlueprintComponentArray.onJoin = onJoin;

function onJoin(entityID: Entity): void {
   const blueprintComponent = BlueprintComponentArray.getComponent(entityID);

   if (StructureComponentArray.hasComponent(blueprintComponent.associatedEntityID)) {
      const structureComponent = StructureComponentArray.getComponent(blueprintComponent.associatedEntityID);
      structureComponent.activeBlueprint = entityID;
   }
}

const upgradeBuilding = (building: Entity): void => {
   const materialComponent = BuildingMaterialComponentArray.getComponent(building);
   if (materialComponent.material < BuildingMaterial.stone) {
      upgradeMaterial(building, materialComponent);
   }
}

const completeBlueprint = (blueprintEntity: Entity, blueprintComponent: BlueprintComponent): void => {
   const transformComponent = TransformComponentArray.getComponent(blueprintEntity);
   // @Hack
   const blueprintEntityHitbox = transformComponent.hitboxes[0];
   
   const tribeComponent = TribeComponentArray.getComponent(blueprintEntity);
   const tribe = tribeComponent.tribe;
   
   destroyEntity(blueprintEntity);

   const entityType = getBlueprintEntityType(blueprintComponent.blueprintType);

   // @Hack
   const originHitbox = transformComponent.hitboxes[0];
   const x = originHitbox.box.posX;
   const y = originHitbox.box.posY;
   const layer = getEntityLayer(blueprintEntity);

   const placeInfo = calculateEntityPlaceInfo(new Point(x, y), originHitbox.box.angle, entityType, layer);
   
   // @Copynpaste
   switch (blueprintComponent.blueprintType) {
      case BlueprintType.woodenDoor: {
         const config = createDoorConfig(x, y, blueprintEntityHitbox.box.angle, tribe, BuildingMaterial.wood, placeInfo.connections, null);
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.stoneDoor: {
         const config = createDoorConfig(x, y, blueprintEntityHitbox.box.angle, tribe, BuildingMaterial.stone, placeInfo.connections, null);
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.woodenEmbrasure: {
         const config = createEmbrasureConfig(x, y, blueprintEntityHitbox.box.angle, tribe, BuildingMaterial.wood, placeInfo.connections, null);
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.stoneEmbrasure: {
         const config = createEmbrasureConfig(x, y, blueprintEntityHitbox.box.angle, tribe, BuildingMaterial.stone, placeInfo.connections, null);
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.ballista: {
         const config = createBallistaConfig(x, y, blueprintEntityHitbox.box.angle, tribe, placeInfo.connections, null);
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.slingTurret: {
         const config = createSlingTurretConfig(x, y, blueprintEntityHitbox.box.angle, tribe, placeInfo.connections, null);
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.woodenTunnel: {
         const config = createTunnelConfig(x, y, blueprintEntityHitbox.box.angle, tribe, BuildingMaterial.wood, placeInfo.connections, null);
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.stoneTunnel: {
         const config = createTunnelConfig(x, y, blueprintEntityHitbox.box.angle, tribe, BuildingMaterial.stone, placeInfo.connections, null);
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.scrappy: {
         const config = createScrappyConfig(x, y, blueprintEntityHitbox.box.angle, tribe);
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.cogwalker: {
         const config = createCogwalkerConfig(x, y, blueprintEntityHitbox.box.angle, tribe);
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.fenceGate: {
         const blueprintStructureComponent = StructureComponentArray.getComponent(blueprintEntity);
         
         // @HACK
         const connections = blueprintStructureComponent.connections;

         // @HACK: cuz the fence gate doesn't have a root hitbox on its 'core' position
         const sideHitboxes = getHitboxesByTag(transformComponent, HitboxTag.fenceGateSide);
         const side1 = sideHitboxes[0];
         const side2 = sideHitboxes[1];

         const config = createFenceGateConfig((side1.box.posX + side2.box.posX) * 0.5, (side1.box.posY + side2.box.posY) * 0.5, blueprintEntityHitbox.box.angle, tribe, connections, null);
         createEntity(config, getEntityLayer(blueprintEntity), 0);

         // @TEMPORARY @HACK cuz ive made fence gate blueprints destroy the fence they were on when they are first created
         // destroyEntity(blueprintComponent.associatedEntityID);
         
         return;
      }
      case BlueprintType.warriorHutUpgrade: {
         const config = createWarriorHutConfig(x, y, blueprintEntityHitbox.box.angle, tribe, placeInfo.connections, null);
         const hut = createEntity(config, getEntityLayer(blueprintEntity), 0);

         // Remove the previous hut
         destroyEntity(blueprintComponent.associatedEntityID);

         // @Cleanup @Incomplete: should this be done here? Probably should be done on join.
         // Transfer the worker to the warrior hut
         const hutComponent = HutComponentArray.getComponent(blueprintComponent.associatedEntityID);
         if (hutComponent.hasTribesman) {
            tribeComponent.tribe.instantRespawnTribesman(hut);
         }

         return;
      }
      // @HACK cuz it no longer upgrades the existing wall, it destroys it and then when finished its a new stone wall
      case BlueprintType.stoneWall: {
         const config = createWallConfig(x, y, blueprintEntityHitbox.box.angle, tribe, BuildingMaterial.stone, placeInfo.connections, null);
         createEntity(config, getEntityLayer(blueprintEntity), 0);
         return;
      }
      case BlueprintType.stoneDoorUpgrade:
      case BlueprintType.stoneEmbrasureUpgrade:
      case BlueprintType.stoneTunnelUpgrade:
      case BlueprintType.stoneFloorSpikes:
      case BlueprintType.stoneWallSpikes:
      case BlueprintType.stoneBracings: {
         upgradeBuilding(blueprintComponent.associatedEntityID);
         return;
      }
      default: {
         const unreachable: never = blueprintComponent.blueprintType;
         return unreachable;
      }
   }
}

export function doBlueprintWork(blueprintEntity: Entity, itemType: HammerItemType): void {
   const blueprintComponent = BlueprintComponentArray.getComponent(blueprintEntity);
   
   const hammerItemInfo = ITEM_INFO_RECORD[itemType];
   blueprintComponent.workProgress += hammerItemInfo.workAmount;
   if (blueprintComponent.workProgress >= STRUCTURE_WORK_REQUIRED[blueprintComponent.blueprintType]) {
      // Construct the building
      completeBlueprint(blueprintEntity, blueprintComponent);
   }

   registerDirtyEntity(blueprintEntity);
}

function getDataLength(): number {
   return 3 * Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const blueprintComponent = BlueprintComponentArray.getComponent(entity);

   packet.writeNumber(blueprintComponent.blueprintType);
   packet.writeNumber(blueprintComponent.workProgress / STRUCTURE_WORK_REQUIRED[blueprintComponent.blueprintType]);
   packet.writeNumber(blueprintComponent.associatedEntityID);
}