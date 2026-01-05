import { Entity } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, randInt } from "battletribes-shared/utils";
import { entityHasPassedPosition } from "../ai-shared";
import { AIHelperComponentArray } from "../components/AIHelperComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import Layer from "../Layer";
import { getEntityAgeTicks, getEntityLayer } from "../world";
import { getHitboxVelocity, Hitbox } from "../hitboxes";

const enum Vars {
   POSITION_RECORD_INTERVAL = Settings.TICK_RATE
}

export type WanderAITileIsValidCallback = (entity: Entity, layer: Layer, x: number, y: number) => boolean;

const positionIsValid = (layer: Layer, x: number, y: number): boolean => {
   return !layer.positionHasWall(x, y);
}

export default class WanderAI {
   public acceleration: number;
   public readonly turnSpeed: number;
   public readonly turnDamping: number;
   private readonly wanderRate: number;

   public targetPosition: Point | null = null;

   private lastRecordedPositionX = -1;
   private lastRecordedPositionY = -1;
   
   private readonly positionIsValidCallback: WanderAITileIsValidCallback;

   constructor(acceleration: number, turnSpeed: number, turnDamping: number, wanderRate: number, positionIsValidCallback: WanderAITileIsValidCallback) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
      this.turnDamping = turnDamping;
      this.wanderRate = wanderRate;
      this.positionIsValidCallback = positionIsValidCallback;
   }

   private shouldTryAndWander(hitbox: Hitbox): boolean {
      // @SQUEAM cuz tukmoks aren't wandering thanks to their clubs pushing them around and making them be in constant motion
      return Math.random() < this.wanderRate * Settings.DT_S;
      
      const velocity = getHitboxVelocity(hitbox);
      // We check for < 1 instead of == 0 here as sometimtes the velocity can be an infinitessimal
      return Math.abs(velocity.x) < 1 && Math.abs(velocity.y) < 1 && Math.random() < this.wanderRate * Settings.DT_S;
   }

   public update(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      // @Hack
      const entityHitbox = transformComponent.hitboxes[0];
      
      if (getEntityAgeTicks(entity) % Vars.POSITION_RECORD_INTERVAL === 0) {
         // If the entity hasn't moved enough since the last position check-in, clear the target as they are most likely stuck
         if (this.targetPosition !== null) {
            const dx = entityHitbox.box.position.x - this.lastRecordedPositionX;
            const dy = entityHitbox.box.position.y - this.lastRecordedPositionY;
            const positionDelta = Math.sqrt(dx * dx + dy * dy);
            if (positionDelta < 10) {
               this.targetPosition = null;
            }
         }
         
         this.lastRecordedPositionX = entityHitbox.box.position.x;
         this.lastRecordedPositionY = entityHitbox.box.position.y;
      }
      
      if (this.targetPosition !== null) {
         if (entityHasPassedPosition(entity, this.targetPosition)) {
            this.targetPosition = null;
         }
      } else if (this.shouldTryAndWander(entityHitbox)) {
         const layer = getEntityLayer(entity);

         const aiHelperComponent = AIHelperComponentArray.getComponent(entity);
         
         const minTileX = Math.max(Math.floor((entityHitbox.box.position.x - aiHelperComponent.visionRange) / Settings.TILE_SIZE), 0);
         const maxTileX = Math.min(Math.floor((entityHitbox.box.position.x + aiHelperComponent.visionRange) / Settings.TILE_SIZE), Settings.WORLD_SIZE_TILES - 1);
         const minTileY = Math.max(Math.floor((entityHitbox.box.position.y - aiHelperComponent.visionRange) / Settings.TILE_SIZE), 0);
         const maxTileY = Math.min(Math.floor((entityHitbox.box.position.y + aiHelperComponent.visionRange) / Settings.TILE_SIZE), Settings.WORLD_SIZE_TILES - 1);
         
         let attempts = 0;
         let x: number;
         let y: number;
         let isValid = false;

         // @Speed: Worst-case this iterates 2500 (!!) times!!!
         while (attempts++ < 50) {
            let attempts = 0;
            let tileX: number;
            let tileY: number;
            do {
               tileX = randInt(minTileX, maxTileX);
               tileY = randInt(minTileY, maxTileY);
            } while (++attempts <= 50 && Math.pow(entityHitbox.box.position.x - (tileX + 0.5) * Settings.TILE_SIZE, 2) + Math.pow(entityHitbox.box.position.y - (tileY + 0.5) * Settings.TILE_SIZE, 2) > aiHelperComponent.visionRange * aiHelperComponent.visionRange);
         
            x = (tileX + Math.random()) * Settings.TILE_SIZE;
            y = (tileY + Math.random()) * Settings.TILE_SIZE;

            if (positionIsValid(layer, x, y) && this.positionIsValidCallback(entity, layer, x, y)) {
               isValid = true;
               break;
            }
         }

         if (isValid) {
            this.targetPosition = new Point(x!, y!);
         }
      }
   }
}