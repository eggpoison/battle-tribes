import { angle, randFloat, randInt, randItem } from "battletribes-shared/utils";
import { PlanterBoxPlant } from "battletribes-shared/components";
import { HitData, HitFlags } from "battletribes-shared/client-server-types";
import Entity from "../Entity";
import { LeafParticleSize, createDirtParticle, createLeafParticle, createLeafSpeckParticle, createWoodSpeckParticle } from "../particles";
import Tree, { TREE_DESTROY_SOUNDS, TREE_HIT_SOUNDS } from "./Tree";
import { playSound } from "../sound";
import { ParticleRenderLayer } from "../rendering/webgl/particle-rendering";
import { TransformComponentArray } from "../entity-components/TransformComponent";
import { PlantComponentArray } from "../entity-components/PlantComponent";

class Plant extends Entity {
   public static readonly SIZE = 80;

   public onLoad(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      if (transformComponent.ageTicks <= 0) {
         // Create dirt particles

         for (let i = 0; i < 7; i++) {
            const offsetDirection = 2 * Math.PI * Math.random();
            const offsetMagnitude = randFloat(0, 10);
            const x = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
            const y = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);
            createDirtParticle(x, y, ParticleRenderLayer.high);
         }
      }
   }

   // @Cleanup: move to plant component file
   protected onHit(hitData: HitData): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      const plantComponent = PlantComponentArray.getComponent(this.id);

      switch (plantComponent.plant) {
         case PlanterBoxPlant.tree: {
            const radius = Math.floor(plantComponent.growthProgress * 10);
      
            // @Cleanup: copy and paste
            const isDamagingHit = (hitData.flags & HitFlags.NON_DAMAGING_HIT) === 0;
            
            // Create leaf particles
            {
               const moveDirection = 2 * Math.PI * Math.random();
      
               const spawnPositionX = transformComponent.position.x + radius * Math.sin(moveDirection);
               const spawnPositionY = transformComponent.position.y + radius * Math.cos(moveDirection);
      
               createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
            }
            
            // Create leaf specks
            const numSpecks = Math.floor(plantComponent.growthProgress * 7) + 2;
            for (let i = 0; i < numSpecks; i++) {
               createLeafSpeckParticle(transformComponent.position.x, transformComponent.position.y, radius, Tree.LEAF_SPECK_COLOUR_LOW, Tree.LEAF_SPECK_COLOUR_HIGH);
            }
      
            if (isDamagingHit) {
               // Create wood specks at the point of hit

               let offsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
               offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

               const spawnPositionX = transformComponent.position.x + (radius + 2) * Math.sin(offsetDirection);
               const spawnPositionY = transformComponent.position.y + (radius + 2) * Math.cos(offsetDirection);
               for (let i = 0; i < 4; i++) {
                  createWoodSpeckParticle(spawnPositionX, spawnPositionY, 3);
               }
               
               playSound(randItem(TREE_HIT_SOUNDS), 0.4, 1, transformComponent.position);
            } else {
               // @Temporary
               playSound("berry-bush-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, transformComponent.position);
            }
            break;
         }
         case PlanterBoxPlant.berryBush: {
            playSound("berry-bush-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, transformComponent.position);
            break;
         }
         case PlanterBoxPlant.iceSpikes: {
            playSound("ice-spikes-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, transformComponent.position);
            break;
         }
      }
   }

   protected onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      const plantComponent = PlantComponentArray.getComponent(this.id);

      switch (plantComponent.plant) {
         case PlanterBoxPlant.tree: {
            playSound(randItem(TREE_DESTROY_SOUNDS), 0.5, 1, transformComponent.position);
            break;
         }
         case PlanterBoxPlant.berryBush: {
            playSound("berry-bush-destroy-1.mp3", 0.4, 1, transformComponent.position);
            break;
         }
         case PlanterBoxPlant.iceSpikes: {
            playSound("ice-spikes-destroy.mp3", 0.4, 1, transformComponent.position);
            break;
         }
      }
   }
}

export default Plant;