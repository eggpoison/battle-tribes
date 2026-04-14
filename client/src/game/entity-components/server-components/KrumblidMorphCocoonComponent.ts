import { randAngle, randFloat, Settings, CircularBox, PacketReader, Entity, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../../texture-atlases";
import { EntityComponentData } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import { createCocoonAmbientParticle, createCocoonFragmentParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";

export interface KrumblidMorphCocoonComponentData {
   readonly stage: number;
}

interface IntermediateInfo {
   readonly renderPart: TexturedRenderPart;
}

export interface KrumblidMorphCocoonComponent {
   stage: number;
   readonly renderPart: TexturedRenderPart;
}

export const KrumblidMorphCocoonComponentArray = new ServerComponentArray<KrumblidMorphCocoonComponent, KrumblidMorphCocoonComponentData, IntermediateInfo>(ServerComponentType.krumblidMorphCocoon, true, createComponent, getMaxRenderParts, decodeData);
KrumblidMorphCocoonComponentArray.populateIntermediateInfo = populateIntermediateInfo;
KrumblidMorphCocoonComponentArray.updateFromData = updateFromData;
KrumblidMorphCocoonComponentArray.onHit = onHit;
KrumblidMorphCocoonComponentArray.onDie = onDie;
KrumblidMorphCocoonComponentArray.onTick = onTick;

const getTextureSource = (stage: number): string => {
   return "entities/krumblid-morph-cocoon/stage-" + stage + ".png";
}

export function createKrumblidMorphCocoonComponentData(stage: number): KrumblidMorphCocoonComponentData {
   return {
      stage: stage
   };
}

function decodeData(reader: PacketReader): KrumblidMorphCocoonComponentData {
   const stage = reader.readNumber();
   
   return createKrumblidMorphCocoonComponentData(stage);
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const krumblidMorphCocoonComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.krumblidMorphCocoon);
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      getTextureArrayIndex(getTextureSource(krumblidMorphCocoonComponentData.stage))
   );
   renderObject.attachRenderPart(renderPart);

   return {
      renderPart: renderPart
   };
}

function createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): KrumblidMorphCocoonComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const krumblidMorphCocoonComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.krumblidMorphCocoon);

   return {
      stage: krumblidMorphCocoonComponentData.stage,
      renderPart: intermediateInfo.renderPart,
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function onTick(cocoon: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(cocoon);
   const hitbox = transformComponent.hitboxes[0];
  
   const hitboxRadius = (hitbox.box as CircularBox).radius;
   const particleChance = hitboxRadius * Settings.DT_S / 20;
   if (Math.random() < particleChance) {
      const offsetDirection = randAngle();
      const x = hitbox.box.position.x + hitboxRadius * Math.sin(offsetDirection);
      const y = hitbox.box.position.y + hitboxRadius * Math.cos(offsetDirection);
      createCocoonAmbientParticle(x, y, offsetDirection + randFloat(-0.2, 0.2));
   }
}

function updateFromData(data: KrumblidMorphCocoonComponentData, entity: Entity): void {
   const krumblidMorphComponent = KrumblidMorphCocoonComponentArray.getComponent(entity);

   const stage = data.stage;
   if (stage !== krumblidMorphComponent.stage) {
      krumblidMorphComponent.renderPart.switchTextureSource(getTextureSource(stage));
      krumblidMorphComponent.stage = stage;
   }
}

function onHit(entity: Entity): void {
   // const transformComponent = TransformComponentArray.getComponent(entity);
   // const hitbox = transformComponent.hitboxes[0];
   // playBuildingHitSound(entity, hitbox);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("cocoon-break.mp3", 0.4, 1, entity, hitbox, false);
   
   const hitboxRadius = (hitbox.box as CircularBox).radius;
   for (let i = 0; i < 7; i++) {
      const offsetDirection = randAngle();
      const x = hitbox.box.position.x + hitboxRadius * Math.sin(offsetDirection);
      const y = hitbox.box.position.y + hitboxRadius * Math.cos(offsetDirection);
      createCocoonFragmentParticle(x, y, offsetDirection + randFloat(-0.2, 0.2));
   }
}