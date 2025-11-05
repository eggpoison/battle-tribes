import { ServerComponentType } from "webgl-test-shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { Entity } from "../../../../../shared/src/entities";
import { EntityComponentData } from "../../world";
import { PacketReader } from "../../../../../shared/src/packets";
import { TransformComponentArray } from "./TransformComponent";
import CircularBox from "../../../../../shared/src/boxes/CircularBox";
import { Settings } from "../../../../../shared/src/settings";
import { randAngle, randFloat } from "../../../../../shared/src/utils";
import { createCocoonAmbientParticle, createCocoonFragmentParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface DustfleaMorphCocoonComponentData {
   readonly stage: number;
}

interface IntermediateInfo {
   readonly renderPart: TexturedRenderPart;
}

export interface DustfleaMorphCocoonComponent {
   stage: number;
   readonly renderPart: TexturedRenderPart;
}

export const DustfleaMorphCocoonComponentArray = new ServerComponentArray<DustfleaMorphCocoonComponent, DustfleaMorphCocoonComponentData, IntermediateInfo>(ServerComponentType.dustfleaMorphCocoon, true, createComponent, getMaxRenderParts, decodeData);
DustfleaMorphCocoonComponentArray.populateIntermediateInfo = populateIntermediateInfo;
DustfleaMorphCocoonComponentArray.updateFromData = updateFromData;
DustfleaMorphCocoonComponentArray.onHit = onHit;
DustfleaMorphCocoonComponentArray.onDie = onDie;
DustfleaMorphCocoonComponentArray.onTick = onTick;

const getTextureSource = (stage: number): string => {
   return "entities/dustflea-morph-cocoon/stage-" + stage + ".png";
}

export function createDustfleaMorphCocoonComponentData(stage: number): DustfleaMorphCocoonComponentData {
   return {
      stage: stage
   };
}

function decodeData(reader: PacketReader): DustfleaMorphCocoonComponentData {
   const stage = reader.readNumber();
   
   return createDustfleaMorphCocoonComponentData(stage);
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];

   const dustfleaMorphCocoonComponentData = entityComponentData.serverComponentData[ServerComponentType.dustfleaMorphCocoon]!;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(getTextureSource(dustfleaMorphCocoonComponentData.stage))
   );
   renderInfo.attachRenderPart(renderPart);

   return {
      renderPart: renderPart
   };
}

function createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): DustfleaMorphCocoonComponent {
   const dustfleaMorphCocoonComponentData = entityComponentData.serverComponentData[ServerComponentType.dustfleaMorphCocoon]!;

   return {
      stage: dustfleaMorphCocoonComponentData.stage,
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

function updateFromData(data: DustfleaMorphCocoonComponentData, entity: Entity): void {
   const dustfleaMorphComponent = DustfleaMorphCocoonComponentArray.getComponent(entity);

   const stage = data.stage;

   if (stage !== dustfleaMorphComponent.stage) {
      dustfleaMorphComponent.renderPart.switchTextureSource(getTextureSource(stage));
      dustfleaMorphComponent.stage = stage;
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