import { Entity, EntityType, FishColour, DamageSource } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import { Packet } from "battletribes-shared/packets";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { InventoryName, ItemType } from "battletribes-shared/items/items";
import { Settings } from "battletribes-shared/settings";
import { TileType } from "battletribes-shared/tiles";
import { customTickIntervalHasPassed, Point, polarVec2, randAngle, randFloat, randSign, UtilVar } from "battletribes-shared/utils";
import { runHerdAI } from "../ai-shared";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { runEscapeAI } from "../ai/EscapeAI";
import { damageEntity, HealthComponentArray, canDamageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { InventoryComponentArray, hasInventory, getInventory } from "./InventoryComponent";
import { TransformComponentArray, getRandomPositionInEntity } from "./TransformComponent";
import { entityExists, getEntityLayer, getEntityType } from "../world";
import { TribesmanComponentArray } from "./TribesmanComponent";
import { CollisionVars, entitiesAreColliding } from "../collision-detection";
import { applyAccelerationFromGround, applyKnockback, getHitboxTile, Hitbox, addHitboxVelocity, addHitboxAngularVelocity } from "../hitboxes";

const enum Vars {
   TURN_SPEED = UtilVar.PI / 1.5,

   ACCELERATION = 40,
   
   TURN_RATE = 0.5,
   SEPARATION_INFLUENCE = 0.7,
   ALIGNMENT_INFLUENCE = 0.5,
   COHESION_INFLUENCE = 0.3,
   MIN_SEPARATION_DISTANCE = 40
}

export class FishComponent {
   public readonly colour: FishColour;

   public flailTimer = 0;
   public secondsOutOfWater = 0;

   public leader: Entity | null = null;
   public attackTargetID = 0;

   constructor(colour: FishColour) {
      this.colour = colour;
   }
}

export const FishComponentArray = new ComponentArray<FishComponent>(ServerComponentType.fish, true, getDataLength, addDataToPacket);
FishComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
FishComponentArray.onRemove = onRemove;

const followLeader = (fish: Entity, leader: Entity): void => {
   const tribesmanComponent = TribesmanComponentArray.getComponent(leader);
   tribesmanComponent.fishFollowerIDs.push(fish);
}

const entityIsWearingFishlordSuit = (entityID: number): boolean => {
   if (!InventoryComponentArray.hasComponent(entityID)) {
      return false;
   }

   const inventoryComponent = InventoryComponentArray.getComponent(entityID);
   if (!hasInventory(inventoryComponent, InventoryName.armourSlot)) {
      return false;
   }
   
   const armourInventory = getInventory(inventoryComponent, InventoryName.armourSlot);

   const armour = armourInventory.itemSlots[1];
   return typeof armour !== "undefined" && armour.type === ItemType.fishlord_suit;
}

const unfollowLeader = (fish: Entity, leader: Entity): void => {
   const tribesmanComponent = TribesmanComponentArray.getComponent(leader);
   const idx = tribesmanComponent.fishFollowerIDs.indexOf(fish);
   if (idx !== -1) {
      tribesmanComponent.fishFollowerIDs.splice(idx, 1);
   }
}

function onTick(fish: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(fish);
   const fishHitbox = transformComponent.hitboxes[0];
   
   const fishComponent = FishComponentArray.getComponent(fish);

   const tileIndex = getHitboxTile(fishHitbox);
   const layer = getEntityLayer(fish)
   const tileType = layer.tileTypes[tileIndex];

   transformComponent.overrideMoveSpeedMultiplier = tileType === TileType.water;

   if (tileType !== TileType.water) {
      fishComponent.secondsOutOfWater += Settings.DT_S;
      if (fishComponent.secondsOutOfWater >= 5 && customTickIntervalHasPassed(fishComponent.secondsOutOfWater * Settings.TICK_RATE, 1.5)) {
         const hitPosition = getRandomPositionInEntity(transformComponent);
         damageEntity(fishHitbox, null, 1, DamageSource.lackOfOxygen, AttackEffectiveness.effective, hitPosition, 0);
      }
   } else {
      fishComponent.secondsOutOfWater = 0;
   }
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(fish);

   // If the leader dies or is out of vision range, stop following them
   if (fishComponent.leader !== null && (!entityExists(fishComponent.leader) || !aiHelperComponent.visibleEntities.includes(fishComponent.leader))) {
      unfollowLeader(fish, fishComponent.leader);
      fishComponent.leader = null;
   }

   // Look for a leader
   if (fishComponent.leader === null) {
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (entityIsWearingFishlordSuit(entity)) {
            // New leader
            fishComponent.leader = entity;
            followLeader(fish, entity);
            break;
         }
      }
   }

   // If a tribe member is wearing a fishlord suit, follow them
   if (fishComponent.leader !== null) {
      const target = fishComponent.attackTargetID;
      if (entityExists(target)) {
         const leaderTransformComponent = TransformComponentArray.getComponent(fishComponent.leader);
         const leaderHitbox = leaderTransformComponent.hitboxes[0];
         
         // Follow leader
         aiHelperComponent.moveFunc(fish, leaderHitbox.box.position, 40);
         aiHelperComponent.turnFunc(fish, leaderHitbox.box.position, Math.PI / 1.5, 0.5);
      } else {
         const targetTransformComponent = TransformComponentArray.getComponent(target);
         const targetHitbox = targetTransformComponent.hitboxes[0];

         // Attack the target
         aiHelperComponent.moveFunc(fish, targetHitbox.box.position, 40);
         aiHelperComponent.turnFunc(fish, targetHitbox.box.position, Math.PI / 1.5, 0.5);

         if (entitiesAreColliding(fish, target) !== CollisionVars.NO_COLLISION) {
            const healthComponent = HealthComponentArray.getComponent(target);
            if (!canDamageEntity(healthComponent, "fish")) {
               return;
            }
            
            const hitDirection = fishHitbox.box.position.angleTo(targetHitbox.box.position);

            // @Hack
            const collisionPoint = new Point((fishHitbox.box.position.x + targetHitbox.box.position.x) / 2, (fishHitbox.box.position.y + targetHitbox.box.position.y) / 2);
            
            damageEntity(targetHitbox, fish, 2, DamageSource.fish, AttackEffectiveness.effective, collisionPoint, 0);
            applyKnockback(targetHitbox, polarVec2(100, hitDirection));
            addLocalInvulnerabilityHash(target, "fish", 0.3);
         }
      }
      return;
   }
   
   // Flail on the ground when out of water
   if (tileType !== TileType.water) {
      fishComponent.flailTimer += Settings.DT_S;
      if (fishComponent.flailTimer >= 0.75) {
         const flailDirection = randAngle();
         
         addHitboxAngularVelocity(fishHitbox, randFloat(1.5, 2.2) * randSign());
         addHitboxVelocity(fishHitbox, polarVec2(200, flailDirection));
   
         fishComponent.flailTimer = 0;
      }

      return;
   }

   // Escape AI
   const escapeAI = aiHelperComponent.getEscapeAI();
   if (runEscapeAI(fish, aiHelperComponent, escapeAI)) {
      return;
   }

   // Herd AI
   // @Incomplete: Make fish steer away from land
   const herdMembers = new Array<Entity>();
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      if (getEntityType(entity) === EntityType.fish) {
         herdMembers.push(entity);
      }
   }
   if (herdMembers.length >= 1) {
      runHerdAI(fish, herdMembers, aiHelperComponent.visionRange, Vars.TURN_RATE, Vars.MIN_SEPARATION_DISTANCE, Vars.SEPARATION_INFLUENCE, Vars.ALIGNMENT_INFLUENCE, Vars.COHESION_INFLUENCE);

      applyAccelerationFromGround(fishHitbox, polarVec2(100, fishHitbox.box.angle));
      return;
   }

   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(fish);
   if (wanderAI.targetPosition !== null) {
      aiHelperComponent.moveFunc(fish, wanderAI.targetPosition, wanderAI.acceleration);
      aiHelperComponent.turnFunc(fish, wanderAI.targetPosition, wanderAI.turnSpeed, wanderAI.turnDamping);
   }
}

function onRemove(entity: Entity): void {
   // Remove the fish from its leaders' follower array
   const fishComponent = FishComponentArray.getComponent(entity);
   if (fishComponent.leader !== null) {
      unfollowLeader(entity, fishComponent.leader);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const fishComponent = FishComponentArray.getComponent(entity);

   packet.writeNumber(fishComponent.colour);
}