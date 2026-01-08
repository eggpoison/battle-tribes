import { BlockType, ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { getItemAttackInfo, InventoryName, ITEM_TYPE_RECORD, ItemType } from "../../../shared/src/items/items";
import { Packet } from "../../../shared/src/packets";
import { Point } from "../../../shared/src/utils";
import { applyKnockback, getHitboxMomentum, Hitbox } from "../hitboxes";
import { createShieldKnockPacket } from "../server/packet-sending";
import { getEntityType, getGameTicks } from "../world";
import { ComponentArray } from "./ComponentArray";
import { InventoryUseComponentArray, LimbInfo, onSwingEntityCollision } from "./InventoryUseComponent";
import { PlayerComponentArray } from "./PlayerComponent";
import { ProjectileComponentArray } from "./ProjectileComponent";
import { TransformComponentArray, attachHitbox } from "./TransformComponent";

const getBlockType = (itemType: ItemType): BlockType | null => {
   const attackInfo = getItemAttackInfo(itemType);
   if (attackInfo.attackTimings.blockTimeTicks === null) {
      return null;
   }

   return ITEM_TYPE_RECORD[itemType] === "shield" ? BlockType.shieldBlock : BlockType.toolBlock;
}

export class HeldItemComponent {
   public readonly itemType: ItemType;

   public readonly blockType: BlockType | null;
   // @Cleanup: Is this necessary? Could we do it with just a tick event?
   // @Hack: surely this shouldn't exist - shields can block multiple times
   public hasBlocked = false;

   constructor(itemType: ItemType) {
      this.itemType = itemType;
      this.blockType = getBlockType(itemType);
   }
}

export const HeldItemComponentArray = new ComponentArray<HeldItemComponent>(ServerComponentType.heldItem, true, getDataLength, addDataToPacket);
HeldItemComponentArray.onHitboxCollision = onHitboxCollision;

export function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

export function addDataToPacket(packet: Packet, entity: Entity): void {
   const heldItemComponent = HeldItemComponentArray.getComponent(entity);
   packet.writeNumber(heldItemComponent.itemType);
   packet.writeBool(heldItemComponent.hasBlocked);
}

// @Incomplete
// const blockSwing = (blockAttack: Entity, swingAttack: Entity, blockingHitbox: Hitbox, swingHitbox: Hitbox): void => {
//    const blockAttackComponent = BlockAttackComponentArray.getComponent(blockAttack);

//    const swingAttackComponent = SwingAttackComponentArray.getComponent(swingAttack);
//    const attackerLimb = swingAttackComponent.limb;

//    // Pause the attacker's attack for a brief period
//    attackerLimb.currentActionPauseTicksRemaining = Math.floor(Settings.TICK_RATE / 15);
//    attackerLimb.currentActionRate = 0.4;
//    swingAttackComponent.isBlocked = true;
//    registerDirtyEntity(swingAttack);

//    // If the block box is a shield, completely shut down the swing
//    if (blockAttackComponent.blockType === BlockType.shieldBlock) {
//       destroyEntity(swingAttack);

//       // Push back
//       const pushDirection = swingHitbox.box.position.angleTo(blockingHitbox.box.position);
//       const attackingItem = getHeldItem(attackerLimb);
//       const knockbackAmount = calculateItemKnockback(attackingItem, true);
//       applyKnockback(blockingHitbox, polarVec2(knockbackAmount, pushDirection));
//    }

//    blockAttackComponent.hasBlocked = true;

//    const blockBoxLimb = blockAttackComponent.limb;
//    const blockBoxTransformComponent = TransformComponentArray.getComponent(blockAttack);
//    const blockBoxHitbox = blockBoxTransformComponent.hitboxes[0];

//    blockBoxLimb.lastBlockTick = getGameTicks();
//    blockBoxLimb.blockPositionX = blockBoxHitbox.box.position.x;
//    blockBoxLimb.blockPositionY = blockBoxHitbox.box.position.y;
//    blockBoxLimb.blockType = blockAttackComponent.blockType;
// }

/** Cancels the shield when hit by something forceful */
const knockShield = (blockAttack: Entity, owner: Entity): void => {
   const playerComponent = PlayerComponentArray.getComponent(owner);
   
   const packet = createShieldKnockPacket();
   playerComponent.client.socket.send(packet.buffer);
}

const blockProjectile = (blockAttack: Entity, projectile: Entity, blockingHitbox: Hitbox, projectileHitbox: Hitbox, limb: LimbInfo, owner: Entity): void => {
   const heldItemComponent = HeldItemComponentArray.getComponent(blockAttack);
   
   heldItemComponent.hasBlocked = true;

   const blockBoxTransformComponent = TransformComponentArray.getComponent(blockAttack);
   const blockBoxHitbox = blockBoxTransformComponent.hitboxes[0];

   limb.lastBlockTick = getGameTicks();
   limb.blockPositionX = blockBoxHitbox.box.position.x;
   limb.blockPositionY = blockBoxHitbox.box.position.y;
   limb.blockType = heldItemComponent.blockType!;

   if (heldItemComponent.blockType! === BlockType.shieldBlock) {
      // Push back
      // @Hack: should really be done in the attachHitbox thing! cuz otherwise momentum isn't conserved!
      const projectileMomentum = getHitboxMomentum(projectileHitbox);
      applyKnockback(blockingHitbox, projectileMomentum);
      
      // Stick the projectile into the shield
      attachHitbox(projectileHitbox, blockingHitbox, false);

      if (projectileMomentum.magnitude() >= 28) {
         knockShield(blockAttack, owner);
      }
   } else {
      const projectileComponent = ProjectileComponentArray.getComponent(projectile);
      projectileComponent.isBlocked = true;
   }
}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point) {
   if (hitbox.parent === null) {
      return;
   }

   const owner = hitbox.parent.entity;
   
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(owner);
   const inventoryName = hitbox.box.flipX ? InventoryName.offhand : InventoryName.hotbar;
   const limb = inventoryUseComponent.getLimbInfo(inventoryName);

   const heldItemComponent = HeldItemComponentArray.getComponent(hitbox.entity);
   
   onSwingEntityCollision(owner, hitbox, collidingHitbox, collisionPoint, limb, heldItemComponent.itemType);

   if (heldItemComponent.blockType !== null) {
      const blockAttack = hitbox.entity;
      const collidingEntity = collidingHitbox.entity;
      
      // Block swings
      // @INCOMPLETE!
      // if (getEntityType(collidingEntity) === EntityType.swingAttack) {
      //    blockSwing(blockAttack, collidingEntity, hitbox, collidingHitbox);
      //    return;
      // }

      // Block projectiles
      if (ProjectileComponentArray.hasComponent(collidingEntity)) {
         blockProjectile(blockAttack, collidingEntity, hitbox, collidingHitbox, limb, owner);
      }

      // @HACK @Temporary for the Eastern Bowcuck Shield Advance i am putting this here so that the shield wall is useful,
      // but this might be good behaviour anyways - maybe. probably not. want to encourage people to
      // use their swords to deflect the tongue. yeah remove after.
      if (getEntityType(collidingEntity) === EntityType.okrenTongue) {
         // @INCOMPLETE
         
         // const tongueTip = collidingEntity;
         // const tongueTipTransformComponent = TransformComponentArray.getComponent(tongueTip);
         // const tongue = tongueTipTransformComponent.parentEntity;
         // const okrenTongueComponent = OkrenTongueComponentArray.getComponent(tongue);
         // startRetractingTongue(tongue, okrenTongueComponent);
         return;
      }
   }
}