import { BlueprintType } from "../../../../../shared/src/components";
import { Bytes } from "../../../../../shared/src/constants";
import { Entity, EntityType } from "../../../../../shared/src/entities";
import { ItemType, InventoryName } from "../../../../../shared/src/items/items";
import { Packet, ClientPacketType, getStringLengthBytes } from "../../../../../shared/src/packets";
import { TamingSkillID } from "../../../../../shared/src/taming";
import { TechID } from "../../../../../shared/src/techs";
import { TribesmanTitle } from "../../../../../shared/src/titles";
import { TribeType } from "../../../../../shared/src/tribes";
import { Point } from "../../../../../shared/src/utils";
import { sendData } from "../socket";

export function sendInitialPlayerDataPacket(username: string, tribeType: TribeType, isSpectating: boolean): void {
   // Send player data to the server
   const packet = new Packet(ClientPacketType.initialPlayerData, Bytes.Float32 * 3 + getStringLengthBytes(username));

   const displayAspectRatio = screen.width / screen.height;
   
   packet.writeString(username);
   packet.writeNumber(tribeType);
   console.log(displayAspectRatio);
   packet.writeNumber(displayAspectRatio);
   packet.writeBool(isSpectating);

   sendData(packet.buffer);
}

export function sendDeactivatePacket(): void {
   const packet = new Packet(ClientPacketType.deactivate, 0);
   sendData(packet.buffer);
}

export function sendActivatePacket(): void {
   const packet = new Packet(ClientPacketType.activate, 0);
   sendData(packet.buffer);
}

export function sendSyncRequestPacket(): void {
   const packet = new Packet(ClientPacketType.syncRequest, 0);
   sendData(packet.buffer);
}

export function sendAttackPacket(hotbarSelectedItemSlot: number, playerAngle: number): void {
   const packet = new Packet(ClientPacketType.attack, 2 * Bytes.Float32);

   packet.writeNumber(hotbarSelectedItemSlot);
   packet.writeNumber(playerAngle);
   
   sendData(packet.buffer);
}

export function sendDevGiveItemPacket(itemType: ItemType, amount: number): void {
   const packet = new Packet(ClientPacketType.devGiveItem, 2 * Bytes.Float32);

   packet.writeNumber(itemType);
   packet.writeNumber(amount);

   sendData(packet.buffer);
}

export function sendRespawnPacket(): void {
   const packet = new Packet(ClientPacketType.respawn, 0);
   sendData(packet.buffer);
}

export function sendStartItemUsePacket(hotbarSelectedItemSlot: number): void {
   const packet = new Packet(ClientPacketType.startItemUse, Bytes.Float32);
   packet.writeNumber(hotbarSelectedItemSlot);
   sendData(packet.buffer);
}

export function sendItemUsePacket(hotbarSelectedItemSlot: number): void {
   const packet = new Packet(ClientPacketType.useItem, Bytes.Float32);
   packet.writeNumber(hotbarSelectedItemSlot);
   sendData(packet.buffer);
}

export function sendStopItemUsePacket(): void {
   const packet = new Packet(ClientPacketType.stopItemUse, 0);
   sendData(packet.buffer);
}

export function sendItemDropPacket(inventoryName: InventoryName, itemSlot: number, dropAmount: number, throwDirection: number): void {
   const packet = new Packet(ClientPacketType.dropItem, 4 * Bytes.Float32);

   packet.writeNumber(inventoryName);
   packet.writeNumber(itemSlot);
   packet.writeNumber(dropAmount);
   packet.writeNumber(throwDirection);

   sendData(packet.buffer);
}


export function sendItemPickupPacket(entity: Entity, inventoryName: InventoryName, itemSlot: number, amount: number): void {
   const packet = new Packet(ClientPacketType.itemPickup, 4 * Bytes.Float32);

   packet.writeNumber(entity);
   packet.writeNumber(inventoryName);
   packet.writeNumber(itemSlot);
   packet.writeNumber(amount);

   sendData(packet.buffer);
}

