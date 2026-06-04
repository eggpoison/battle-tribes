import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity, EntityType } from "../../../shared/dist/entities.js";
import { AttackEffectiveness } from "../../../shared/dist/entity-damage-types.js";
import { Packet } from "../../../shared/dist/packets.js";
import { Point } from "../../../shared/dist/utils.js";
import { Bytes } from "../../../shared/dist/constants.js";
import { ComponentArray } from "./ComponentArray.js";
import { getEntityType } from "../world.js";
import { HealthComponentArray, canDamageEntity, addLocalInvulnerabilityHash, damageEntity } from "./HealthComponent.js";
import { getEntityRelationship, EntityRelationship } from "./TribeComponent.js";
import { Hitbox } from "../hitboxes.js";

export class SpikesComponent {
   public isCovered = false;
}

export const SpikesComponentArray = new ComponentArray<SpikesComponent>(ServerComponentType.spikes, true, getDataLength, addDataToPacket);
SpikesComponentArray.onHitboxCollision = onHitboxCollision;

function getDataLength(): number {
   return Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const spikesComponent = SpikesComponentArray.getComponent(entity);
   packet.writeBool(spikesComponent.isCovered);
}

// @Cleanup: Copy and paste
function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const spikes = hitbox.entity;
   const collidingEntity = collidingHitbox.entity;
   
   // @Incomplete: Why is this condition neeeded? Shouldn't be able to be placed colliding with other structures anyway.
   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.floorSpikes || collidingEntityType === EntityType.wallSpikes || collidingEntityType === EntityType.door || collidingEntityType === EntityType.wall) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   // Don't collide with friendly entities if the spikes are covered
   const spikesComponent = SpikesComponentArray.getComponent(spikes);
   if (spikesComponent.isCovered && getEntityRelationship(spikes, collidingEntity) === EntityRelationship.friendly) {
      return;
   }

   // Reveal
   spikesComponent.isCovered = false;

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "woodenSpikes")) {
      return;
   }
   
   // @Incomplete: Cause of death, damage source
   damageEntity(collidingHitbox, spikes, 1, 0, AttackEffectiveness.effective, collisionPoint, 0)
   addLocalInvulnerabilityHash(collidingEntity, "woodenSpikes", 0.3);
}