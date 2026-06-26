import { ServerComponentType } from "../../../../../shared/src/components";
import { FishColour, Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { Settings } from "../../../../../shared/src/settings";
import { TileType } from "../../../../../shared/src/tiles";
import { randFloat, randAngle, Point, randInt } from "../../../../../shared/src/utils";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createWaterSplashParticle } from "../../particles";
import { EntityComponentData } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getHitboxTile, Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { tickIntervalHasPassed } from "../../networking/snapshots";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface FishComponentData {
   readonly colour: FishColour;
}

export interface FishComponent {
   readonly colour: FishColour;
   readonly waterOpacityMultiplier: number;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.fish, typeof FishComponentArray> {}
}

const TEXTURE_INDEXES: Record<FishColour, TextureIndex> = {
   [FishColour.blue]: TextureIndex.entities_fish_fishBlue,
   [FishColour.gold]: TextureIndex.entities_fish_fishGold,
   [FishColour.red]: TextureIndex.entities_fish_fishRed,
   [FishColour.lime]: TextureIndex.entities_fish_fishLime
};

export const FishComponentArray = registerServerComponentArray(
   ServerComponentType.fish,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
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

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const fishComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.fish);
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         TEXTURE_INDEXES[fishComponentData.colour]
      )
   );
}

function createComponent(entityComponentData: EntityComponentData): FishComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const fishComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.fish);

   return {
      colour: fishComponentData.colour,
      waterOpacityMultiplier: randFloat(0.6, 1)
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   
   const tile = getHitboxTile(hitbox);
   if (tile.type !== TileType.water && tickIntervalHasPassed(0.4 * Settings.TICK_RATE)) {
      for (let i = 0; i < 8; i++) {
         const spawnOffsetDirection = randAngle();
         const spawnPositionX = hitbox.box.posX + 8 * Math.sin(spawnOffsetDirection);
         const spawnPositionY = hitbox.box.posY + 8 * Math.cos(spawnOffsetDirection);

         createWaterSplashParticle(spawnPositionX, spawnPositionY);
      }
   }
}
   
function onHit(entity: Entity, hitbox: Hitbox): void {
   // Blood particles
   for (let i = 0; i < 5; i++) {
      const position = new Point(hitbox.box.posX, hitbox.box.posY).offset(16, randAngle());
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, position.x, position.y, randAngle(), randFloat(150, 250), true);
   }

   playSoundOnHitbox("fish-hurt-" + randInt(1, 4) + ".mp3", 0.4, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   createBloodParticleFountain(entity, 0.1, 0.8);
   
   playSoundOnHitbox("fish-die-1.mp3", 0.4, 1, entity, hitbox, false);
}