export function sendItemTransferPacket(entity: Entity, inventoryName: InventoryName, itemSlot: number, receivingEntity: Entity, receivingInventoryName: InventoryName): void {
   const packet = new Packet(ClientPacketType.itemTransfer, 5 * Bytes.Float32);

   packet.writeNumber(entity);
   packet.writeNumber(inventoryName);
   packet.writeNumber(itemSlot);
   packet.writeNumber(receivingEntity);
   packet.writeNumber(receivingInventoryName);

   sendData(packet.buffer);
}

export function sendItemReleasePacket(entity: Entity, inventoryName: InventoryName, itemSlot: number, amount: number): void {
   const packet = new Packet(ClientPacketType.itemRelease, 4 * Bytes.Float32);

   packet.writeNumber(entity);
   packet.writeNumber(inventoryName);
   packet.writeNumber(itemSlot);
   packet.writeNumber(amount);

   sendData(packet.buffer);
}

export function sendEntitySummonPacket(entityType: EntityType, x: number, y: number, rotation: number): void {
   const packet = new Packet(ClientPacketType.summonEntity, 4 * Bytes.Float32);

   packet.writeNumber(entityType);
   packet.writeNumber(x);
   packet.writeNumber(y);
   packet.writeNumber(rotation);

   sendData(packet.buffer);
}

export function sendToggleSimulationPacket(isSimulating: boolean): void {
   const packet = new Packet(ClientPacketType.toggleSimulation, Bytes.Float32);
   packet.writeBool(isSimulating);
   sendData(packet.buffer);
}

export function sendPlaceBlueprintPacket(structure: Entity, blueprintType: BlueprintType): void {
   const packet = new Packet(ClientPacketType.placeBlueprint, 2 * Bytes.Float32);
   packet.writeNumber(structure);
   packet.writeNumber(blueprintType);
   sendData(packet.buffer);
}

export function sendCraftItemPacket(recipeIndex: number): void {
   const packet = new Packet(ClientPacketType.craftItem, 2 * Bytes.Float32);
   packet.writeNumber(recipeIndex);
   sendData(packet.buffer);
}

export function sendSetDebugEntityPacket(entity: Entity): void {
   const packet = new Packet(ClientPacketType.devSetDebugEntity, Bytes.Float32);
   packet.writeNumber(entity);
   sendData(packet.buffer);
}

export function sendAscendPacket(): void {
   const packet = new Packet(ClientPacketType.ascend, 0);
   sendData(packet.buffer);
}

export function sendTPTOEntityPacket(targetEntity: Entity): void {
   const packet = new Packet(ClientPacketType.devTPToEntity, Bytes.Float32);
   packet.writeNumber(targetEntity);
   sendData(packet.buffer);
}

export function sendSpectateEntityPacket(entity: Entity): void {
   const packet = new Packet(ClientPacketType.devSpectateEntity, Bytes.Float32);
   packet.writeNumber(entity);
   sendData(packet.buffer);
}

export function sendSetAutogiveBaseResourcesPacket(tribeID: number, autogiveBaseResource: boolean): void {
   const packet = new Packet(ClientPacketType.devSetAutogiveBaseResource, 2 * Bytes.Float32);
   packet.writeNumber(tribeID);
   packet.writeBool(autogiveBaseResource);
   sendData(packet.buffer);
}

export function sendStructureInteractPacket(structureID: number, interactData: number): void {
   const packet = new Packet(ClientPacketType.structureInteract, 2 * Bytes.Float32);
   packet.writeNumber(structureID);
   packet.writeNumber(interactData);
   sendData(packet.buffer);
}

export function sendUnlockTechPacket(techID: TechID): void {
   const packet = new Packet(ClientPacketType.unlockTech, Bytes.Float32);
   packet.writeNumber(techID);
   sendData(packet.buffer);
}

export function sendStudyTechPacket(studyAmount: number): void {
   const packet = new Packet(ClientPacketType.studyTech, Bytes.Float32);
   packet.writeNumber(studyAmount);
   sendData(packet.buffer);
}

export function sendSelectTechPacket(techID: TechID): void {
   const packet = new Packet(ClientPacketType.selectTech, Bytes.Float32);
   packet.writeNumber(techID);
   sendData(packet.buffer);
}

