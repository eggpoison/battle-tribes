import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { Settings } from "../../../../../shared/src/settings";
import { createPoisonParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData, getEntityRenderObject } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import { EntityRenderObject } from "../../EntityRenderObject";
import { tickIntervalHasPassed } from "../../networking/snapshots";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { Bytes } from "../../../../../shared/src/constants";
import { TextureIndex } from "../../../texture-index";

export interface SlimeSpitComponentData {}

export interface SlimeSpitComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.slimeSpit, typeof SlimeSpitComponentArray> {}
}

export const SlimeSpitComponentArray = registerServerComponentArray(
   ServerComponentType.slimeSpit,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
SlimeSpitComponentArray.populateIntermediateInfo = populateIntermediateInfo;
SlimeSpitComponentArray.onLoad = onLoad;
SlimeSpitComponentArray.onTick = onTick;
SlimeSpitComponentArray.onDie = onDie;

function decodeData(reader: PacketReader): SlimeSpitComponentData {
   reader.padOffset(Bytes.Float32);
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   // @Incomplete: SIZE DOESN'T ACTUALLY AFFECT ANYTHING

   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const renderPart1 = new TexturedRenderPart(
      hitbox,
      1,
      0,
      0, 0,
      TextureIndex.projectiles_slimeSpitMedium
   );
   renderPart1.opacity = 0.75;
   renderObject.attachRenderPart(renderPart1);

   const renderPart2 = new TexturedRenderPart(
      hitbox,
      0,
      Math.PI/4,
      0, 0,
      TextureIndex.projectiles_slimeSpitMedium
   );
   renderPart2.opacity = 0.75;
   renderObject.attachRenderPart(renderPart2);
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