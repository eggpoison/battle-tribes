import { Point, angle, randFloat, randInt, randItem } from "webgl-test-shared/dist/utils";
import { EntityComponentsData, PlanterBoxPlant, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { HitData, HitFlags } from "webgl-test-shared/dist/client-server-types";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import Entity from "../Entity";
import PlantComponent from "../entity-components/PlantComponent";
import { LeafParticleSize, createDirtParticle, createLeafParticle, createLeafSpeckParticle, createWoodSpeckParticle } from "../particles";
import Tree, { TREE_DESTROY_SOUNDS, TREE_HIT_SOUNDS } from "./Tree";
import { playSound, AudioFilePath } from "../sound";
import { ParticleRenderLayer } from "../rendering/particle-rendering";

class Plant extends Entity {
   public static readonly SIZE = 80;

   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.plant>) {
      super(position, id, EntityType.plant, ageTicks);

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.plant, new PlantComponent(this, componentsData[2]));

      if (this.ageTicks <= 1) {
         // Create dirt particles

         for (let i = 0; i < 7; i++) {
            const offsetDirection = 2 * Math.PI * Math.random();
            const offsetMagnitude = randFloat(0, 10);
            const x = this.position.x + offsetMagnitude * Math.sin(offsetDirection);
            const y = this.position.y + offsetMagnitude * Math.cos(offsetDirection);
            createDirtParticle(x, y, ParticleRenderLayer.high);
         }
      }
   }

   // @Cleanup: move to plant component file
   protected onHit(hitData: HitData): void {
      const plantComponent = this.getServerComponent(ServerComponentType.plant);
      switch (plantComponent.plant) {
         case PlanterBoxPlant.tree: {
            const radius = Math.floor(plantComponent.growthProgress * 10);
      
            // @Cleanup: copy and paste
            const isDamagingHit = (hitData.flags & HitFlags.NON_DAMAGING_HIT) === 0;
            
            // Create leaf particles
            {
               const moveDirection = 2 * Math.PI * Math.random();
      
               const spawnPositionX = this.position.x + radius * Math.sin(moveDirection);
               const spawnPositionY = this.position.y + radius * Math.cos(moveDirection);
      
               createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
            }
            
            // Create leaf specks
            const numSpecks = Math.floor(plantComponent.growthProgress * 7) + 2;
            for (let i = 0; i < numSpecks; i++) {
               createLeafSpeckParticle(this.position.x, this.position.y, radius, Tree.LEAF_SPECK_COLOUR_LOW, Tree.LEAF_SPECK_COLOUR_HIGH);
            }
      
            if (isDamagingHit) {
               // Create wood specks at the point of hit

               let offsetDirection = angle(hitData.hitPosition[0] - this.position.x, hitData.hitPosition[1] - this.position.y);
               offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

               const spawnPositionX = this.position.x + (radius + 2) * Math.sin(offsetDirection);
               const spawnPositionY = this.position.y + (radius + 2) * Math.cos(offsetDirection);
               for (let i = 0; i < 4; i++) {
                  createWoodSpeckParticle(spawnPositionX, spawnPositionY, 3);
               }
               
               playSound(randItem(TREE_HIT_SOUNDS), 0.4, 1, this.position.x, this.position.y);
            } else {
               // @Temporary
               playSound(("berry-bush-hit-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, this.position.x, this.position.y);
            }
            break;
         }
         case PlanterBoxPlant.berryBush: {
            playSound(("berry-bush-hit-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, this.position.x, this.position.y);
            break;
         }
         case PlanterBoxPlant.iceSpikes: {
            playSound(("ice-spikes-hit-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, this.position.x, this.position.y);
            break;
         }
      }
   }

   protected onDie(): void {
      const plantComponent = this.getServerComponent(ServerComponentType.plant);
      switch (plantComponent.plant) {
         case PlanterBoxPlant.tree: {
            playSound(randItem(TREE_DESTROY_SOUNDS), 0.5, 1, this.position.x, this.position.y);
            break;
         }
         case PlanterBoxPlant.berryBush: {
            playSound("berry-bush-destroy-1.mp3", 0.4, 1, this.position.x, this.position.y);
            break;
         }
         case PlanterBoxPlant.iceSpikes: {
            playSound("ice-spikes-destroy.mp3", 0.4, 1, this.position.x, this.position.y);
            break;
         }
      }
   }
}

export default Plant;