export function sendAnimalStaffFollowCommandPacket(entity: Entity): void {
   const packet = new Packet(ClientPacketType.animalStaffFollowCommand, Bytes.Float32);
   packet.writeNumber(entity);
   sendData(packet.buffer);
}

export function sendMountCarrySlotPacket(mount: Entity, carrySlotIdx: number): void {
   const packet = new Packet(ClientPacketType.mountCarrySlot, 2 * Bytes.Float32);
   packet.writeNumber(mount);
   packet.writeNumber(carrySlotIdx);
   sendData(packet.buffer);
}

export function sendDismountCarrySlotPacket(): void {
   const packet = new Packet(ClientPacketType.dismountCarrySlot, 0);
   sendData(packet.buffer);
}

export function sendPickUpEntityPacket(entity: Entity): void {
   const packet = new Packet(ClientPacketType.pickUpEntity, 2 * Bytes.Float32);
   packet.writeNumber(entity);
   sendData(packet.buffer);
}

export function sendModifyBuildingPacket(structure: Entity, data: number): void {
   const packet = new Packet(ClientPacketType.modifyBuilding, 2 * Bytes.Float32);
   packet.writeNumber(structure);
   packet.writeNumber(data);
   sendData(packet.buffer);
}

export function sendSetMoveTargetPositionPacket(entity: Entity, targetX: number, targetY: number): void {
   const packet = new Packet(ClientPacketType.setMoveTargetPosition, 3 * Bytes.Float32);
   packet.writeNumber(entity);
   packet.writeNumber(targetX);
   packet.writeNumber(targetY);
   sendData(packet.buffer);
}

export function sendSetCarryTargetPacket(entity: Entity, carryTarget: Entity): void {
   const packet = new Packet(ClientPacketType.setCarryTarget, 2 * Bytes.Float32);
   packet.writeNumber(entity);
   packet.writeNumber(carryTarget);
   sendData(packet.buffer);
}

export function sendSelectRiderDepositLocationPacket(entity: Entity, depositLocation: Point): void {
   const packet = new Packet(ClientPacketType.selectRiderDepositLocation, 3 * Bytes.Float32);
   packet.writeNumber(entity);
   packet.writePoint(depositLocation);
   sendData(packet.buffer);
}

export function sendSetAttackTargetPacket(entity: Entity, attackTarget: Entity): void {
   const packet = new Packet(ClientPacketType.setAttackTarget, 2 * Bytes.Float32);
   packet.writeNumber(entity);
   packet.writeNumber(attackTarget);
   sendData(packet.buffer);
}

export function sendCompleteTamingTierPacket(entity: Entity): void {
   const packet = new Packet(ClientPacketType.completeTamingTier, Bytes.Float32);
   packet.writeNumber(entity);
   sendData(packet.buffer);
}

export function sendForceCompleteTamingTierPacket(entity: Entity): void {
   const packet = new Packet(ClientPacketType.forceCompleteTamingTier, Bytes.Float32);
   packet.writeNumber(entity);
   sendData(packet.buffer);
}

export function sendAcquireTamingSkillPacket(entity: Entity, skillID: TamingSkillID): void {
   const packet = new Packet(ClientPacketType.acquireTamingSkill, 2 * Bytes.Float32);
   packet.writeNumber(entity);
   packet.writeNumber(skillID);
   sendData(packet.buffer);
}

export function sendForceAcquireTamingSkillPacket(entity: Entity, skillID: TamingSkillID): void {
   const packet = new Packet(ClientPacketType.forceAcquireTamingSkill, 2 * Bytes.Float32);
   packet.writeNumber(entity);
   packet.writeNumber(skillID);
   sendData(packet.buffer);
}

// @Cleanup: unused??
export function sendSetSpectatingPositionPacket(cameraPositionX: number, cameraPositionY: number): void {
   const packet = new Packet(ClientPacketType.setSpectatingPosition, 2 * Bytes.Float32);
   packet.writeNumber(cameraPositionX);
   packet.writeNumber(cameraPositionY);
   sendData(packet.buffer);
}

