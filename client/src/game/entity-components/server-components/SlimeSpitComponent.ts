import { ServerComponentType, Entity, Settings, PacketReader } from "webgl-test-shared";
import { createPoisonParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData, getEntityRenderObject } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import { EntityRenderObject } from "../../EntityRenderObject";
import { tickIntervalHasPassed } from "../../networking/snapshots";
import { getTransformComponentData } from "../../entity-component-types";

export interface SlimeSpitComponentData {}

interface IntermediateInfo {}

export interface SlimeSpitComponent {}

export const SlimeSpitComponentArray = new ServerComponentArray<SlimeSpitComponent, SlimeSpitComponentData, IntermediateInfo>(ServerComponentType.slimeSpit, true, createComponent, getMaxRenderParts, decodeData);
SlimeSpitComponentArray.populateIntermediateInfo = populateIntermediateInfo;
SlimeSpitComponentArray.onLoad = onLoad;
SlimeSpitComponentArray.onTick = onTick;
SlimeSpitComponentArray.onDie = onDie;

function decodeData(reader: PacketReader): SlimeSpitComponentData {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   // @Incomplete: SIZE DOESN'T ACTUALLY AFFECT ANYTHING

   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const renderPart1 = new TexturedRenderPart(
      hitbox,
      1,
      0,
      0, 0,
      getTextureArrayIndex("projectiles/slime-spit-medium.png")
   );
   renderPart1.opacity = 0.75;
   renderObject.attachRenderPart(renderPart1);

   const renderPart2 = new TexturedRenderPart(
      hitbox,
      0,
      Math.PI/4,
      0, 0,
      getTextureArrayIndex("projectiles/slime-spit-medium.png")
   );
   renderPart2.opacity = 0.75;
   renderObject.attachRenderPart(renderPart2);

   return {};
}

function createComponent(): SlimeSpitComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 2;
}

function onLoad(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("slime-spit.mp3", 0.5, 1, entity, hitbox, false);
}

function onTick(entity: Entity): void {
   const renderObject = getEntityRenderObject(entity);
   const rotatingRenderPart = renderObject.renderPartsByZIndex[0];
   
   rotatingRenderPart.angle += 1.5 * Math.PI * Settings.DT_S;

   if (tickIntervalHasPassed(0.2 * Settings.TICK_RATE)) {
      for (let i = 0; i < 5; i++) {
         createPoisonParticle(entity);
      }
   }
}

function onDie(entity: Entity): void {
   for (let i = 0; i < 15; i++) {
      createPoisonParticle(entity);
   }
}