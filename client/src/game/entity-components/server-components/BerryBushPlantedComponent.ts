import { ServerComponentType } from "webgl-test-shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import { PacketReader } from "../../../../../shared/src/packets";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Entity } from "../../../../../shared/src/entities";
import { randInt } from "../../../../../shared/src/utils";
import { playSoundOnHitbox } from "../../sound";
import { EntityComponentData } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface BerryBushPlantedComponentData {
   readonly growthProgress: number;
   readonly numFruits: number;
}

interface IntermediateInfo {
   readonly renderPart: TexturedRenderPart;
}

export interface BerryBushPlantedComponent {
   readonly renderPart: TexturedRenderPart;
}

const TEXTURE_SOURCES = ["entities/plant/berry-bush-sapling-1.png", "entities/plant/berry-bush-sapling-2.png", "entities/plant/berry-bush-sapling-3.png", "entities/plant/berry-bush-sapling-4.png", "entities/plant/berry-bush-sapling-5.png", "entities/plant/berry-bush-sapling-6.png", "entities/plant/berry-bush-sapling-7.png", "entities/plant/berry-bush-sapling-8.png", "entities/plant/berry-bush-sapling-9.png", ""];

const FULLY_GROWN_TEXTURE_SOURCES: ReadonlyArray<string> = [
   "entities/plant/berry-bush-plant-1.png",
   "entities/plant/berry-bush-plant-2.png",
   "entities/plant/berry-bush-plant-3.png",
   "entities/plant/berry-bush-plant-4.png",
   "entities/plant/berry-bush-plant-5.png"
];

export const BerryBushPlantedComponentArray = new ServerComponentArray<BerryBushPlantedComponent, BerryBushPlantedComponentData, IntermediateInfo>(ServerComponentType.berryBushPlanted, true, createComponent, getMaxRenderParts, decodeData);
BerryBushPlantedComponentArray.populateIntermediateInfo = populateIntermediateInfo;
BerryBushPlantedComponentArray.updateFromData = updateFromData;
BerryBushPlantedComponentArray.onHit = onHit;
BerryBushPlantedComponentArray.onDie = onDie;

const getTextureSource = (growthProgress: number, numFruits: number): string => {
   if (growthProgress < 1) {
      const idx = Math.floor(growthProgress * (TEXTURE_SOURCES.length - 1))
      return TEXTURE_SOURCES[idx];
   } else {
      // @Cleanup
      const maxNumFruits = 4;
      
      const progress = numFruits / maxNumFruits;
      const idx = Math.floor(progress * (FULLY_GROWN_TEXTURE_SOURCES.length - 1))
      return FULLY_GROWN_TEXTURE_SOURCES[idx];
   }
}

function decodeData(reader: PacketReader): BerryBushPlantedComponentData {
   const growthProgress = reader.readNumber();
   const numFruits = reader.readNumber();
   return {
      growthProgress: growthProgress,
      numFruits: numFruits
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   const berryBushPlantedComponentData = entityComponentData.serverComponentData[ServerComponentType.berryBushPlanted]!;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      // @Cleanup: why is this 9 instead of 0?
      9,
      0,
      getTextureArrayIndex(getTextureSource(berryBushPlantedComponentData.growthProgress, berryBushPlantedComponentData.numFruits))
   );
   renderInfo.attachRenderPart(renderPart);

   return {
      renderPart: renderPart
   };
}

function createComponent(_entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): BerryBushPlantedComponent {
   return {
      renderPart: intermediateInfo.renderPart
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function updateFromData(data: BerryBushPlantedComponentData, entity: Entity): void {
   const berryBushPlantedComponent = BerryBushPlantedComponentArray.getComponent(entity);
   berryBushPlantedComponent.renderPart.switchTextureSource(getTextureSource(data.growthProgress, data.numFruits));
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   // @Incomplete: particles?
   playSoundOnHitbox("berry-bush-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   // @Incomplete: particles?
   playSoundOnHitbox("berry-bush-destroy-1.mp3", 0.4, 1, entity, hitbox, false);
}