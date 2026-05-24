import { randInt, Settings, EntityTickEvent, EntityTickEventType, ServerComponentType, Entity, EntityType, AttackEffectiveness, distance, Point } from "battletribes-shared";
import { runHibernateAI } from "../ai/DustfleaHibernateAI.js";
import { runEscapeAI } from "../ai/EscapeAI.js";
import { CollisionVars, entitiesAreColliding } from "../collision-detection.js";
import { getHitboxVelocity } from "../hitboxes.js";
import { registerEntityTickEvent } from "../server/player-clients.js";
import { getEntityAgeTicks, getEntityType, getGameTicks, ticksToGameHours } from "../world.js";
import { AIHelperComponent, AIHelperComponentArray } from "./AIHelperComponent.js";
import { ComponentArray } from "./ComponentArray.js";
import { getEntityFullness } from "./EnergyStomachComponent.js";
import { damageEntity } from "./HealthComponent.js";
import { attachHitbox, detachHitbox, TransformComponentArray } from "./TransformComponent.js";
import { TribeMemberComponentArray } from "./TribeMemberComponent.js";

const MIN_OBSTACLE_SIT_MODE_TICKS = 8 * Settings.TICK_RATE;
const MAX_OBSTACLE_SIT_MODE_TICKS = 16 * Settings.TICK_RATE;

export class DustfleaComponent {
   public obstacleSitModeRemainingTicks = randInt(MIN_OBSTACLE_SIT_MODE_TICKS, MAX_OBSTACLE_SIT_MODE_TICKS);
   public latchTicks = 0;
}

export const DustfleaComponentArray = new ComponentArray<DustfleaComponent>(ServerComponentType.dustflea, true, getDataLength, addDataToPacket);
DustfleaComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
DustfleaComponentArray.onWallCollision = onWallCollision;

