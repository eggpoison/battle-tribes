import { GuardianSpikyBallSummonStage, ServerComponentType } from "battletribes-shared/components";
import { Entity } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, UtilVars, randAngle, randFloat, randInt } from "battletribes-shared/utils";
import { turnToPosition } from "../ai-shared";
import { GuardianComponentArray } from "../components/GuardianComponent";
import { createGuardianSpikyBallConfig } from "../entities/projectiles/guardian-spiky-ball";
import { createEntity, getEntityLayer, getGameTicks } from "../world";
import { addHitboxAngularVelocity, Hitbox, setHitboxVelocity } from "../hitboxes";

const enum Vars {
   WINDUP_TIME_TICKS = (1.5 * Settings.TICK_RATE) | 0,
   FOCUS_DURATION_TICKS = (2.5 * Settings.TICK_RATE) | 0,
   RETURN_TIME_TICKS = (1 * Settings.TICK_RATE) | 0,

   LIMB_DIRECTION = UtilVars.PI * 0.5
}

const createSpikyBall = (guardian: Entity, targetX: number, targetY: number): void => {
   const layer = getEntityLayer(guardian);
   
   // Find a valid spawn spot for the spiky ball
   let hasFound = false;
   let x: number;
   let y: number;
   for (let attempts = 0; attempts < 50; attempts++) {
      const offsetMagnitude = randFloat(80, 196);
      const offsetDirection = randAngle();
      x = targetX + offsetMagnitude * Math.sin(offsetDirection);
      y = targetY + offsetMagnitude * Math.cos(offsetDirection);

      // @Incomplete: will let the spiky ball spawn partially in a wall: shouldn't allow
      if (!layer.positionHasWall(x, y)) {
         hasFound = true;
         break;
      }
   }
   
   if (hasFound) {
      const velocityMagnitude = 150;
      const velocityDirection = randAngle();
      const vx = velocityMagnitude * Math.sin(velocityDirection);
      const vy = velocityMagnitude * Math.cos(velocityDirection);
      
      const config = createGuardianSpikyBallConfig(new Point(x!, y!), randAngle(), guardian);

      const spikyBallHitbox = config.components[ServerComponentType.transform]!.hitboxes[0];
      setHitboxVelocity(spikyBallHitbox, vx, vy);
      addHitboxAngularVelocity(spikyBallHitbox, Math.PI);
      
      createEntity(config, layer, 0);
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
   
   public run(guardian: Entity, targetX: number, targetY: number): void {
      turnToPosition(guardian, new Point(targetX, targetY), this.turnSpeed, 1);

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