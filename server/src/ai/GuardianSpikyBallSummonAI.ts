import { GuardianSpikyBallSummonStage, ServerComponentType } from "../../../shared/src/components";
import { EntityID } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { UtilVars, randFloat, randInt } from "../../../shared/src/utils";
import { stopEntity, turnToPosition } from "../ai-shared";
import { GuardianComponentArray } from "../components/GuardianComponent";
import { PhysicsComponentArray } from "../components/PhysicsComponent";
import { createGuardianSpikyBallConfig } from "../entities/projectiles/guardian-spiky-ball";
import { createEntityFromConfig } from "../Entity";
import { getTileIndexFromPos } from "../Layer";
import { getEntityLayer, getGameTicks } from "../world";

const enum Vars {
   WINDUP_TIME_TICKS = (1.5 * Settings.TPS) | 0,
   FOCUS_DURATION_TICKS = (2.5 * Settings.TPS) | 0,
   RETURN_TIME_TICKS = (1 * Settings.TPS) | 0,

   LIMB_DIRECTION = UtilVars.PI * 0.5
}

const createSpikyBall = (guardian: EntityID, targetX: number, targetY: number): void => {
   const layer = getEntityLayer(guardian);
   
   // Find a valid spawn spot for the spiky ball
   let hasFound = false;
   let x: number;
   let y: number;
   for (let attempts = 0; attempts < 50; attempts++) {
      const offsetMagnitude = randFloat(80, 196);
      const offsetDirection = 2 * Math.PI * Math.random();
      x = targetX + offsetMagnitude * Math.sin(offsetDirection);
      y = targetY + offsetMagnitude * Math.cos(offsetDirection);

      const tileIndex = getTileIndexFromPos(x, y);
      if (!layer.tileIsWall(tileIndex)) {
         hasFound = true;
         break;
      }
   }
   
   if (hasFound) {
      const velocityMagnitude = 150;
      const velocityDirection = 2 * Math.PI * Math.random();
      const vx = velocityMagnitude * Math.sin(velocityDirection);
      const vy = velocityMagnitude * Math.cos(velocityDirection);
      
      const config = createGuardianSpikyBallConfig(guardian);
      config.components[ServerComponentType.transform].position.x = x!;
      config.components[ServerComponentType.transform].position.y = y!;
      config.components[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      config.components[ServerComponentType.physics].externalVelocity.x = vx;
      config.components[ServerComponentType.physics].externalVelocity.y = vy;
      config.components[ServerComponentType.physics].angularVelocity = Math.PI;
      createEntityFromConfig(config, layer, 0);
   }
}

export default class GuardianSpikyBallSummonAI {
   private readonly turnSpeed: number;
   
   private spikyBallSpawnTicks = new Array<number>();
   
   private windupProgressTicks = 0;
   private focusProgressTicks = 0;
   private returnProgressTicks = 0;

   public stage = GuardianSpikyBallSummonStage.windup;
   public stageProgress = 0;
   
   constructor(turnSpeed: number) {
      this.turnSpeed = turnSpeed;
   }
   
   public run(guardian: EntityID, targetX: number, targetY: number): void {
      const physicsComponent = PhysicsComponentArray.getComponent(guardian);
      stopEntity(physicsComponent);
      turnToPosition(guardian, targetX, targetY, this.turnSpeed);

      const guardianComponent = GuardianComponentArray.getComponent(guardian);
      if (this.windupProgressTicks < Vars.WINDUP_TIME_TICKS) {
         this.windupProgressTicks++;
         this.stage = GuardianSpikyBallSummonStage.windup;

         let progress = this.windupProgressTicks / Vars.WINDUP_TIME_TICKS;
         this.stageProgress = progress;

         guardianComponent.setLimbGemActivations(guardian, 0, 0, progress);
      } else if (this.focusProgressTicks < Vars.FOCUS_DURATION_TICKS) {
         // At start, determine number of spiky balls to spawn and when to spawn them
         if (this.focusProgressTicks === 0) {
            const numSpikyBalls = randInt(2, 3);

            this.spikyBallSpawnTicks = [];
            const currentTime = getGameTicks();
            for (let i = 0; i < numSpikyBalls; i++) {
               const timeOffsetFactor = (i + 1) / (numSpikyBalls + 1);
               const spawnDelayTicks = Math.round(Vars.FOCUS_DURATION_TICKS * timeOffsetFactor);

               const timestamp = currentTime + spawnDelayTicks;
               this.spikyBallSpawnTicks.push(timestamp);
            }
         }

         // Create spiky balls
         if (this.spikyBallSpawnTicks.includes(getGameTicks())) {
            createSpikyBall(guardian, targetX, targetY);
         }
         
         this.focusProgressTicks++;
         this.stage = GuardianSpikyBallSummonStage.focus;

         const progress = this.focusProgressTicks / Vars.FOCUS_DURATION_TICKS;
         this.stageProgress = progress;
      } else if (this.returnProgressTicks < Vars.RETURN_TIME_TICKS) {
         this.returnProgressTicks++;
         this.stage = GuardianSpikyBallSummonStage.return;

         // Return limbs to normal
         let progress = this.returnProgressTicks / Vars.RETURN_TIME_TICKS;
         this.stageProgress = progress;

         guardianComponent.setLimbGemActivations(guardian, 0, 0, 1 - progress);
      } else {
         // @Incomplete: should instead reset the progress ticks when the attack is first being done
         // Attack is done!
         this.windupProgressTicks = 0;
         this.focusProgressTicks = 0;
         this.returnProgressTicks = 0;
         this.stage = GuardianSpikyBallSummonStage.windup;
         this.stageProgress = 0;
         guardianComponent.stopSpecialAttack(guardian);
      }
   }
}