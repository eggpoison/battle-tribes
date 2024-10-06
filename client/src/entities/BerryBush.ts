import { ServerComponentType } from "battletribes-shared/components";
import { EntityType } from "battletribes-shared/entities";
import { randFloat, randInt } from "battletribes-shared/utils";
import { LeafParticleSize, createLeafParticle, createLeafSpeckParticle } from "../particles";
import { AudioFilePath, playSound } from "../sound";
import Entity from "../Entity";

class BerryBush extends Entity {
   private static readonly RADIUS = 40;

   private static readonly LEAF_SPECK_COLOUR_LOW = [63/255, 204/255, 91/255] as const;
   private static readonly LEAF_SPECK_COLOUR_HIGH = [35/255, 158/255, 88/255] as const;

   constructor(id: number) {
      super(id, EntityType.berryBush);
   }

   protected onHit(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      const moveDirection = 2 * Math.PI * Math.random();
      
      const spawnPositionX = transformComponent.position.x + BerryBush.RADIUS * Math.sin(moveDirection);
      const spawnPositionY = transformComponent.position.y + BerryBush.RADIUS * Math.cos(moveDirection);

      createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), LeafParticleSize.small);
      
      // Create leaf specks
      for (let i = 0; i < 5; i++) {
         createLeafSpeckParticle(transformComponent.position.x, transformComponent.position.y, BerryBush.RADIUS, BerryBush.LEAF_SPECK_COLOUR_LOW, BerryBush.LEAF_SPECK_COLOUR_HIGH);
      }

      playSound(("berry-bush-hit-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, transformComponent.position);
   }

   public onDie(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

      for (let i = 0; i < 6; i++) {
         const offsetMagnitude = BerryBush.RADIUS * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = transformComponent.position.x + offsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + offsetMagnitude * Math.cos(spawnOffsetDirection);

         createLeafParticle(spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), LeafParticleSize.small);
      }
      
      // Create leaf specks
      for (let i = 0; i < 9; i++) {
         createLeafSpeckParticle(transformComponent.position.x, transformComponent.position.y, BerryBush.RADIUS * Math.random(), BerryBush.LEAF_SPECK_COLOUR_LOW, BerryBush.LEAF_SPECK_COLOUR_HIGH);
      }

      playSound("berry-bush-destroy-1.mp3", 0.4, 1, transformComponent.position);
   }
}

export default BerryBush;