export function sendDevSetViewedSpawnDistributionPacket(entityType: EntityType | -1): void {
   const packet = new Packet(ClientPacketType.devSetViewedSpawnDistribution, Bytes.Float32);
   packet.writeNumber(entityType);
   sendData(packet.buffer);
}

export function sendSetSignMessagePacket(entity: Entity, message: string): void {
   const packet = new Packet(ClientPacketType.setSignMessage, Bytes.Float32 + getStringLengthBytes(message));
   packet.writeNumber(entity);
   packet.writeString(message);
   sendData(packet.buffer);
}

export function sendRenameAnimalPacket(entity: Entity, name: string): void {
   const packet = new Packet(ClientPacketType.renameAnimal, Bytes.Float32 + getStringLengthBytes(name));
   packet.writeNumber(entity);
   packet.writeString(name);
   sendData(packet.buffer);
}

export function sendChatMessagePacket(message: string): void {
   const packet = new Packet(ClientPacketType.chatMessage, getStringLengthBytes(message));
   packet.writeString(message);
   sendData(packet.buffer);
}

export function sendForceUnlockTechPacket(techID: TechID): void {
   const packet = new Packet(ClientPacketType.forceUnlockTech, Bytes.Float32);
   packet.writeNumber(techID);
   sendData(packet.buffer);
}

export function sendDeconstructBuildingPacket(structure: Entity): void {
   const packet = new Packet(ClientPacketType.deconstructBuilding, Bytes.Float32);
   packet.writeNumber(structure);
   sendData(packet.buffer);
}

export function sendStructureUninteractPacket(structure: Entity): void {
   const packet = new Packet(ClientPacketType.structureUninteract, Bytes.Float32);
   packet.writeNumber(structure);
   sendData(packet.buffer);
}

export function sendRecruitTribesmanPacket(tribesman: Entity): void {
   const packet = new Packet(ClientPacketType.recruitTribesman, Bytes.Float32);
   packet.writeNumber(tribesman);
   sendData(packet.buffer);
}

export function sendRespondToTitleOfferPacket(title: TribesmanTitle, isAccepted: boolean): void {
   const packet = new Packet(ClientPacketType.respondToTitleOffer, 2 * Bytes.Float32);
   packet.writeNumber(title);
   packet.writeBool(isAccepted);
   sendData(packet.buffer);
}

export function sendDevGiveTitlePacket(title: TribesmanTitle): void {
   const packet = new Packet(ClientPacketType.devGiveTitle, Bytes.Float32);
   packet.writeNumber(title);
   sendData(packet.buffer);
}

export function sendDevRemoveTitlePacket(title: TribesmanTitle): void {
   const packet = new Packet(ClientPacketType.devRemoveTitle, Bytes.Float32);
   packet.writeNumber(title);
   sendData(packet.buffer);
}

export function sendDevCreateTribePacket(): void {
   const packet = new Packet(ClientPacketType.devCreateTribe, 0);
   sendData(packet.buffer);
}

export function sendDevChangeTribeTypePacket(tribeID: number, newTribeType: TribeType): void {
   const packet = new Packet(ClientPacketType.devChangeTribeType, 2 * Bytes.Float32);
   packet.writeNumber(tribeID);
   packet.writeNumber(newTribeType);
   sendData(packet.buffer);
}

export function sendTerminalCommandPacket(command: string): void {
   const packet = new Packet(ClientPacketType.terminalCommand, getStringLengthBytes(command));
   packet.writeString(command);
   sendData(packet.buffer);
}

export function sendOpenEntityInventoryPacket(entity: Entity): void {
   const packet = new Packet(ClientPacketType.startEntityInteraction, Bytes.Float32);
   packet.writeNumber(entity);
   sendData(packet.buffer);
}

export function sendCloseEntityInventoryPacket(entity: Entity): void {
   const packet = new Packet(ClientPacketType.endEntityInteraction, Bytes.Float32);
   packet.writeNumber(entity);
   sendData(packet.buffer);
}