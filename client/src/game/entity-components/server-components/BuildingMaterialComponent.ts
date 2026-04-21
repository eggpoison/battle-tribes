import { PacketReader, Entity, EntityType, BuildingMaterial, ServerComponentType } from "webgl-test-shared";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData, getEntityRenderObject, getEntityType } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { getServerComponentData } from "../../entity-component-types";
import { getRenderThingByTag, getRenderThingsByTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-register";

export interface BuildingMaterialComponentData {
   readonly material: BuildingMaterial;
}

export interface BuildingMaterialComponent {
   material: BuildingMaterial;
}

export const WALL_TEXTURE_SOURCES = ["entities/wall/wooden-wall.png", "entities/wall/stone-wall.png"];
export const DOOR_TEXTURE_SOURCES = ["entities/door/wooden-door.png", "entities/door/stone-door.png"];
export const EMBRASURE_TEXTURE_SOURCES = ["entities/embrasure/wooden-embrasure.png", "entities/embrasure/stone-embrasure.png"];
export const TUNNEL_TEXTURE_SOURCES = ["entities/tunnel/wooden-tunnel.png", "entities/tunnel/stone-tunnel.png"];
export const FLOOR_SPIKE_TEXTURE_SOURCES = ["entities/spikes/wooden-floor-spikes.png", "entities/spikes/stone-floor-spikes.png"];
export const WALL_SPIKE_TEXTURE_SOURCES = ["entities/spikes/wooden-wall-spikes.png", "entities/spikes/stone-wall-spikes.png"];

const getMaterialTextureSources = (entityType: EntityType): ReadonlyArray<string> => {
   // @Robustness
   switch (entityType) {
      case EntityType.wall: return WALL_TEXTURE_SOURCES;
      case EntityType.door: return DOOR_TEXTURE_SOURCES;
      case EntityType.embrasure: return EMBRASURE_TEXTURE_SOURCES;
      case EntityType.tunnel: return TUNNEL_TEXTURE_SOURCES;
      case EntityType.floorSpikes: return FLOOR_SPIKE_TEXTURE_SOURCES;
      case EntityType.wallSpikes: return WALL_SPIKE_TEXTURE_SOURCES;
      default: {
         throw new Error();
      }
   }
}

class _BuildingMaterialComponentArray extends ServerComponentArray<BuildingMaterialComponent, BuildingMaterialComponentData> {
   public decodeData(reader: PacketReader): BuildingMaterialComponentData {
      const material = reader.readNumber();
      return {
         material: material
      };
   }

   public createComponent(entityComponentData: EntityComponentData): BuildingMaterialComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const buildingMaterialComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.buildingMaterial);

      return {
         material: buildingMaterialComponentData.material
      };
   }

   public getMaxRenderParts(): number {
      return 0;
   }

   public updateFromData(data: BuildingMaterialComponentData, entity: Entity): void {
      const buildingMaterialComponent = BuildingMaterialComponentArray.getComponent(entity);
      
      const material = data.material;
      
      if (material !== buildingMaterialComponent.material) {
         const renderObject = getEntityRenderObject(entity);

         // @Hack: this fucking sucks. Instead each entity which uses the building material component should define its own function to do this
         const entityType = getEntityType(entity);
         if (entityType !== EntityType.bracings) {
            const textureSources = getMaterialTextureSources(entityType);
      
            const textureSource = textureSources[material];
      
            const materialRenderPart = getRenderThingByTag(renderObject, "buildingMaterialComponent:material") as TexturedRenderPart;
            materialRenderPart.switchTextureSource(textureSource);
         } else {
            const verticals = getRenderThingsByTag(renderObject, "bracingsComponent:vertical", 2) as Array<TexturedRenderPart>;
            for (const renderPart of verticals) {
               renderPart.switchTextureSource("entities/bracings/stone-vertical-post.png");
            }

            const horizontal = getRenderThingByTag(renderObject, "bracingsComponent:horizontal") as TexturedRenderPart;
            horizontal.switchTextureSource("entities/bracings/stone-horizontal-post.png");
         }
      }
      
      buildingMaterialComponent.material = material;
   }
}

export const BuildingMaterialComponentArray = registerServerComponentArray(ServerComponentType.buildingMaterial, _BuildingMaterialComponentArray, true);

export function createBuildingMaterialComponentData(material: BuildingMaterial): BuildingMaterialComponentData {
   return {
      material: material
   };
}