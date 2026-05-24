import { distance, Entity } from "battletribes-shared";
import { moveEntityToEntity } from "../ai-shared.js";
import { AIHelperComponent, AIHelperComponentArray } from "../components/AIHelperComponent.js";
import { GuardianComponent, GuardianComponentArray } from "../components/GuardianComponent.js";
import { GuardianSpikyBallComponentArray } from "../components/GuardianSpikyBallComponent.js";
import { HealthComponentArray } from "../components/HealthComponent.js";
import { TransformComponent, TransformComponentArray } from "../components/TransformComponent.js";
import { getHitboxTile } from "../hitboxes.js";

const entityIsTargetted = (guardianComponent: GuardianComponent, target: Entity, targetTransformComponent: TransformComponent): boolean => {
   if (!HealthComponentArray.hasComponent(target)) {
      return false;
   }

   // Don't attack other guardians
   if (GuardianComponentArray.hasComponent(target)) {
      return false;
   }

   // Don't attack spiky balls
   if (GuardianSpikyBallComponentArray.hasComponent(target)) {
      return false;
   }
   
   // @Hack
   const hitbox = targetTransformComponent.hitboxes[0];
   const entityTile = getHitboxTile(hitbox);
   return guardianComponent.homeTiles.includes(entityTile);
}

const getTarget = (transformComponent: TransformComponent, guardianComponent: GuardianComponent, aiHelperComponent: AIHelperComponent): Entity | null => {
   const hitbox = transformComponent.hitboxes[0];
   
   let target: Entity | null = null;
   let minDist = Number.MAX_SAFE_INTEGER;
   
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];

      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityHitbox = entityTransformComponent.hitboxes[0];
      
      const dist = distance(hitbox.box.posX, hitbox.box.posY, entityHitbox.box.posX, entityHitbox.box.posY);
      if (dist < minDist && entityIsTargetted(guardianComponent, entity, entityTransformComponent)) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

export default class GuardianAI {
   private readonly acceleration: number;
   private readonly turnSpeed: number;
   
   constructor(acceleration: number, turnSpeed: number) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
   }
   public getTarget(guardian: Entity): Entity | null {
      const transformComponent = TransformComponentArray.getComponent(guardian);
      const guardianComponent = GuardianComponentArray.getComponent(guardian);
      const aiHelperComponent = AIHelperComponentArray.getComponent(guardian);

      const target = getTarget(transformComponent, guardianComponent, aiHelperComponent);
      return target;
   }
   
   public run(guardian: Entity, target: Entity): void {
      // Move towards the target
      moveEntityToEntity(guardian, target, this.acceleration, this.turnSpeed);
   }
}