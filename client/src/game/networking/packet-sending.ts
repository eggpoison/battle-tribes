import { TribesmanTitle, TribeType, Point, TamingSkillID, TechID, BlueprintType, InventoryName, ItemType, GameDataPacketOptions, Entity, EntityType, alignLengthBytes, getStringLengthBytes, Packet, PacketType } from "webgl-test-shared";
import { windowHeight, windowWidth } from "../webgl";
import { getEntityType } from "../world";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";
import { isSpectating, playerInstance } from "../player";
import { cameraPosition } from "../camera";
import { sendPacket } from "../client";
import { getHotbarSelectedItemSlot, getInstancePlayerAction, getPlayerMoveIntention } from "../player-action-handling";
import { entitySelectionState } from "../../ui-state/entity-selection-state.svelte";
import { debugDisplayState } from "../../ui-state/debug-display-state.svelte";

export function sendInitialPlayerDataPacket(username: string, tribeType: TribeType, isSpectating: boolean): void {
   // Send player data to the server
   const packet = new Packet(PacketType.initialPlayerData, Float32Array.BYTES_PER_ELEMENT * 5 + getStringLengthBytes(username));

   packet.writeString(username);
   packet.writeNumber(tribeType);
   packet.writeNumber(windowWidth);
   packet.writeNumber(windowHeight);
   packet.writeBool(isSpectating);

   sendPacket(packet);
}

export function sendDeactivatePacket(): void {
   const packet = new Packet(PacketType.deactivate, Float32Array.BYTES_PER_ELEMENT);
   sendPacket(packet);
}

export function sendActivatePacket(): void {
   const packet = new Packet(PacketType.activate, Float32Array.BYTES_PER_ELEMENT);
   sendPacket(packet);
}

export function sendPlayerDataPacket(): void {
   let position: Point;
   let angle: number;
   let previousPosition: Point;
   let acceleration: Point;
   let previousRelativeAngle: number;
   let angularAcceleration: number;

   if (playerInstance !== null) {
      const transformComponent = TransformComponentArray.getComponent(playerInstance);
      const playerHitbox = transformComponent.hitboxes[0];

      position = playerHitbox.box.position;
      angle = playerHitbox.box.angle;
      previousPosition = playerHitbox.previousPosition;
      acceleration = playerHitbox.acceleration;
      previousRelativeAngle = playerHitbox.previousRelativeAngle;
      angularAcceleration = playerHitbox.angularAcceleration;
   } else if (isSpectating) {
      position = cameraPosition;
      angle = 0;
      previousPosition = cameraPosition;
      acceleration = new Point(0, 0);
      previousRelativeAngle = 0;
      angularAcceleration = 0;
   } else {
      // To not waste unnecessary bandwidth with a useless player data packet
      return;
   }
   
   // Position, rotation
   let lengthBytes = 4 * Float32Array.BYTES_PER_ELEMENT;
   // Previous position and acceleration
   lengthBytes += 4 * Float32Array.BYTES_PER_ELEMENT;
   // Movement intention
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   // Previous relative angle, and angular acceleration
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   // window size
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   // inventory shit
   lengthBytes += 3 * Float32Array.BYTES_PER_ELEMENT;
   // other random shit
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   
   lengthBytes = alignLengthBytes(lengthBytes);
   
   const packet = new Packet(PacketType.playerData, lengthBytes);
   
   packet.writePoint(position);
   packet.writeNumber(angle);

   packet.writePoint(previousPosition);
   packet.writePoint(acceleration);

   const movementIntention = getPlayerMoveIntention();
   packet.writePoint(movementIntention);

   packet.writeNumber(previousRelativeAngle);
   packet.writeNumber(angularAcceleration);

   packet.writeNumber(windowWidth);
   packet.writeNumber(windowHeight);

   packet.writeNumber(getHotbarSelectedItemSlot());
   packet.writeNumber(getInstancePlayerAction(InventoryName.hotbar));
   packet.writeNumber(getInstancePlayerAction(InventoryName.offhand));

   let interactingEntityID = 0;

   const selectedEntity = entitySelectionState.selectedEntity;
   if (selectedEntity !== null) {
      const entityType = getEntityType(selectedEntity);
      if (entityType === EntityType.tribeWorker || entityType === EntityType.tribeWarrior) {
         interactingEntityID = selectedEntity;
      }
   }

   packet.writeNumber(interactingEntityID);
   
   // @BANDWIDTH: only needed for dev!!
   let gameDataOptions = 0;
   if (debugDisplayState.showPathfindingNodes) {
      gameDataOptions |= GameDataPacketOptions.sendVisiblePathfindingNodeOccupances;
   }
   if (debugDisplayState.showSafetyNodes) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleSafetyNodes;
   }
   if (debugDisplayState.showBuildingPlans) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleBuildingPlans;
   }
   if (debugDisplayState.showBuildingSafetys) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleBuildingSafetys;
   }
   if (debugDisplayState.showRestrictedAreas) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleRestrictedBuildingAreas;
   }
   if (debugDisplayState.showWallConnections) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleWallConnections;
   }
   if (debugDisplayState.showSubtileSupports) {
      gameDataOptions |= GameDataPacketOptions.sendSubtileSupports;
   }
   if (debugDisplayState.showLightLevels) {
      gameDataOptions |= GameDataPacketOptions.sendLightLevels;
   }
   
   packet.writeNumber(gameDataOptions);
   
   sendPacket(packet);
}

