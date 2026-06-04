import { Bytes } from "../../../shared/dist/constants.js";
import { ComponentArray } from "./ComponentArray.js";
import { runHerdAI } from "../ai-shared.js";
import { AIHelperComponentArray } from "./AIHelperComponent.js";
import { runEscapeAI } from "../ai/EscapeAI.js";
import { damageEntity, HealthComponentArray, canDamageEntity, addLocalInvulnerabilityHash } from "./HealthComponent.js";
import { InventoryComponentArray, hasInventory, getInventory } from "./InventoryComponent.js";
import { TransformComponentArray, getRandomPositionInEntity } from "./TransformComponent.js";
import { entityExists, getEntityLayer, getEntityType } from "../world.js";
import { TribesmanComponentArray } from "./TribesmanComponent.js";
import { CollisionVars, entitiesAreColliding } from "../collision-detection.js";
import { applyAccelerationFromGround, applyKnockback, getHitboxTile, Hitbox, addHitboxVelocity, addHitboxAngularVelocity } from "../hitboxes.js";
import { ServerComponentType } from "../../../shared/dist/components.js";
import { FishColour, Entity, DamageSource, EntityType } from "../../../shared/dist/entities.js";
import { AttackEffectiveness } from "../../../shared/dist/entity-damage-types.js";
import { InventoryName, ItemType } from "../../../shared/dist/items/items.js";
import { Packet } from "../../../shared/dist/packets.js";
import { Settings } from "../../../shared/dist/settings.js";
import { TileType } from "../../../shared/dist/tiles.js";
import { UtilVar, customTickIntervalHasPassed, angle, Point, polarVec2, randAngle, randFloat, randSign } from "../../../shared/dist/utils.js";

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
   return armour !== undefined && armour.type === ItemType.fishlord_suit;
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
         aiHelperComponent.moveFunc(fish, leaderHitbox.box.posX, leaderHitbox.box.posY, 40);
         aiHelperComponent.turnFunc(fish, leaderHitbox.box.posX, leaderHitbox.box.posY, Math.PI / 1.5, 0.5);
      } else {
         const targetTransformComponent = TransformComponentArray.getComponent(target);
         const targetHitbox = targetTransformComponent.hitboxes[0];

         // Attack the target
         aiHelperComponent.moveFunc(fish, targetHitbox.box.posX, targetHitbox.box.posY, 40);
         aiHelperComponent.turnFunc(fish, targetHitbox.box.posX, targetHitbox.box.posY, Math.PI / 1.5, 0.5);

         if (entitiesAreColliding(fish, target) !== CollisionVars.NO_COLLISION) {
            const healthComponent = HealthComponentArray.getComponent(target);
            if (!canDamageEntity(healthComponent, "fish")) {
               return;
            }
            
            const hitDirection = angle(targetHitbox.box.posX - fishHitbox.box.posX, targetHitbox.box.posY - fishHitbox.box.posY);

            // @Hack
            const collisionPoint = new Point((fishHitbox.box.posX + targetHitbox.box.posX) / 2, (fishHitbox.box.posY + targetHitbox.box.posY) / 2);
            
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
   const herdMembers: Array<Entity> = [];
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
      aiHelperComponent.moveFunc(fish, wanderAI.targetPosition.x, wanderAI.targetPosition.y, wanderAI.acceleration);
      aiHelperComponent.turnFunc(fish, wanderAI.targetPosition.x, wanderAI.targetPosition.y, wanderAI.turnSpeed, wanderAI.turnDamping);
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
   return Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const fishComponent = FishComponentArray.getComponent(entity);

   packet.writeNumber(fishComponent.colour);
}