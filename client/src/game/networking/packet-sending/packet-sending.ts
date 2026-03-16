import { TribesmanTitle, TribeType, Point, TamingSkillID, TechID, BlueprintType, InventoryName, ItemType, Entity, EntityType, getStringLengthBytes, Packet, PacketType } from "webgl-test-shared";
import { sendData } from "../networking";

export function sendInitialPlayerDataPacket(username: string, tribeType: TribeType, isSpectating: boolean, windowWidth: number, windowHeight: number): void {
   // Send player data to the server
   const packet = new Packet(PacketType.initialPlayerData, Float32Array.BYTES_PER_ELEMENT * 4 + getStringLengthBytes(username));

   packet.writeString(username);
   packet.writeNumber(tribeType);
   packet.writeNumber(windowWidth);
   packet.writeNumber(windowHeight);
   packet.writeBool(isSpectating);

   sendData(packet.buffer);
}

export function sendDeactivatePacket(): void {
   const packet = new Packet(PacketType.deactivate, 0);
   sendData(packet.buffer);
}

export function sendActivatePacket(): void {
   const packet = new Packet(PacketType.activate, 0);
   sendData(packet.buffer);
}

export function sendSyncRequestPacket(): void {
   const packet = new Packet(PacketType.syncRequest, 0);
   sendData(packet.buffer);
}

