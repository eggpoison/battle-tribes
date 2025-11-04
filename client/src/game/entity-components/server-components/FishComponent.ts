import { randAngle, randFloat, randInt } from "battletribes-shared/utils";
import { Entity, FishColour } from "battletribes-shared/entities";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { TileType } from "battletribes-shared/tiles";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createWaterSplashParticle } from "../../particles";
import { EntityComponentData } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { playSoundOnHitbox } from "../../sound";
import { getHitboxTile, Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { tickIntervalHasPassed } from "../../client";

export interface FishComponentData {
   readonly colour: FishColour;
}

interface IntermediateInfo {}

export interface FishComponent {
   readonly colour: FishColour;
   readonly waterOpacityMultiplier: number;
}

const TEXTURE_SOURCES: Record<FishColour, string> = {
   [FishColour.blue]: "entities/fish/fish-blue.png",
   [FishColour.gold]: "entities/fish/fish-gold.png",
   [FishColour.red]: "entities/fish/fish-red.png",
   [FishColour.lime]: "entities/fish/fish-lime.png"
};

export const FishComponentArray = new ServerComponentArray<FishComponent, FishComponentData, IntermediateInfo>(ServerComponentType.fish, true, createComponent, getMaxRenderParts, decodeData);
FishComponentArray.populateIntermediateInfo = populateIntermediateInfo;
FishComponentArray.onTick = onTick;
FishComponentArray.onHit = onHit;
FishComponentArray.onDie = onDie;

function decodeData(reader: PacketReader): FishComponentData {
   const colour = reader.readNumber();
   return {
      colour: colour
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   const fishComponentData = entityComponentData.serverComponentData[ServerComponentType.fish]!;
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex(TEXTURE_SOURCES[fishComponentData.colour])
      )
   );

   return {};
}

function createComponent(entityComponentData: EntityComponentData): FishComponent {
   return {
      colour: entityComponentData.serverComponentData[ServerComponentType.fish]!.colour,
      waterOpacityMultiplier: randFloat(0.6, 1)
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   if (transformComponent === null) {
      return;
   }
   
   const hitbox = transformComponent.hitboxes[0];
   
   const tile = getHitboxTile(hitbox);
   if (tile.type !== TileType.water && tickIntervalHasPassed(0.4)) {
      for (let i = 0; i < 8; i++) {
         const spawnOffsetDirection = randAngle();
         const spawnPositionX = hitbox.box.position.x + 8 * Math.sin(spawnOffsetDirection);
         const spawnPositionY = hitbox.box.position.y + 8 * Math.cos(spawnOffsetDirection);

         createWaterSplashParticle(spawnPositionX, spawnPositionY);
      }
   }
}
   
function onHit(entity: Entity, hitbox: Hitbox): void {
   // Blood particles
   for (let i = 0; i < 5; i++) {
      const position = hitbox.box.position.offset(16, randAngle());
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, position.x, position.y, randAngle(), randFloat(150, 250), true);
   }

   playSoundOnHitbox("fish-hurt-" + randInt(1, 4) + ".mp3", 0.4, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   if (transformComponent === null) {
      return;
   }
   
   const hitbox = transformComponent.hitboxes[0];

   createBloodParticleFountain(entity, 0.1, 0.8);
   
   playSoundOnHitbox("fish-die-1.mp3", 0.4, 1, entity, hitbox, false);
}