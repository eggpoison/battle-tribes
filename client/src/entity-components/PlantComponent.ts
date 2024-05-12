import { PlantComponentData, PlanterBoxPlant, ServerComponentType } from "webgl-test-shared/dist/components";
import { ItemType } from "webgl-test-shared/dist/items";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";

const TEXTURE_SOURCES: Record<PlanterBoxPlant, ReadonlyArray<string>> = {
   [PlanterBoxPlant.tree]: ["entities/plant/tree-sapling-1.png", "entities/plant/tree-sapling-2.png", "entities/plant/tree-sapling-3.png", "entities/plant/tree-sapling-4.png", "entities/plant/tree-sapling-5.png", "entities/plant/tree-sapling-6.png", "entities/plant/tree-sapling-7.png", "entities/plant/tree-sapling-8.png", "entities/plant/tree-sapling-9.png", "entities/plant/tree-sapling-10.png", "entities/plant/tree-sapling-11.png"],
   [PlanterBoxPlant.berryBush]: ["entities/plant/berry-bush-sapling-1.png", "entities/plant/berry-bush-sapling-2.png", "entities/plant/berry-bush-sapling-3.png", "entities/plant/berry-bush-sapling-4.png", "entities/plant/berry-bush-sapling-5.png", "entities/plant/berry-bush-sapling-6.png", "entities/plant/berry-bush-sapling-7.png", "entities/plant/berry-bush-sapling-8.png", "entities/plant/berry-bush-sapling-9.png", ""],
   [PlanterBoxPlant.iceSpikes]: ["entities/plant/ice-spikes-sapling-1.png", "entities/plant/ice-spikes-sapling-2.png", "entities/plant/ice-spikes-sapling-3.png", "entities/plant/ice-spikes-sapling-4.png", "entities/plant/ice-spikes-sapling-5.png", "entities/plant/ice-spikes-sapling-6.png", "entities/plant/ice-spikes-sapling-7.png", "entities/plant/ice-spikes-sapling-8.png", "entities/plant/ice-spikes-sapling-9.png"]
};

const BERRY_BUSH_FULLY_GROWN_TEXTURE_SOURCES: ReadonlyArray<string> = [
   "entities/plant/berry-bush-plant-1.png",
   "entities/plant/berry-bush-plant-2.png",
   "entities/plant/berry-bush-plant-3.png",
   "entities/plant/berry-bush-plant-4.png",
   "entities/plant/berry-bush-plant-5.png"
];

export const SEED_TO_PLANT_RECORD: Partial<Record<ItemType, PlanterBoxPlant>> = {
   [ItemType.seed]: PlanterBoxPlant.tree,
   [ItemType.berry]: PlanterBoxPlant.berryBush,
   [ItemType.frostcicle]: PlanterBoxPlant.iceSpikes
};

class PlantComponent extends ServerComponent<ServerComponentType.plant> {
   public readonly plant: PlanterBoxPlant;
   public growthProgress: number;
   
   private plantRenderPart: RenderPart | null = null;
   
   constructor(entity: Entity, data: PlantComponentData) {
      super(entity);

      this.plant = data.plant
      this.growthProgress = data.plantGrowthProgress;

      this.updatePlantRenderPart(data.plant, data.plantGrowthProgress, data.numFruit);
   }

   private updatePlantRenderPart(plant: PlanterBoxPlant | null, growthProgress: number, numFruits: number): void {
      if (plant !== null) {
         let textureSource: string;
         // @Hack
         if (growthProgress < 1 || plant !== PlanterBoxPlant.berryBush) {
            const textureSources = TEXTURE_SOURCES[plant];
            const idx = Math.floor(growthProgress * (textureSources.length - 1))
            textureSource = textureSources[idx];
         } else {
            // @Cleanup
            const maxNumFruits = 4;
            
            const progress = numFruits / maxNumFruits;
            const idx = Math.floor(progress * (BERRY_BUSH_FULLY_GROWN_TEXTURE_SOURCES.length - 1))
            textureSource = BERRY_BUSH_FULLY_GROWN_TEXTURE_SOURCES[idx];
         }
         
         if (this.plantRenderPart === null) {
            this.plantRenderPart = new RenderPart(
               this.entity,
               getTextureArrayIndex(textureSource),
               9,
               0
            );
            this.entity.attachRenderPart(this.plantRenderPart);
         } else {
            this.plantRenderPart.switchTextureSource(textureSource);
         }
      } else {
         if (this.plantRenderPart !== null) {
            this.entity.removeRenderPart(this.plantRenderPart);
            this.plantRenderPart = null;
         }
      }
   }

   public updateFromData(data: PlantComponentData): void {
      this.growthProgress = data.plantGrowthProgress;
      
      this.updatePlantRenderPart(data.plant, data.plantGrowthProgress, data.numFruit);
   }
}

export default PlantComponent;