export function sendAttackPacket(hotbarSelectedItemSlot: number, playerAngle: number): void {
   const packet = new Packet(PacketType.attack, 2 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(hotbarSelectedItemSlot);
   packet.writeNumber(playerAngle);
   
   sendData(packet.buffer);
}

export function sendDevGiveItemPacket(itemType: ItemType, amount: number): void {
   const packet = new Packet(PacketType.devGiveItem, 2 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(itemType);
   packet.writeNumber(amount);

   sendData(packet.buffer);
}

export function sendRespawnPacket(): void {
   const packet = new Packet(PacketType.respawn, 0);
   sendData(packet.buffer);
}

export function sendStartItemUsePacket(hotbarSelectedItemSlot: number): void {
   const packet = new Packet(PacketType.startItemUse, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(hotbarSelectedItemSlot);
   sendData(packet.buffer);
}

export function sendItemUsePacket(hotbarSelectedItemSlot: number): void {
   const packet = new Packet(PacketType.useItem, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(hotbarSelectedItemSlot);
   sendData(packet.buffer);
}

export function sendStopItemUsePacket(): void {
   const packet = new Packet(PacketType.stopItemUse, 0);
   sendData(packet.buffer);
}

export function sendItemDropPacket(inventoryName: InventoryName, itemSlot: number, dropAmount: number, throwDirection: number): void {
   const packet = new Packet(PacketType.dropItem, 4 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(inventoryName);
   packet.writeNumber(itemSlot);
   packet.writeNumber(dropAmount);
   packet.writeNumber(throwDirection);

   sendData(packet.buffer);
}


export function sendItemPickupPacket(entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number): void {
   const packet = new Packet(PacketType.itemPickup, 4 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(entityID);
   packet.writeNumber(inventoryName);
   packet.writeNumber(itemSlot);
   packet.writeNumber(amount);

   sendData(packet.buffer);
}

export function sendItemTransferPacket(entity: Entity, inventoryName: InventoryName, itemSlot: number, receivingEntity: Entity, receivingInventoryName: InventoryName): void {
   const packet = new Packet(PacketType.itemTransfer, 5 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(entity);
   packet.writeNumber(inventoryName);
   packet.writeNumber(itemSlot);
   packet.writeNumber(receivingEntity);
   packet.writeNumber(receivingInventoryName);

   sendData(packet.buffer);
}

export function sendItemReleasePacket(entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number): void {
   const packet = new Packet(PacketType.itemRelease, 4 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(entityID);
   packet.writeNumber(inventoryName);
   packet.writeNumber(itemSlot);
   packet.writeNumber(amount);

   sendData(packet.buffer);
}

export function sendEntitySummonPacket(entityType: EntityType, x: number, y: number, rotation: number): void {
   const packet = new Packet(PacketType.summonEntity, 4 * Float32Array.BYTES_PER_ELEMENT);

   packet.writeNumber(entityType);
   packet.writeNumber(x);
   packet.writeNumber(y);
   packet.writeNumber(rotation);

   sendData(packet.buffer);
}

export function sendToggleSimulationPacket(isSimulating: boolean): void {
   const packet = new Packet(PacketType.toggleSimulation, Float32Array.BYTES_PER_ELEMENT);
   packet.writeBool(isSimulating);
   sendData(packet.buffer);
}

export function sendPlaceBlueprintPacket(structure: Entity, blueprintType: BlueprintType): void {
   const packet = new Packet(PacketType.placeBlueprint, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(structure);
   packet.writeNumber(blueprintType);
   sendData(packet.buffer);
}

export function sendCraftItemPacket(recipeIndex: number): void {
   const packet = new Packet(PacketType.craftItem, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(recipeIndex);
   sendData(packet.buffer);
}

export function sendSetDebugEntityPacket(entity: Entity): void {
   const packet = new Packet(PacketType.devSetDebugEntity, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   sendData(packet.buffer);
}

export function sendAscendPacket(): void {
   const packet = new Packet(PacketType.ascend, 0);
   sendData(packet.buffer);
}

export function sendTPTOEntityPacket(targetEntity: Entity): void {
   const packet = new Packet(PacketType.devTPToEntity, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(targetEntity);
   sendData(packet.buffer);
}

export function sendSpectateEntityPacket(entity: Entity): void {
   const packet = new Packet(PacketType.devSpectateEntity, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   sendData(packet.buffer);
}

export function sendSetAutogiveBaseResourcesPacket(tribeID: number, autogiveBaseResource: boolean): void {
   const packet = new Packet(PacketType.devSetAutogiveBaseResource, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(tribeID);
   packet.writeBool(autogiveBaseResource);
   sendData(packet.buffer);
}

export function sendStructureInteractPacket(structureID: number, interactData: number): void {
   const packet = new Packet(PacketType.structureInteract, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(structureID);
   packet.writeNumber(interactData);
   sendData(packet.buffer);
}

export function sendUnlockTechPacket(techID: TechID): void {
   const packet = new Packet(PacketType.unlockTech, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(techID);
   sendData(packet.buffer);
}

export function sendStudyTechPacket(studyAmount: number): void {
   const packet = new Packet(PacketType.studyTech, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(studyAmount);
   sendData(packet.buffer);
}

export function sendSelectTechPacket(techID: TechID): void {
   const packet = new Packet(PacketType.selectTech, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(techID);
   sendData(packet.buffer);
}

export function sendAnimalStaffFollowCommandPacket(entity: Entity): void {
   const packet = new Packet(PacketType.animalStaffFollowCommand, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   sendData(packet.buffer);
}

export function sendMountCarrySlotPacket(mount: Entity, carrySlotIdx: number): void {
   const packet = new Packet(PacketType.mountCarrySlot, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(mount);
   packet.writeNumber(carrySlotIdx);
   sendData(packet.buffer);
}

export function sendDismountCarrySlotPacket(): void {
   const packet = new Packet(PacketType.dismountCarrySlot, 0);
   sendData(packet.buffer);
}

export function sendPickUpEntityPacket(entity: Entity): void {
   const packet = new Packet(PacketType.pickUpEntity, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   sendData(packet.buffer);
}

export function sendModifyBuildingPacket(structure: Entity, data: number): void {
   const packet = new Packet(PacketType.modifyBuilding, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(structure);
   packet.writeNumber(data);
   sendData(packet.buffer);
}

export function sendSetMoveTargetPositionPacket(entity: Entity, targetX: number, targetY: number): void {
   const packet = new Packet(PacketType.setMoveTargetPosition, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   packet.writeNumber(targetX);
   packet.writeNumber(targetY);
   sendData(packet.buffer);
}

export function sendSetCarryTargetPacket(entity: Entity, carryTarget: Entity): void {
   const packet = new Packet(PacketType.setCarryTarget, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   packet.writeNumber(carryTarget);
   sendData(packet.buffer);
}

export function sendSelectRiderDepositLocationPacket(entity: Entity, depositLocation: Point): void {
   const packet = new Packet(PacketType.selectRiderDepositLocation, 3 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   packet.writePoint(depositLocation);
   sendData(packet.buffer);
}

export function sendSetAttackTargetPacket(entity: Entity, attackTarget: Entity): void {
   const packet = new Packet(PacketType.setAttackTarget, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   packet.writeNumber(attackTarget);
   sendData(packet.buffer);
}

export function sendCompleteTamingTierPacket(entity: Entity): void {
   const packet = new Packet(PacketType.completeTamingTier, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   sendData(packet.buffer);
}

export function sendForceCompleteTamingTierPacket(entity: Entity): void {
   const packet = new Packet(PacketType.forceCompleteTamingTier, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   sendData(packet.buffer);
}

export function sendAcquireTamingSkillPacket(entity: Entity, skillID: TamingSkillID): void {
   const packet = new Packet(PacketType.acquireTamingSkill, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   packet.writeNumber(skillID);
   sendData(packet.buffer);
}

export function sendForceAcquireTamingSkillPacket(entity: Entity, skillID: TamingSkillID): void {
   const packet = new Packet(PacketType.forceAcquireTamingSkill, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   packet.writeNumber(skillID);
   sendData(packet.buffer);
}

// @Cleanup: unused??
export function sendSetSpectatingPositionPacket(cameraPositionX: number, cameraPositionY: number): void {
   const packet = new Packet(PacketType.setSpectatingPosition, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(cameraPositionX);
   packet.writeNumber(cameraPositionY);
   sendData(packet.buffer);
}

export function sendDevSetViewedSpawnDistributionPacket(entityType: EntityType | -1): void {
   const packet = new Packet(PacketType.devSetViewedSpawnDistribution, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entityType);
   sendData(packet.buffer);
}

export function sendSetSignMessagePacket(entity: Entity, message: string): void {
   const packet = new Packet(PacketType.setSignMessage, Float32Array.BYTES_PER_ELEMENT + getStringLengthBytes(message));
   packet.writeNumber(entity);
   packet.writeString(message);
   sendData(packet.buffer);
}

export function sendRenameAnimalPacket(entity: Entity, name: string): void {
   const packet = new Packet(PacketType.renameAnimal, Float32Array.BYTES_PER_ELEMENT + getStringLengthBytes(name));
   packet.writeNumber(entity);
   packet.writeString(name);
   sendData(packet.buffer);
}

export function sendChatMessagePacket(message: string): void {
   const packet = new Packet(PacketType.chatMessage, getStringLengthBytes(message));
   packet.writeString(message);
   sendData(packet.buffer);
}

export function sendForceUnlockTechPacket(techID: TechID): void {
   const packet = new Packet(PacketType.forceUnlockTech, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(techID);
   sendData(packet.buffer);
}

export function sendDeconstructBuildingPacket(structure: Entity): void {
   const packet = new Packet(PacketType.deconstructBuilding, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(structure);
   sendData(packet.buffer);
}

export function sendStructureUninteractPacket(structure: Entity): void {
   const packet = new Packet(PacketType.structureUninteract, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(structure);
   sendData(packet.buffer);
}

export function sendRecruitTribesmanPacket(tribesman: Entity): void {
   const packet = new Packet(PacketType.recruitTribesman, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(tribesman);
   sendData(packet.buffer);
}

export function sendRespondToTitleOfferPacket(title: TribesmanTitle, isAccepted: boolean): void {
   const packet = new Packet(PacketType.respondToTitleOffer, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(title);
   packet.writeBool(isAccepted);
   sendData(packet.buffer);
}

export function sendDevGiveTitlePacket(title: TribesmanTitle): void {
   const packet = new Packet(PacketType.devGiveTitle, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(title);
   sendData(packet.buffer);
}

export function sendDevRemoveTitlePacket(title: TribesmanTitle): void {
   const packet = new Packet(PacketType.devRemoveTitle, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(title);
   sendData(packet.buffer);
}

export function sendDevCreateTribePacket(): void {
   const packet = new Packet(PacketType.devCreateTribe, 0);
   sendData(packet.buffer);
}

export function sendDevChangeTribeTypePacket(tribeID: number, newTribeType: TribeType): void {
   const packet = new Packet(PacketType.devChangeTribeType, 2 * Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(tribeID);
   packet.writeNumber(newTribeType);
   sendData(packet.buffer);
}

export function sendTerminalCommandPacket(command: string): void {
   const packet = new Packet(PacketType.terminalCommand, getStringLengthBytes(command));
   packet.writeString(command);
   sendData(packet.buffer);
}

export function sendOpenEntityInventoryPacket(entity: Entity): void {
   const packet = new Packet(PacketType.startEntityInteraction, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   sendData(packet.buffer);
}

export function sendCloseEntityInventoryPacket(entity: Entity): void {
   const packet = new Packet(PacketType.endEntityInteraction, Float32Array.BYTES_PER_ELEMENT);
   packet.writeNumber(entity);
   sendData(packet.buffer);
}