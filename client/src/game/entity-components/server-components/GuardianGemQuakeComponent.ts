import { randItem, PacketReader, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { createGemQuakeProjectile } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getTransformComponentData } from "../../entity-component-types";

export interface GuardianGemQuakeComponentData {}

interface IntermediateInfo {}

export interface GuardianGemQuakeComponent {}

const TEXTURE_SOURCES: ReadonlyArray<string> = [
   "entities/guardian-gem-quake/gem-1.png",
   "entities/guardian-gem-quake/gem-2.png",
   "entities/guardian-gem-quake/gem-3.png"
];

export const GuardianGemQuakeComponentArray = new ServerComponentArray<GuardianGemQuakeComponent, GuardianGemQuakeComponentData, IntermediateInfo>(ServerComponentType.guardianGemQuake, true, createComponent, getMaxRenderParts, decodeData);
GuardianGemQuakeComponentArray.populateIntermediateInfo = populateIntermediateInfo;
GuardianGemQuakeComponentArray.onLoad = onLoad;

function decodeData(reader: PacketReader): GuardianGemQuakeComponentData {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      getTextureArrayIndex(randItem(TEXTURE_SOURCES))
   );
   renderObject.attachRenderPart(renderPart);

   return {};
}

function createComponent(): GuardianGemQuakeComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onLoad(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (let i = 0; i < 2; i++) {
      createGemQuakeProjectile(transformComponent);
   }
}