const getSitTarget = (dustflea: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   const dustfleaTransformComponent = TransformComponentArray.getComponent(dustflea);
   const dustfleaHitbox = dustfleaTransformComponent.hitboxes[0];
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let target: Entity | null = null;
   for (const entity of aiHelperComponent.visibleEntities) {
      const entityType = getEntityType(entity);
      if (entityType !== EntityType.desertBushLively && entityType !== EntityType.desertBushSandy && entityType !== EntityType.desertShrub && entityType !== EntityType.sandstoneRock) {
         continue;
      }
      
      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityHitbox = entityTransformComponent.hitboxes[0];

      const dist = distance(dustfleaHitbox.box.posX,dustfleaHitbox.box.posY, entityHitbox.box.posX, entityHitbox.box.posY);
      if (dist < minDist) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

const entityIsSuckTarget = (entity: Entity): boolean => {
   const entityType = getEntityType(entity);
   return TribeMemberComponentArray.hasComponent(entity) || entityType === EntityType.krumblid || entityType === EntityType.zombie || entityType === EntityType.okren;
}

const getSuckTarget = (dustflea: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   const dustfleaTransformComponent = TransformComponentArray.getComponent(dustflea);
   const dustfleaHitbox = dustfleaTransformComponent.hitboxes[0];
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let target: Entity | null = null;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (!entityIsSuckTarget(entity)) {
         continue;
      }
      
      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityHitbox = entityTransformComponent.hitboxes[0];

      const dist = distance(dustfleaHitbox.box.posX, dustfleaHitbox.box.posY, entityHitbox.box.posX, entityHitbox.box.posY);
      if (dist < minDist) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

const getTargetPoopoosqueam = (dustflea: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   const dustfleaTransformComponent = TransformComponentArray.getComponent(dustflea);
   const dustfleaHitbox = dustfleaTransformComponent.hitboxes[0];
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let target: Entity | null = null;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (!TribeMemberComponentArray.hasComponent(entity)) {
         continue;
      }
      
      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityHitbox = entityTransformComponent.hitboxes[0];

      const dist = distance(dustfleaHitbox.box.posX, dustfleaHitbox.box.posY, entityHitbox.box.posX, entityHitbox.box.posY);
      if (dist < minDist) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

function onTick(dustflea: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(dustflea);
   const dustfleaTransformComponent = TransformComponentArray.getComponent(dustflea);
   const dustfleaHitbox = dustfleaTransformComponent.hitboxes[0];

   // @SQUEAM
   {
      const target = getTargetPoopoosqueam(dustflea, aiHelperComponent);
      if (target !== null) {
         const targetTransformComponent = TransformComponentArray.getComponent(target);
         const targetHitbox = targetTransformComponent.hitboxes[0];
         aiHelperComponent.moveFunc(dustflea, targetHitbox.box.posX, targetHitbox.box.posY, 250);
         aiHelperComponent.turnFunc(dustflea, targetHitbox.box.posX, targetHitbox.box.posY, 16 * Math.PI, 0.25);
         return;
      }
   }

   // If the dustflea is attached to something, don't escape at all. (To prevent it trying to hop around in escape, while on an okren, causing the okren to hop around)
   // @HACK???
   if (dustfleaHitbox.parent !== null) {
      const escapeAI = aiHelperComponent.getEscapeAI();
      if (runEscapeAI(dustflea, aiHelperComponent, escapeAI)) {
         return;
      }
   }

   const ageTicks = getEntityAgeTicks(dustflea);
   const ageHours = ticksToGameHours(ageTicks);
   if (ageHours >= 8) {
      const hibernateAI = aiHelperComponent.getDustfleaHibernateAI();
      runHibernateAI(dustflea, aiHelperComponent, hibernateAI);
      return;
   }


   // If hungry, look for a target to suck
   // Find some targets to suckle
   if (getEntityFullness(dustflea) < 0.5) {
      const suckTarget = getSuckTarget(dustflea, aiHelperComponent);
      if (suckTarget !== null) {
         if (dustfleaHitbox.parent !== null && !entityIsSuckTarget(dustfleaHitbox.parent.entity)) {
            // If the dustflea is attached to something which isn't the suck target (like a rock or something), unattach
            detachHitbox(dustfleaHitbox);
         }
         if (dustfleaHitbox.parent === null) {
            const targetTransformComponent = TransformComponentArray.getComponent(suckTarget);
            const targetHitbox = targetTransformComponent.hitboxes[0];
            aiHelperComponent.moveFunc(dustflea, targetHitbox.box.posX, targetHitbox.box.posY, 250);
            aiHelperComponent.turnFunc(dustflea, targetHitbox.box.posX, targetHitbox.box.posY, 16 * Math.PI, 0.25);
            if (entitiesAreColliding(dustflea, suckTarget) !== CollisionVars.NO_COLLISION && getHitboxVelocity(dustfleaHitbox).distanceTo(getHitboxVelocity(targetHitbox)) < 125) {
               attachHitbox(dustfleaHitbox, targetHitbox, false);

               const tickEvent: EntityTickEvent = {
                  type: EntityTickEventType.dustfleaLatch,
                  data: 0,
                  entityID: dustflea
               };
               registerEntityTickEvent(dustflea, tickEvent);

               const dustfleaComponent = DustfleaComponentArray.getComponent(dustflea);
               dustfleaComponent.latchTicks = getGameTicks() + randInt(0, Settings.TICK_RATE - 1);
            }
            return;
         }
      }
   }

   // If attached, suck
   // @TEMPORARY @HACK @Incomplete cuz this crashing rn????????
   // if (dustfleaHitbox.parent !== null && entityIsSuckTarget(dustfleaHitbox.parent.entity)) {
   //    // wriggle around
   //    const ageTicks = getEntityAgeTicks(dustflea);
   //    addHitboxAngularAcceleration(dustfleaHitbox, 8 * Math.sin((ageTicks * Settings.DT_S) * 40));
      
   //    // Suck
   //    const dustfleaComponent = DustfleaComponentArray.getComponent(dustflea);
   //    const ticksSinceLatch = ageTicks - dustfleaComponent.latchTicks;
   //    if (ticksSinceLatch % (Settings.TICK_RATE * 2) === 0) {
   //       damageEntity(dustfleaHitbox.parent.entity, dustfleaHitbox, dustflea, 1, 0, AttackEffectiveness.effective, dustfleaHitbox.box.position.copy(), 0)
   //       addHungerEnergy(dustflea, 10);
   //    }
      
   //    // Unlatch when full
   //    if (getEntityFullness(dustflea) > 0.8) {
   //       detachHitbox(dustfleaHitbox);
   //    }

   //    return;
   // }
   

   const dustfleaComponent = DustfleaComponentArray.getComponent(dustflea);
   if (dustfleaComponent.obstacleSitModeRemainingTicks > 0) {
      dustfleaComponent.obstacleSitModeRemainingTicks--;

      // obstacle site mode

      if (dustfleaHitbox.parent === null) {
         const sitTarget = getSitTarget(dustflea, aiHelperComponent);
         if (sitTarget !== null) {
            const targetTransformComponent = TransformComponentArray.getComponent(sitTarget);
            const targetHitbox = targetTransformComponent.hitboxes[0];
            aiHelperComponent.moveFunc(dustflea, targetHitbox.box.posX, targetHitbox.box.posY, 250);
            aiHelperComponent.turnFunc(dustflea, targetHitbox.box.posX, targetHitbox.box.posY, 2 * Math.PI, 0.25);
            if (entitiesAreColliding(dustflea, sitTarget) !== CollisionVars.NO_COLLISION) {
               attachHitbox(dustfleaHitbox, targetHitbox, false);
            }
            return;
         }
      } else {
         // is sitting
         return;
      }
   } else {
      if (Math.random() < 0.15 * Settings.DT_S) {
         dustfleaComponent.obstacleSitModeRemainingTicks = randInt(MIN_OBSTACLE_SIT_MODE_TICKS, MAX_OBSTACLE_SIT_MODE_TICKS);
      }
   }

   if (dustfleaHitbox.parent !== null) {
      detachHitbox(dustfleaHitbox);
   }
   
   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(dustflea);
   if (wanderAI.targetPosition !== null) {
      aiHelperComponent.moveFunc(dustflea, wanderAI.targetPosition.x, wanderAI.targetPosition.y, wanderAI.acceleration);
      aiHelperComponent.turnFunc(dustflea, wanderAI.targetPosition.x, wanderAI.targetPosition.y, wanderAI.turnSpeed, wanderAI.turnDamping);
   }
}

function onWallCollision(dustflea: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(dustflea);
   const dustfleaHitbox = transformComponent.hitboxes[0];

   // Die when crushed against a wall
   if (dustfleaHitbox.parent !== null) {
      damageEntity(dustfleaHitbox, null, 999, 0, AttackEffectiveness.effective, new Point(dustfleaHitbox.box.posX, dustfleaHitbox.box.posY), 0);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}