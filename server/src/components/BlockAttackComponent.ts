import { BlockType, ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { InventoryName } from "../../../shared/src/items/items";
import { Packet } from "../../../shared/src/packets";
import { Settings } from "../../../shared/src/settings";
import { Point, polarVec2 } from "../../../shared/src/utils";
import { calculateItemKnockback } from "../entities/tribes/limb-use";
import { applyKnockback, getHitboxMomentum, Hitbox } from "../hitboxes";
import { createShieldKnockPacket } from "../server/packet-sending";
import { registerDirtyEntity } from "../server/player-clients";
import { destroyEntity, entityExists, getEntityType, getGameTicks } from "../world";
import { ComponentArray } from "./ComponentArray";
import { getCurrentLimbState, getHeldItem, LimbInfo } from "./InventoryUseComponent";
import { PlayerComponentArray } from "./PlayerComponent";
import { ProjectileComponentArray } from "./ProjectileComponent";
import { setHitboxToLimbState, SwingAttackComponentArray } from "./SwingAttackComponent";
import { attachHitbox, TransformComponentArray } from "./TransformComponent";

export class BlockAttackComponent {
   public readonly owner: Entity;
   public readonly limb: LimbInfo;
   public readonly blockType: BlockType;
   // @Cleanup: Is this necessary? Could we do it with just a tick event?
   // @Hack: surely this shouldn't exist - shields can block multiple times
   public hasBlocked = false;

   constructor(owner: Entity, limb: LimbInfo, blockType: BlockType) {
      this.owner = owner;
      this.limb = limb;
      this.blockType = blockType;
   }
}

export const BlockAttackComponentArray = new ComponentArray<BlockAttackComponent>(ServerComponentType.blockAttack, true, getDataLength, addDataToPacket);
BlockAttackComponentArray.onHitboxCollision = onHitboxCollision;
BlockAttackComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const blockAttackComponent = BlockAttackComponentArray.getComponent(entity);
   packet.writeBool(blockAttackComponent.hasBlocked);
}

// @COPYNPASTE from the ditto in SwingAttackComponent
function onTick(blockAttack: Entity): void {
   // @HACK: this is garbage and may cause the hitbox to lag behind. should instead bind the entity to the limb hitbox. . .
   
   const transformComponent = TransformComponentArray.getComponent(blockAttack);
   const limbHitbox = transformComponent.hitboxes[0];
   
   const blockAttackComponent = BlockAttackComponentArray.getComponent(blockAttack);
   const limb = blockAttackComponent.limb;

   // @HACK @TEMPORARY! here cuz somtimes ownerTransformComponent is undefined (???) which crashes the server
   if (!entityExists(blockAttackComponent.owner)) {
      return;
   }
   
   const isFlipped = limb.associatedInventory.name === InventoryName.offhand;
   const ownerTransformComponent = TransformComponentArray.getComponent(blockAttackComponent.owner);
   setHitboxToLimbState(ownerTransformComponent, transformComponent, limbHitbox, getCurrentLimbState(limb), isFlipped);
}

const blockSwing = (blockAttack: Entity, swingAttack: Entity, blockingHitbox: Hitbox, swingHitbox: Hitbox): void => {
   const blockAttackComponent = BlockAttackComponentArray.getComponent(blockAttack);

   const swingAttackComponent = SwingAttackComponentArray.getComponent(swingAttack);
   const attackerLimb = swingAttackComponent.limb;

   // Pause the attacker's attack for a brief period
   attackerLimb.currentActionPauseTicksRemaining = Math.floor(Settings.TICK_RATE / 15);
   attackerLimb.currentActionRate = 0.4;
   swingAttackComponent.isBlocked = true;
   registerDirtyEntity(swingAttack);

   // If the block box is a shield, completely shut down the swing
   if (blockAttackComponent.blockType === BlockType.shieldBlock) {
      destroyEntity(swingAttack);

      // Push back
      const pushDirection = swingHitbox.box.position.angleTo(blockingHitbox.box.position);
      const attackingItem = getHeldItem(attackerLimb);
      const knockbackAmount = calculateItemKnockback(attackingItem, true);
      applyKnockback(blockingHitbox, polarVec2(knockbackAmount, pushDirection));
   }

   blockAttackComponent.hasBlocked = true;

   const blockBoxLimb = blockAttackComponent.limb;
   const blockBoxTransformComponent = TransformComponentArray.getComponent(blockAttack);
   const blockBoxHitbox = blockBoxTransformComponent.hitboxes[0];

   blockBoxLimb.lastBlockTick = getGameTicks();
   blockBoxLimb.blockPositionX = blockBoxHitbox.box.position.x;
   blockBoxLimb.blockPositionY = blockBoxHitbox.box.position.y;
   blockBoxLimb.blockType = blockAttackComponent.blockType;
}

/** Cancels the shield when hit by something forceful */
const knockShield = (blockAttack: Entity, blockAttackComponent: BlockAttackComponent): void => {
   const playerComponent = PlayerComponentArray.getComponent(blockAttackComponent.owner);
   
   const packet = createShieldKnockPacket();
   playerComponent.client.socket.send(packet.buffer);
}

const blockProjectile = (blockAttack: Entity, projectile: Entity, blockingHitbox: Hitbox, projectileHitbox: Hitbox): void => {
   const blockAttackComponent = BlockAttackComponentArray.getComponent(blockAttack);

   blockAttackComponent.hasBlocked = true;

   const blockBoxLimb = blockAttackComponent.limb;
   const blockBoxTransformComponent = TransformComponentArray.getComponent(blockAttack);
   const blockBoxHitbox = blockBoxTransformComponent.hitboxes[0];

   blockBoxLimb.lastBlockTick = getGameTicks();
   blockBoxLimb.blockPositionX = blockBoxHitbox.box.position.x;
   blockBoxLimb.blockPositionY = blockBoxHitbox.box.position.y;
   blockBoxLimb.blockType = blockAttackComponent.blockType;

   if (blockAttackComponent.blockType === BlockType.shieldBlock) {
      // Push back
      // @Hack: should really be done in the attachHitbox thing! cuz otherwise momentum isn't conserved!
      const projectileMomentum = getHitboxMomentum(projectileHitbox);
      applyKnockback(blockingHitbox, projectileMomentum);
      
      // Stick the projectile into the shield
      attachHitbox(projectileHitbox, blockingHitbox, false);

      console.log(projectileMomentum.magnitude())
      if (projectileMomentum.magnitude() >= 30) {
         knockShield(blockAttack, blockAttackComponent);
      }
   } else {
      const projectileComponent = ProjectileComponentArray.getComponent(projectile);
      projectileComponent.isBlocked = true;
   }
}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const blockAttack = hitbox.entity;
   const collidingEntity = collidingHitbox.entity;
   
   // Block swings
   if (getEntityType(collidingEntity) === EntityType.swingAttack) {
      blockSwing(blockAttack, collidingEntity, hitbox, collidingHitbox);
      return;
   }

   // Block projectiles
   if (ProjectileComponentArray.hasComponent(collidingEntity)) {
      blockProjectile(blockAttack, collidingEntity, hitbox, collidingHitbox);
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