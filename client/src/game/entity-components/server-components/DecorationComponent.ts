import { DecorationType, ServerComponentType } from "../../../../../shared/src/components";
import { PacketReader } from "../../../../../shared/src/packets";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface DecorationComponentData {
   readonly decorationType: DecorationType;
}

export interface DecorationComponent {
   readonly decorationType: DecorationType;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.decoration, _DecorationComponentArray> {}
}

const DECORATION_RENDER_INFO: Record<DecorationType, TextureIndex> = {
   [DecorationType.pebble]: TextureIndex.decorations_pebble,
   [DecorationType.rock]: TextureIndex.decorations_rock1,
   [DecorationType.sandstoneRock]: TextureIndex.decorations_sandstoneRock,
   [DecorationType.sandstoneRockBig1]: TextureIndex.decorations_sandstoneRockBig1,
   [DecorationType.sandstoneRockBig2]: TextureIndex.decorations_sandstoneRockBig2,
   [DecorationType.sandstoneRockDark]: TextureIndex.decorations_sandstoneRockDark,
   [DecorationType.sandstoneRockDarkBig1]: TextureIndex.decorations_sandstoneRockDarkBig1,
   [DecorationType.sandstoneRockDarkBig2]: TextureIndex.decorations_sandstoneRockDarkBig2,
   [DecorationType.flower1]: TextureIndex.decorations_flower1,
   [DecorationType.flower2]: TextureIndex.decorations_flower2,
   [DecorationType.flower3]: TextureIndex.decorations_flower3,
   [DecorationType.flower4]: TextureIndex.decorations_flower4
};

class _DecorationComponentArray extends ServerComponentArray<DecorationComponent, DecorationComponentData> {
   public decodeData(reader: PacketReader): DecorationComponentData {
      const decorationType = reader.readNumber();

      return {
         decorationType: decorationType
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const decorationComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.decoration);
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            DECORATION_RENDER_INFO[decorationComponentData.decorationType]
         )
      );
   }

   public createComponent(entityComponentData: EntityComponentData): DecorationComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const decorationComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.decoration);

      return {
         decorationType: decorationComponentData.decorationType
      };
   }

   public getMaxRenderParts(): number {
      return 1;
   }
}

export const DecorationComponentArray = registerServerComponentArray(ServerComponentType.decoration, _DecorationComponentArray, true);