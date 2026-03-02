import { Entity } from "battletribes-shared/entities";
import { AttackingEntitiesComponentArray } from "../components/AttackingEntitiesComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import { AIHelperComponent, AIHelperComponentArray, AIType } from "../components/AIHelperComponent";
import { Hitbox } from "../hitboxes";
import { Point } from "../../../shared/src/utils";
import { Settings } from "../../../shared/src/settings";

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
      
      const distance = entityHitbox.box.position.distanceTo(attackingEntityHitbox.box.position);
      if (distance < minDistance) {
         minDistance = distance;
         escapeEntity = attackingEntity;
      }
   }

   if (typeof escapeAI.extraEscapeCondition !== "undefined") {
      for (const escapeTarget of aiHelperComponent.visibleEntities) {
         if (!escapeAI.extraEscapeCondition(entity, escapeTarget)) {
            continue;
         }
      
         const escapeTargetTransformComponent = TransformComponentArray.getComponent(escapeTarget);
         // @Hack
         const escapeTargetHitbox = escapeTargetTransformComponent.hitboxes[0];
         
         const distance = entityHitbox.box.position.distanceTo(escapeTargetHitbox.box.position);
         if (distance < minDistance) {
            minDistance = distance;
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
      escapePosition = escapeTargetHitbox.box.position.copy();
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

   const targetX = hitbox.box.position.x * 2 - escapePosition.x;
   const targetY = hitbox.box.position.y * 2 - escapePosition.y;
   const targetPos = new Point(targetX, targetY);

   aiHelperComponent.moveFunc(entity, targetPos, escapeAI.acceleration);
   aiHelperComponent.turnFunc(entity, targetPos, escapeAI.turnSpeed, escapeAI.turnDamping);

   return true;
}