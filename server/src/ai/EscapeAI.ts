import { AttackingEntitiesComponentArray } from "../components/AttackingEntitiesComponent.js";
import { TransformComponentArray } from "../components/TransformComponent.js";
import { AIHelperComponent, AIHelperComponentArray, AIType } from "../components/AIHelperComponent.js";
import { Entity } from "../../../shared/dist/entities.js";
import { Settings } from "../../../shared/dist/settings.js";
import { Point, distance } from "../../../shared/dist/utils.js";

export type ExtraEscapeCondition = (entity: Entity, escapeTarget: Entity) => boolean;

export class EscapeAI {
   public readonly acceleration: number;
   public readonly turnSpeed: number;
   public readonly turnDamping: number;

   public readonly escapeTargetRememberTime: number;
   public lastEscapeTargetPosition = new Point(0, 0);
   public remainingRememberTicks = 0;
   
   public readonly extraEscapeCondition?: ExtraEscapeCondition;

   constructor(acceleration: number, turnSpeed: number, turnDamping: number, escapeTargetRememberTime: number, extraEscapeCondition?: ExtraEscapeCondition) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
      this.turnDamping = turnDamping;
      this.escapeTargetRememberTime = escapeTargetRememberTime;
      this.extraEscapeCondition = extraEscapeCondition;
   }
}

export function shouldRunEscapeAI(entity: Entity): boolean {
   const attackingEntitiesComponent = AttackingEntitiesComponentArray.getComponent(entity);
   return attackingEntitiesComponent.attackingEntities.size > 0;
}

const getEscapeTarget = (entity: Entity, escapeAI: EscapeAI): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   // @Hack
   const entityHitbox = transformComponent.hitboxes[0];
   
   const attackingEntitiesComponent = AttackingEntitiesComponentArray.getComponent(entity);
   const aiHelperComponent = AIHelperComponentArray.getComponent(entity);
   
   let minDistance = Number.MAX_SAFE_INTEGER;
   let escapeEntity: Entity | null = null;

   for (const pair of attackingEntitiesComponent.attackingEntities) {
      const attackingEntity = pair[0];

      // Don't escape from entities which aren't visible
      if (!aiHelperComponent.visibleEntities.includes(attackingEntity)) {
         continue;
      }
      
      const attackingEntityTransformComponent = TransformComponentArray.getComponent(attackingEntity);
      // @Hack
      const attackingEntityHitbox = attackingEntityTransformComponent.hitboxes[0];
      
      const dist = distance(entityHitbox.box.posX, entityHitbox.box.posY, attackingEntityHitbox.box.posX, attackingEntityHitbox.box.posY);
      if (dist < minDistance) {
         minDistance = dist;
         escapeEntity = attackingEntity;
      }
   }

   if (escapeAI.extraEscapeCondition !== undefined) {
      for (const escapeTarget of aiHelperComponent.visibleEntities) {
         if (!escapeAI.extraEscapeCondition(entity, escapeTarget)) {
            continue;
         }
      
         const escapeTargetTransformComponent = TransformComponentArray.getComponent(escapeTarget);
         // @Hack
         const escapeTargetHitbox = escapeTargetTransformComponent.hitboxes[0];
         
         const dist = distance(entityHitbox.box.posX, entityHitbox.box.posY, escapeTargetHitbox.box.posX, escapeTargetHitbox.box.posY);
         if (dist < minDistance) {
            minDistance = dist;
            escapeEntity = escapeTarget;
         }
      }
   }

   return escapeEntity;
}

export function runEscapeAI(entity: Entity, aiHelperComponent: AIHelperComponent, escapeAI: EscapeAI): boolean {
   const escapeTarget = getEscapeTarget(entity, escapeAI);

   let escapePosition: Point;
   if (escapeTarget !== null) {
      const escapeTargetTransformComponent = TransformComponentArray.getComponent(escapeTarget);
      const escapeTargetHitbox = escapeTargetTransformComponent.hitboxes[0];

      escapePosition = new Point(escapeTargetHitbox.box.posX, escapeTargetHitbox.box.posY);
      escapeAI.lastEscapeTargetPosition = escapePosition;
      escapeAI.remainingRememberTicks = escapeAI.escapeTargetRememberTime * Settings.TICK_RATE;
   } else if (escapeAI.remainingRememberTicks > 0) {
      escapePosition = escapeAI.lastEscapeTargetPosition;
   } else {
      return false;
   }

   if (escapeAI.remainingRememberTicks > 0) {
      escapeAI.remainingRememberTicks--;
   }
   
   aiHelperComponent.currentAIType = AIType.escape;

   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   const targetX = hitbox.box.posX * 2 - escapePosition.x;
   const targetY = hitbox.box.posY * 2 - escapePosition.y;

   aiHelperComponent.moveFunc(entity, targetX, targetY, escapeAI.acceleration);
   aiHelperComponent.turnFunc(entity, targetX, targetY, escapeAI.turnSpeed, escapeAI.turnDamping);

   return true;
}