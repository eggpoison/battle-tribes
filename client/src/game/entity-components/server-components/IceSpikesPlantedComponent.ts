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

export interface IceSpikesPlantedComponentData {
   readonly growthProgress: number;
}

interface IntermediateInfo {
   readonly renderPart: TexturedRenderPart;
}

export interface IceSpikesPlantedComponent {
   readonly renderPart: TexturedRenderPart;
}

const TEXTURE_SOURCES = ["entities/plant/ice-spikes-sapling-1.png", "entities/plant/ice-spikes-sapling-2.png", "entities/plant/ice-spikes-sapling-3.png", "entities/plant/ice-spikes-sapling-4.png", "entities/plant/ice-spikes-sapling-5.png", "entities/plant/ice-spikes-sapling-6.png", "entities/plant/ice-spikes-sapling-7.png", "entities/plant/ice-spikes-sapling-8.png", "entities/plant/ice-spikes-sapling-9.png"];

export const IceSpikesPlantedComponentArray = new ServerComponentArray<IceSpikesPlantedComponent, IceSpikesPlantedComponentData, IntermediateInfo>(ServerComponentType.iceSpikesPlanted, true, createComponent, getMaxRenderParts, decodeData);
IceSpikesPlantedComponentArray.populateIntermediateInfo = populateIntermediateInfo;
IceSpikesPlantedComponentArray.updateFromData = updateFromData;
IceSpikesPlantedComponentArray.onHit = onHit;
IceSpikesPlantedComponentArray.onDie = onDie;

const getTextureSource = (growthProgress: number): string => {
   const idx = Math.floor(growthProgress * (TEXTURE_SOURCES.length - 1))
   return TEXTURE_SOURCES[idx];
}

function decodeData(reader: PacketReader): IceSpikesPlantedComponentData {
   const growthProgress = reader.readNumber();
   return {
      growthProgress: growthProgress
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   const iceSpikesPlantedComponentData = entityComponentData.serverComponentData[ServerComponentType.iceSpikesPlanted]!;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      // @Cleanup: why is this 9 instead of 0?
      9,
      0,
      getTextureArrayIndex(getTextureSource(iceSpikesPlantedComponentData.growthProgress))
   );
   renderInfo.attachRenderPart(renderPart);

   return {
      renderPart: renderPart
   };
}

function createComponent(_entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): IceSpikesPlantedComponent {
   return {
      renderPart: intermediateInfo.renderPart
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function updateFromData(data: IceSpikesPlantedComponentData, entity: Entity): void {
   const iceSpikesPlantedComponent = IceSpikesPlantedComponentArray.getComponent(entity);
   iceSpikesPlantedComponent.renderPart.switchTextureSource(getTextureSource(data.growthProgress));
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   // @Incomplete: particles?
   playSoundOnHitbox("ice-spikes-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   // @Incomplete: particles?
   playSoundOnHitbox("ice-spikes-destroy.mp3", 0.4, 1, entity, hitbox, false);
}