export function sendSyncRequestPacket(): void {
   const packet = new Packet(PacketType.syncRequest, Float32Array.BYTES_PER_ELEMENT);
   sendPacket(packet);
}

export function sendAttackPacket(): void {
   const transformComponent = TransformComponentArray.getComponent(playerInstance!);
   const playerHitbox = transformComponent.hitboxes[0];
   
   const packet = new Packet(PacketType.attack, 3 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(getHotbarSelectedItemSlot());
   packet.writeNumber(playerHitbox.box.angle);
   
   sendPacket(packet);
}

export function sendDevGiveItemPacket(itemType: ItemType, amount: number): void {
   const packet = new Packet(PacketType.devGiveItem, 3 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(itemType);
   packet.writeNumber(amount);

   sendPacket(packet);
}

export function sendRespawnPacket(): void {
   const packet = new Packet(PacketType.respawn, Float32Array.BYTES_PER_ELEMENT);
   sendPacket(packet);
}

export function sendStartItemUsePacket(): void {
   const packet = new Packet(PacketType.startItemUse, 2 * Float32Array.BYTES_PER_ELEMENT);
   
   packet.writeNumber(getHotbarSelectedItemSlot());

   sendPacket(packet);
}

export function sendItemUsePacket(): void {
   const packet = new Packet(PacketType.useItem, 2 * Float32Array.BYTES_PER_ELEMENT);
   
   packet.writeNumber(getHotbarSelectedItemSlot());

   sendPacket(packet);
}

export function sendStopItemUsePacket(): void {
   const packet = new Packet(PacketType.stopItemUse, Float32Array.BYTES_PER_ELEMENT);
   sendPacket(packet);
}

export function sendItemDropPacket(inventoryName: InventoryName, itemSlot: number, dropAmount: number, throwDirection: number): void {
   const packet = new Packet(PacketType.dropItem, 5 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(inventoryName);
   packet.writeNumber(itemSlot);
   packet.writeNumber(dropAmount);
   packet.writeNumber(throwDirection);

   sendPacket(packet);
}


export function sendItemPickupPacket(entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number): void {
   const packet = new Packet(PacketType.itemPickup, 5 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(entityID);
   packet.writeNumber(inventoryName);
   packet.writeNumber(itemSlot);
   packet.writeNumber(amount);

   sendPacket(packet);
}

export function sendItemTransferPacket(entity: Entity, inventoryName: InventoryName, itemSlot: number, receivingEntity: Entity, receivingInventoryName: InventoryName): void {
   const packet = new Packet(PacketType.itemTransfer, 6 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(entity);
   packet.writeNumber(inventoryName);
   packet.writeNumber(itemSlot);
   packet.writeNumber(receivingEntity);
   packet.writeNumber(receivingInventoryName);

   sendPacket(packet);
}

export function sendItemReleasePacket(entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number): void {
   const packet = new Packet(PacketType.itemRelease, 5 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(entityID);
   packet.writeNumber(inventoryName);
   packet.writeNumber(itemSlot);
   packet.writeNumber(amount);

   sendPacket(packet);
}

export function sendEntitySummonPacket(entityType: EntityType, x: number, y: number, rotation: number): void {
   const packet = new Packet(PacketType.summonEntity, 5 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(entityType);
   packet.writeNumber(x);
   packet.writeNumber(y);
   packet.writeNumber(rotation);

   sendPacket(packet);
}

export function sendToggleSimulationPacket(isSimulating: boolean): void {
   const packet = new Packet(PacketType.toggleSimulation, 2 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeBool(isSimulating);

   sendPacket(packet);
}

export function sendPlaceBlueprintPacket(structure: Entity, blueprintType: BlueprintType): void {
   const packet = new Packet(PacketType.placeBlueprint, 3 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(structure);
   packet.writeNumber(blueprintType);

   sendPacket(packet);
}

export function sendCraftItemPacket(recipeIndex: number): void {
   const packet = new Packet(PacketType.craftItem, 2 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(recipeIndex);

   sendPacket(packet);
}

export function sendSetDebugEntityPacket(entity: Entity): void {
   const packet = new Packet(PacketType.devSetDebugEntity, 2 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(entity);

   sendPacket(packet);
}

export function sendAscendPacket(): void {
   const packet = new Packet(PacketType.ascend, Float32Array.BYTES_PER_ELEMENT);
   sendPacket(packet);
}

export function sendTPTOEntityPacket(targetEntity: Entity): void {
   const packet = new Packet(PacketType.devTPToEntity, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(targetEntity);
   sendPacket(packet);
}

export function sendSpectateEntityPacket(entity: Entity): void {
   const packet = new Packet(PacketType.devSpectateEntity, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   sendPacket(packet);
}

export function sendSetAutogiveBaseResourcesPacket(tribeID: number, autogiveBaseResource: boolean): void {
   const packet = new Packet(PacketType.devSetAutogiveBaseResource, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(tribeID);
   packet.writeBool(autogiveBaseResource);
   sendPacket(packet);
}

export function sendStructureInteractPacket(structureID: number, interactData: number): void {
   const packet = new Packet(PacketType.structureInteract, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(structureID);
   packet.writeNumber(interactData);
   sendPacket(packet);
}

export function sendUnlockTechPacket(techID: TechID): void {
   const packet = new Packet(PacketType.unlockTech, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(techID);
   sendPacket(packet);
}

export function sendStudyTechPacket(studyAmount: number): void {
   const packet = new Packet(PacketType.studyTech, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(studyAmount);
   sendPacket(packet);
}

export function sendSelectTechPacket(techID: TechID): void {
   const packet = new Packet(PacketType.selectTech, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(techID);
   sendPacket(packet);
}

export function sendAnimalStaffFollowCommandPacket(entity: Entity): void {
   const packet = new Packet(PacketType.animalStaffFollowCommand, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   sendPacket(packet);
}

export function sendMountCarrySlotPacket(mount: Entity, carrySlotIdx: number): void {
   const packet = new Packet(PacketType.mountCarrySlot, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(mount);
   packet.writeNumber(carrySlotIdx);
   sendPacket(packet);
}

export function sendDismountCarrySlotPacket(): void {
   const packet = new Packet(PacketType.dismountCarrySlot, Float32Array.BYTES_PER_ELEMENT);
   sendPacket(packet);
}

export function sendPickUpEntityPacket(entity: Entity): void {
   const packet = new Packet(PacketType.pickUpEntity, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   sendPacket(packet);
}

export function sendModifyBuildingPacket(structure: Entity, data: number): void {
   const packet = new Packet(PacketType.modifyBuilding, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(structure);
   packet.writeNumber(data);
   sendPacket(packet);
}

export function sendSetMoveTargetPositionPacket(entity: Entity, targetX: number, targetY: number): void {
   const packet = new Packet(PacketType.setMoveTargetPosition, 4 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   packet.writeNumber(targetX);
   packet.writeNumber(targetY);
   sendPacket(packet);
}

export function sendSetCarryTargetPacket(entity: Entity, carryTarget: Entity): void {
   const packet = new Packet(PacketType.setCarryTarget, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   packet.writeNumber(carryTarget);
   sendPacket(packet);
}

export function sendSelectRiderDepositLocationPacket(entity: Entity, depositLocation: Point): void {
   const packet = new Packet(PacketType.selectRiderDepositLocation, 4 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   packet.writePoint(depositLocation);
   sendPacket(packet);
}

export function sendSetAttackTargetPacket(entity: Entity, attackTarget: Entity): void {
   const packet = new Packet(PacketType.setAttackTarget, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   packet.writeNumber(attackTarget);
   sendPacket(packet);
}

export function sendCompleteTamingTierPacket(entity: Entity): void {
   const packet = new Packet(PacketType.completeTamingTier, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   sendPacket(packet);
}

export function sendForceCompleteTamingTierPacket(entity: Entity): void {
   const packet = new Packet(PacketType.forceCompleteTamingTier, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   sendPacket(packet);
}

export function sendAcquireTamingSkillPacket(entity: Entity, skillID: TamingSkillID): void {
   const packet = new Packet(PacketType.acquireTamingSkill, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   packet.writeNumber(skillID);
   sendPacket(packet);
}

export function sendForceAcquireTamingSkillPacket(entity: Entity, skillID: TamingSkillID): void {
   const packet = new Packet(PacketType.forceAcquireTamingSkill, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   packet.writeNumber(skillID);
   sendPacket(packet);
}

export function sendSetSpectatingPositionPacket(): void {
   const packet = new Packet(PacketType.setSpectatingPosition, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(cameraPosition.x);
   packet.writeNumber(cameraPosition.y);
   sendPacket(packet);
}

export function sendDevSetViewedSpawnDistributionPacket(entityType: EntityType | -1): void {
   const packet = new Packet(PacketType.devSetViewedSpawnDistribution, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entityType);
   sendPacket(packet);
}

export function sendSetSignMessagePacket(entity: Entity, message: string): void {
   const packet = new Packet(PacketType.setSignMessage, 2 * Float32Array.BYTES_PER_ELEMENT + getStringLengthBytes(message));
   packet.writeNumber(entity);
   packet.writeString(message);
   sendPacket(packet);
}

export function sendRenameAnimalPacket(entity: Entity, name: string): void {
   const packet = new Packet(PacketType.renameAnimal, 2 * Float32Array.BYTES_PER_ELEMENT + getStringLengthBytes(name));
   packet.writeNumber(entity);
   packet.writeString(name);
   sendPacket(packet);
}

export function sendChatMessagePacket(message: string): void {
   const packet = new Packet(PacketType.chatMessage, Float32Array.BYTES_PER_ELEMENT + getStringLengthBytes(message));
   packet.writeString(message);
   sendPacket(packet);
}

export function sendForceUnlockTechPacket(techID: TechID): void {
   const packet = new Packet(PacketType.forceUnlockTech, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(techID);
   sendPacket(packet);
}

export function sendDeconstructBuildingPacket(structure: Entity): void {
   const packet = new Packet(PacketType.deconstructBuilding, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(structure);
   sendPacket(packet);
}

export function sendStructureUninteractPacket(structure: Entity): void {
   const packet = new Packet(PacketType.structureUninteract, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(structure);
   sendPacket(packet);
}

export function sendRecruitTribesmanPacket(tribesman: Entity): void {
   const packet = new Packet(PacketType.recruitTribesman, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(tribesman);
   sendPacket(packet);
}

export function sendRespondToTitleOfferPacket(title: TribesmanTitle, isAccepted: boolean): void {
   const packet = new Packet(PacketType.respondToTitleOffer, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(title);
   packet.writeBool(isAccepted);
   sendPacket(packet);
}

export function sendDevGiveTitlePacket(title: TribesmanTitle): void {
   const packet = new Packet(PacketType.devGiveTitle, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(title);
   sendPacket(packet);
}

export function sendDevRemoveTitlePacket(title: TribesmanTitle): void {
   const packet = new Packet(PacketType.devRemoveTitle, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(title);
   sendPacket(packet);
}

export function sendDevCreateTribePacket(): void {
   const packet = new Packet(PacketType.devCreateTribe, Float32Array.BYTES_PER_ELEMENT);
   sendPacket(packet);
}

export function sendDevChangeTribeTypePacket(tribeID: number, newTribeType: TribeType): void {
   const packet = new Packet(PacketType.devChangeTribeType, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(tribeID);
   packet.writeNumber(newTribeType);
   sendPacket(packet);
}

export function sendTerminalCommandPacket(command: string): void {
   const packet = new Packet(PacketType.terminalCommand, Float32Array.BYTES_PER_ELEMENT + getStringLengthBytes(command));
   packet.writeString(command);
   sendPacket(packet);
}

export function sendOpenEntityInventoryPacket(entity: Entity): void {
   const packet = new Packet(PacketType.openEntityInventory, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   sendPacket(packet);
}

export function sendCloseEntityInventoryPacket(entity: Entity): void {
   const packet = new Packet(PacketType.closeEntityInventory, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   sendPacket(packet);
}