import { BuildingMaterial, ServerComponentType } from "../../../../../shared/src/components";
import { EntityType, Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData, getEntityRenderObject, getEntityType } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getEntityServerComponentTypes } from "../component-types";
import { getServerComponentData } from "../component-types";
import { getRenderThingByTag, getRenderThingsByTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface BuildingMaterialComponentData {
   readonly material: BuildingMaterial;
}

export interface BuildingMaterialComponent {
   material: BuildingMaterial;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.buildingMaterial, typeof BuildingMaterialComponentArray> {}
}

export const WALL_TEXTURE_SOURCES = [TextureIndex.entities_wall_woodenWall, TextureIndex.entities_wall_stoneWall];
export const DOOR_TEXTURE_SOURCES = [TextureIndex.entities_door_woodenDoor, TextureIndex.entities_door_stoneDoor];
export const EMBRASURE_TEXTURE_SOURCES = [TextureIndex.entities_embrasure_woodenEmbrasure, TextureIndex.entities_embrasure_stoneEmbrasure];
export const TUNNEL_TEXTURE_SOURCES = [TextureIndex.entities_tunnel_woodenTunnel, TextureIndex.entities_tunnel_stoneTunnel];
export const FLOOR_SPIKE_TEXTURE_SOURCES = [TextureIndex.entities_spikes_woodenFloorSpikes, TextureIndex.entities_spikes_stoneFloorSpikes];
export const WALL_SPIKE_TEXTURE_SOURCES = [TextureIndex.entities_spikes_woodenWallSpikes, TextureIndex.entities_spikes_stoneWallSpikes];

const getMaterialTextureSources = (entityType: EntityType): readonly TextureIndex[] => {
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

export const BuildingMaterialComponentArray = registerServerComponentArray(
   ServerComponentType.buildingMaterial,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
BuildingMaterialComponentArray.updateFromData = updateFromData;

export function createBuildingMaterialComponentData(material: BuildingMaterial): BuildingMaterialComponentData {
   return {
      material: material
   };
}

function decodeData(reader: PacketReader): BuildingMaterialComponentData {
   const material = reader.readNumber();
   return {
      material: material
   };
}

function createComponent(entityComponentData: EntityComponentData): BuildingMaterialComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const buildingMaterialComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.buildingMaterial);

   return {
      material: buildingMaterialComponentData.material
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function updateFromData(data: BuildingMaterialComponentData, entity: Entity): void {
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
         const verticals = getRenderThingsByTag(renderObject, "bracingsComponent:vertical", 2) as TexturedRenderPart[];
         for (const renderPart of verticals) {
            renderPart.switchTextureSource(TextureIndex.entities_bracings_stoneVerticalPost);
         }

         const horizontal = getRenderThingByTag(renderObject, "bracingsComponent:horizontal") as TexturedRenderPart;
         horizontal.switchTextureSource(TextureIndex.entities_bracings_stoneHorizontalPost);
      }
   }
   
   buildingMaterialComponent.material = material;
}