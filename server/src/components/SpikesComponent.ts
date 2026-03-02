import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";
import { getEntityType } from "../world";
import { HealthComponentArray, canDamageEntity, addLocalInvulnerabilityHash, damageEntity } from "./HealthComponent";
import { getEntityRelationship, EntityRelationship } from "./TribeComponent";
import { Hitbox } from "../hitboxes";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Point } from "../../../shared/src/utils";

export class SpikesComponent {
   public isCovered = false;
}

export const SpikesComponentArray = new ComponentArray<SpikesComponent>(ServerComponentType.spikes, true, getDataLength, addDataToPacket);
SpikesComponentArray.onHitboxCollision = onHitboxCollision;

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
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