import { EntityID } from "../../../shared/src/entities";
import { Settings } from "../../../shared/src/settings";
import { randInt, TileIndex } from "../../../shared/src/utils";
import { entityHasReachedPosition, moveEntityToPosition, stopEntity } from "../ai-shared";
import { AIHelperComponentArray } from "../components/AIHelperComponent";
import { PhysicsComponent, PhysicsComponentArray } from "../components/PhysicsComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import Layer, { getTileIndexIncludingEdges } from "../Layer";
import { getEntityLayer } from "../world";

export type WanderAITileIsValidCallback = (entity: EntityID, layer: Layer, x: number, y: number) => boolean;

export default class WanderAI {
   public acceleration: number;
   private readonly turnSpeed: number;
   private readonly wanderRate: number;

   // If these are set to -1, the wander AI has no current target position
   targetPositionX = -1;
   targetPositionY = -1;
   
   private readonly positionIsValidCallback: WanderAITileIsValidCallback;

   constructor(acceleration: number, turnSpeed: number, wanderRate: number, positionIsValidCallback: WanderAITileIsValidCallback) {
      this.acceleration = acceleration;
      this.turnSpeed = turnSpeed;
      this.wanderRate = wanderRate;
      this.positionIsValidCallback = positionIsValidCallback;
   }

   private shouldTryAndWander(physicsComponent: PhysicsComponent): boolean {
      return physicsComponent.selfVelocity.x === 0 && physicsComponent.selfVelocity.y === 0 && Math.random() < this.wanderRate / Settings.TPS;
   }
   
   public run(entity: EntityID): void {
      const physicsComponent = PhysicsComponentArray.getComponent(entity);
      
      if (this.targetPositionX !== -1) {
         if (entityHasReachedPosition(entity, this.targetPositionX, this.targetPositionY)) {
            this.targetPositionX = -1;
            stopEntity(physicsComponent);
         }
      } else if (this.shouldTryAndWander(physicsComponent)) {
         const layer = getEntityLayer(entity);

         const transformComponent = TransformComponentArray.getComponent(entity);
         const aiHelperComponent = AIHelperComponentArray.getComponent(entity);
         
         const minTileX = Math.max(Math.floor((transformComponent.position.x - aiHelperComponent.visionRange) / Settings.TILE_SIZE), 0);
         const maxTileX = Math.min(Math.floor((transformComponent.position.x + aiHelperComponent.visionRange) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1);
         const minTileY = Math.max(Math.floor((transformComponent.position.y - aiHelperComponent.visionRange) / Settings.TILE_SIZE), 0);
         const maxTileY = Math.min(Math.floor((transformComponent.position.y + aiHelperComponent.visionRange) / Settings.TILE_SIZE), Settings.BOARD_DIMENSIONS - 1);
         
         let attempts = 0;
         let x: number;
         let y: number;
         // @Speed: Worst-case this iterates 2500 (!!) times!!!
         do {
            let attempts = 0;
            let tileX: number;
            let tileY: number;
            do {
               tileX = randInt(minTileX, maxTileX);
               tileY = randInt(minTileY, maxTileY);
            } while (++attempts <= 50 && Math.pow(transformComponent.position.x - (tileX + 0.5) * Settings.TILE_SIZE, 2) + Math.pow(transformComponent.position.y - (tileY + 0.5) * Settings.TILE_SIZE, 2) > aiHelperComponent.visionRange * aiHelperComponent.visionRange);
         
            x = (tileX + Math.random()) * Settings.TILE_SIZE;
            y = (tileY + Math.random()) * Settings.TILE_SIZE;
         } while (++attempts <= 50 && !this.positionIsValidCallback(entity, layer, x, y));

         // Wander to that target position
         this.targetPositionX = x;
         this.targetPositionY = y;
         moveEntityToPosition(entity, this.targetPositionX, this.targetPositionY, this.acceleration, this.turnSpeed);
      } else {
         stopEntity(physicsComponent);
      }
   }
}