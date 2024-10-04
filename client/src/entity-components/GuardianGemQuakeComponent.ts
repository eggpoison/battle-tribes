import { ServerComponentType } from "../../../shared/src/components";
import { EntityID } from "../../../shared/src/entities";
import { PacketReader } from "../../../shared/src/packets";
import { randItem } from "../../../shared/src/utils";
import { createGemQuakeProjectile } from "../particles";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import ServerComponent from "./ServerComponent";
import { TransformComponentArray } from "./TransformComponent";

const TEXTURE_SOURCES: ReadonlyArray<string> = [
   "entities/guardian-gem-quake/gem-1.png",
   "entities/guardian-gem-quake/gem-2.png",
   "entities/guardian-gem-quake/gem-3.png"
];

export class GuardianGemQuakeComponent extends ServerComponent {
   public onLoad(): void {
      const transformComponent = TransformComponentArray.getComponent(this.entity.id);
      const hitbox = transformComponent.hitboxes[0];
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex(randItem(TEXTURE_SOURCES))
      );
      this.entity.attachRenderThing(renderPart);
   }
   
   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader, isInitialData: boolean): void {
      const life = reader.readNumber();
   }
}

export const GuardianGemQuakeComponentArray = new ComponentArray<GuardianGemQuakeComponent>(ComponentArrayType.server, ServerComponentType.guardianGemQuake, true, {
   onSpawn: onSpawn
});

function onSpawn(_component: GuardianGemQuakeComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (let i = 0; i < 2; i++) {
      createGemQuakeProjectile(transformComponent);
   }
}