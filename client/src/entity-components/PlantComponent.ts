import { PlanterBoxPlant } from "battletribes-shared/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { ItemType } from "battletribes-shared/items/items";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";

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

class PlantComponent extends ServerComponent {
   public readonly plant: PlanterBoxPlant;
   public growthProgress: number;
   
   private plantRenderPart: TexturedRenderPart | null = null;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.plant = reader.readNumber();
      this.growthProgress = reader.readNumber();
      const numFruit = reader.readNumber();

      this.updatePlantRenderPart(this.plant, this.growthProgress, numFruit);
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
            this.plantRenderPart = new TexturedRenderPart(
               null,
               9,
               0,
               getTextureArrayIndex(textureSource)
            );
            this.entity.attachRenderThing(this.plantRenderPart);
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

   public padData(reader: PacketReader): void {
      reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
      this.growthProgress = reader.readNumber();
      const numFruit = reader.readNumber();
      
      this.updatePlantRenderPart(this.plant, this.growthProgress, numFruit);
   }
}

export default PlantComponent;

export const PlantComponentArray = new ComponentArray<PlantComponent>(ComponentArrayType.server, ServerComponentType.plant, true, {});