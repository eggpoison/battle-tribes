import { BlueprintType, ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { randFloat, randAngle, rotatePointAroundOrigin, _point, assertUnreachable } from "../../../../../shared/src/utils";
import { playSoundOnHitbox } from "../../sound";
import { createDustCloud, createLightWoodSpeckParticle, createRockParticle, createRockSpeckParticle, createSawdustCloud, createWoodShardParticle } from "../../particles";
import { getEntityTextureAtlasInfo } from "../../texture-atlases";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData, getEntityRenderObject } from "../../world";
import _ServerComponentArray from "../ServerComponentArray";
import { BALLISTA_GEAR_X, BALLISTA_GEAR_Y, BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y } from "../../utils";
import { WARRIOR_HUT_SIZE } from "./HutComponent";
import { tribeComponentArray } from "./TribeComponent";
import { playerTribe } from "../../tribes";
import { Hitbox } from "../../hitboxes";
import { getEntityServerComponentTypes } from "../component-types";
import { getServerComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface BlueprintComponentData {
   readonly blueprintType: BlueprintType;
   readonly blueprintProgress: number;
   readonly associatedEntity: Entity;
}

export interface BlueprintComponent {
   readonly partialRenderParts: Array<TexturedRenderPart>;
   
   blueprintType: BlueprintType;
   lastBlueprintProgress: number;
   associatedEntity: Entity;
}

interface ProgressTextureInfo {
   readonly progressTextureIndexes: ReadonlyArray<TextureIndex>;
   // @Cleanup: Just use the last element of the progress textures
   readonly completedTextureIndex: TextureIndex;
   readonly offsetX: number;
   readonly offsetY: number;
   readonly rotation: number;
   readonly zIndex: number;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.blueprint, BlueprintComponentArray> {}
}

// @Cleanup: Some of these are duplicates
// @Robustness: Do something better than hand-writing 'blueprint-1', 'blueprint-2', etc. in an array.
export const BLUEPRINT_PROGRESS_TEXTURE_SOURCES: Record<BlueprintType, ReadonlyArray<ProgressTextureInfo>> = {
   [BlueprintType.woodenDoor]: [
      {
         progressTextureIndexes: [TextureIndex.entities_door_woodenDoorBlueprint1, TextureIndex.entities_door_woodenDoorBlueprint2],
         completedTextureIndex: TextureIndex.entities_door_woodenDoor,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.stoneDoor]: [
      {
         progressTextureIndexes: [TextureIndex.entities_door_stoneDoorBlueprint1, TextureIndex.entities_door_stoneDoorBlueprint2],
         completedTextureIndex: TextureIndex.entities_door_stoneDoor,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   // @Cleanup
   [BlueprintType.stoneDoorUpgrade]: [
      {
         progressTextureIndexes: [TextureIndex.entities_door_stoneDoorBlueprint1, TextureIndex.entities_door_stoneDoorBlueprint2],
         completedTextureIndex: TextureIndex.entities_door_stoneDoor,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.woodenEmbrasure]: [
      {
         progressTextureIndexes: [TextureIndex.entities_embrasure_woodenEmbrasureBlueprint1, TextureIndex.entities_embrasure_woodenEmbrasureBlueprint2, TextureIndex.entities_embrasure_woodenEmbrasureBlueprint3],
         completedTextureIndex: TextureIndex.entities_embrasure_woodenEmbrasure,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.stoneEmbrasure]: [
      {
         progressTextureIndexes: [TextureIndex.entities_embrasure_stoneEmbrasureBlueprint1, TextureIndex.entities_embrasure_stoneEmbrasureBlueprint2, TextureIndex.entities_embrasure_stoneEmbrasureBlueprint3],
         completedTextureIndex: TextureIndex.entities_embrasure_stoneEmbrasure,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   // @Cleanup
   [BlueprintType.stoneEmbrasureUpgrade]: [
      {
         progressTextureIndexes: [TextureIndex.entities_embrasure_stoneEmbrasureBlueprint1, TextureIndex.entities_embrasure_stoneEmbrasureBlueprint2, TextureIndex.entities_embrasure_stoneEmbrasureBlueprint3],
         completedTextureIndex: TextureIndex.entities_embrasure_stoneEmbrasure,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.woodenTunnel]: [
      {
         progressTextureIndexes: [TextureIndex.entities_tunnel_woodenTunnelBlueprint1, TextureIndex.entities_tunnel_woodenTunnelBlueprint2],
         completedTextureIndex: TextureIndex.entities_tunnel_woodenTunnel,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.stoneTunnel]: [
      {
         progressTextureIndexes: [TextureIndex.entities_tunnel_stoneTunnelBlueprint1, TextureIndex.entities_tunnel_stoneTunnelBlueprint2],
         completedTextureIndex: TextureIndex.entities_tunnel_stoneTunnel,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   // @Cleanup
   [BlueprintType.stoneTunnelUpgrade]: [
      {
         progressTextureIndexes: [TextureIndex.entities_tunnel_stoneTunnelBlueprint1, TextureIndex.entities_tunnel_stoneTunnelBlueprint2],
         completedTextureIndex: TextureIndex.entities_tunnel_stoneTunnel,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.ballista]: [
      // Base
      {
         progressTextureIndexes: [TextureIndex.entities_ballista_baseBlueprint1, TextureIndex.entities_ballista_baseBlueprint2, TextureIndex.entities_ballista_baseBlueprint3, TextureIndex.entities_ballista_baseBlueprint4, TextureIndex.entities_ballista_baseBlueprint5, TextureIndex.entities_ballista_baseBlueprint6, TextureIndex.entities_ballista_base],
         completedTextureIndex: TextureIndex.entities_ballista_base,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      },
      // Plate
      {
         progressTextureIndexes: [TextureIndex.entities_ballista_plateBlueprint1, TextureIndex.entities_ballista_plateBlueprint2, TextureIndex.entities_ballista_plate],
         completedTextureIndex: TextureIndex.entities_ballista_plate,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 2
      },
      // Shaft
      {
         progressTextureIndexes: [TextureIndex.entities_ballista_shaftBlueprint1, TextureIndex.entities_ballista_shaftBlueprint2, TextureIndex.entities_ballista_shaftBlueprint3, TextureIndex.entities_ballista_shaftBlueprint4, TextureIndex.entities_ballista_shaft],
         completedTextureIndex: TextureIndex.entities_ballista_shaft,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 3
      },
      // Crossbow
      {
         progressTextureIndexes: [TextureIndex.entities_ballista_crossbowBlueprint1, TextureIndex.entities_ballista_crossbowBlueprint2, TextureIndex.entities_ballista_crossbowBlueprint3, TextureIndex.entities_ballista_crossbowBlueprint4, TextureIndex.entities_ballista_crossbow],
         completedTextureIndex: TextureIndex.entities_ballista_crossbow,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 5
      },
      // Left gear
      {
         progressTextureIndexes: [TextureIndex.entities_ballista_gear],
         completedTextureIndex: TextureIndex.entities_ballista_gear,
         offsetX: BALLISTA_GEAR_X,
         offsetY: BALLISTA_GEAR_Y,
         rotation: 0,
         zIndex: 2.5
      },
      // Right gear
      {
         progressTextureIndexes: [TextureIndex.entities_ballista_gear],
         completedTextureIndex: TextureIndex.entities_ballista_gear,
         offsetX: -BALLISTA_GEAR_X,
         offsetY: BALLISTA_GEAR_Y,
         rotation: 0,
         zIndex: 2.6
      },
      // Ammo box
      {
         progressTextureIndexes: [TextureIndex.entities_ballista_ammoBoxBlueprint1, TextureIndex.entities_ballista_ammoBoxBlueprint2, TextureIndex.entities_ballista_ammoBox],
         completedTextureIndex: TextureIndex.entities_ballista_ammoBox,
         offsetX: BALLISTA_AMMO_BOX_OFFSET_X,
         offsetY: BALLISTA_AMMO_BOX_OFFSET_Y,
         rotation: Math.PI / 2,
         zIndex: 1
      }
   ],
   [BlueprintType.slingTurret]: [
      // Base
      {
         progressTextureIndexes: [TextureIndex.entities_slingTurret_baseBlueprint1, TextureIndex.entities_slingTurret_baseBlueprint2, TextureIndex.entities_slingTurret_baseBlueprint3, TextureIndex.entities_slingTurret_baseBlueprint4, TextureIndex.entities_slingTurret_slingTurretBase],
         completedTextureIndex: TextureIndex.entities_slingTurret_slingTurretBase,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      },
      // Plate
      {
         progressTextureIndexes: [TextureIndex.entities_slingTurret_plateBlueprint1, TextureIndex.entities_slingTurret_plateBlueprint2, TextureIndex.entities_slingTurret_slingTurretPlate],
         completedTextureIndex: TextureIndex.entities_slingTurret_slingTurretPlate,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 1
      },
      // Sling
      {
         progressTextureIndexes: [TextureIndex.entities_slingTurret_slingBlueprint1, TextureIndex.entities_slingTurret_slingBlueprint2],
         completedTextureIndex: TextureIndex.entities_slingTurret_slingBlueprint2,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 2
      }
   ],
   [BlueprintType.stoneWall]: [
      {
         progressTextureIndexes: [TextureIndex.entities_wall_stoneWallBlueprint1, TextureIndex.entities_wall_stoneWallBlueprint2, TextureIndex.entities_wall_stoneWallBlueprint3],
         completedTextureIndex: TextureIndex.entities_wall_stoneWall,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.stoneFloorSpikes]: [
      {
         progressTextureIndexes: [TextureIndex.entities_spikes_stoneFloorSpikesBlueprint1, TextureIndex.entities_spikes_stoneFloorSpikesBlueprint2],
         completedTextureIndex: TextureIndex.entities_spikes_stoneFloorSpikes,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.stoneWallSpikes]: [
      {
         progressTextureIndexes: [TextureIndex.entities_spikes_stoneWallSpikesBlueprint1, TextureIndex.entities_spikes_stoneWallSpikesBlueprint2],
         completedTextureIndex: TextureIndex.entities_spikes_stoneWallSpikes,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.warriorHutUpgrade]: [
      {
         progressTextureIndexes: [TextureIndex.entities_warriorHut_warriorHutBlueprint1, TextureIndex.entities_warriorHut_warriorHutBlueprint2, TextureIndex.entities_warriorHut_warriorHutBlueprint3, TextureIndex.entities_warriorHut_warriorHutBlueprint4, TextureIndex.entities_warriorHut_warriorHutBlueprint5, TextureIndex.entities_warriorHut_warriorHutBlueprint6],
         completedTextureIndex: TextureIndex.entities_warriorHut_warriorHut,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      },
      // Left door
      {
         progressTextureIndexes: [TextureIndex.entities_warriorHut_warriorHutDoor],
         completedTextureIndex: TextureIndex.entities_warriorHut_warriorHutDoor,
         offsetX: -20,
         offsetY: WARRIOR_HUT_SIZE / 2,
         rotation: Math.PI/2,
         zIndex: 1
      },
      // Right door
      {
         progressTextureIndexes: [TextureIndex.entities_warriorHut_warriorHutDoor],
         completedTextureIndex: TextureIndex.entities_warriorHut_warriorHutDoor,
         offsetX: 20,
         offsetY: WARRIOR_HUT_SIZE / 2,
         rotation: Math.PI*3/2,
         zIndex: 2
      }
   ],
   [BlueprintType.fenceGate]: [
      {
         progressTextureIndexes: [TextureIndex.entities_fenceGate_sideBlueprint1],
         completedTextureIndex: TextureIndex.entities_fenceGate_side,
         offsetX: -32,
         offsetY: 0,
         rotation: 0,
         zIndex: 1
      },
      {
         progressTextureIndexes: [TextureIndex.entities_fenceGate_sideBlueprint1],
         completedTextureIndex: TextureIndex.entities_fenceGate_side,
         offsetX: 32,
         offsetY: 0,
         rotation: 0,
         zIndex: 1
      },
      {
         progressTextureIndexes: [TextureIndex.entities_fenceGate_doorBlueprint1],
         completedTextureIndex: TextureIndex.entities_fenceGate_door,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      },
   ],
   [BlueprintType.stoneBracings]: [
      {
         progressTextureIndexes: [TextureIndex.entities_bracings_stoneVerticalPost],
         completedTextureIndex: TextureIndex.entities_bracings_stoneVerticalPost,
         offsetX: 0,
         offsetY: 28,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.scrappy]: [
      {
         progressTextureIndexes: [TextureIndex.entities_scrappy_body],
         completedTextureIndex: TextureIndex.entities_scrappy_body,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      },
      {
         progressTextureIndexes: [TextureIndex.entities_scrappy_hand],
         completedTextureIndex: TextureIndex.entities_scrappy_hand,
         offsetX: 0,
         offsetY: 20,
         rotation: 0,
         zIndex: 0
      }
   ],
   [BlueprintType.cogwalker]: [
      {
         progressTextureIndexes: [TextureIndex.entities_cogwalker_body],
         completedTextureIndex: TextureIndex.entities_cogwalker_body,
         offsetX: 0,
         offsetY: 0,
         rotation: 0,
         zIndex: 0
      },
      {
         progressTextureIndexes: [TextureIndex.entities_cogwalker_hand],
         completedTextureIndex: TextureIndex.entities_cogwalker_hand,
         offsetX: 28 * Math.sin(0.4 * Math.PI),
         offsetY: 28 * Math.cos(0.4 * Math.PI),
         rotation: 0,
         zIndex: 0
      },
      {
         progressTextureIndexes: [TextureIndex.entities_cogwalker_hand],
         completedTextureIndex: TextureIndex.entities_cogwalker_hand,
         offsetX: -28 * Math.sin(0.4 * Math.PI),
         offsetY: 28 * Math.cos(0.4 * Math.PI),
         rotation: 0,
         zIndex: 0
      }
   ]
};

const createWoodenBlueprintWorkParticleEffects = (entity: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   
   for (let i = 0; i < 2; i++) {
      createWoodShardParticle(hitbox.box.posX, hitbox.box.posY, 24);
   }

   for (let i = 0; i < 3; i++) {
      createLightWoodSpeckParticle(hitbox.box.posX, hitbox.box.posY, 24 * Math.random());
   }

   for (let i = 0; i < 2; i++) {
      const x = hitbox.box.posX + randFloat(-24, 24);
      const y = hitbox.box.posY + randFloat(-24, 24);
      createSawdustCloud(x, y);
   }
}
/*
// @Incomplete:
make them render on high position
make the origin point for the offset be based on the partial render part (random point in the partial render part)
*/

const createStoneBlueprintWorkParticleEffects = (originX: number, originY: number): void => {
   for (let i = 0; i < 3; i++) {
      const offsetDirection = randAngle();
      const offsetAmount = 12 * Math.random();
      createRockParticle(originX + offsetAmount * Math.sin(offsetDirection), originY + offsetAmount * Math.cos(offsetDirection), randAngle(), randFloat(50, 70), ParticleRenderLayer.high);
   }

   for (let i = 0; i < 10; i++) {
      createRockSpeckParticle(originX, originY, 12 * Math.random(), 0, 0, ParticleRenderLayer.high);
   }

   for (let i = 0; i < 2; i++) {
      const x = originX + randFloat(-24, 24);
      const y = originY + randFloat(-24, 24);
      createDustCloud(x, y);
   }
}

class BlueprintComponentArray extends _ServerComponentArray<BlueprintComponent, BlueprintComponentData> {
   public decodeData(reader: PacketReader): BlueprintComponentData {
      const blueprintType: BlueprintType = reader.readNumber();
      const blueprintProgress = reader.readNumber();
      const associatedEntity = reader.readNumber();

      return {
         blueprintType: blueprintType,
         blueprintProgress: blueprintProgress,
         associatedEntity: associatedEntity
      };
   }

   public createComponent(entityComponentData: EntityComponentData): BlueprintComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const blueprintComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.blueprint);
      
      return {
         partialRenderParts: [],
         blueprintType: blueprintComponentData.blueprintType,
         lastBlueprintProgress: blueprintComponentData.blueprintProgress,
         associatedEntity: blueprintComponentData.associatedEntity
      };
   }

   public getMaxRenderParts(entityComponentData: EntityComponentData): number {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const blueprintComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.blueprint);
      return 2 * BLUEPRINT_PROGRESS_TEXTURE_SOURCES[blueprintComponentData.blueprintType].length;
   }

   public onLoad(entity: Entity): void {
      updatePartialTexture(entity);
      
      const blueprintComponent = blueprintComponentArray.getComponent(entity);
      const tribeComponent = tribeComponentArray.getComponent(entity);
      
      // Create completed render parts
      const progressTextureInfoArray = BLUEPRINT_PROGRESS_TEXTURE_SOURCES[blueprintComponent.blueprintType];
      const renderObject = getEntityRenderObject(entity);
      for (let i = 0; i < progressTextureInfoArray.length; i++) {
         const progressTextureInfo = progressTextureInfoArray[i];

         const transformComponent = TransformComponentArray.getComponent(entity);
         const hitbox = transformComponent.hitboxes[0];

         const renderPart = new TexturedRenderPart(
            hitbox,
            progressTextureInfo.zIndex,
            progressTextureInfo.rotation,
            // @HACK, this shittery is cuz the fence gate doesn't have its first hitbox at the 'core' position
            progressTextureInfo.offsetX + (blueprintComponent.blueprintType === BlueprintType.fenceGate ? 32 : 0), progressTextureInfo.offsetY,
            progressTextureInfo.completedTextureIndex
         );
         renderPart.opacity = 0.5;
         if (tribeComponent.tribeID === playerTribe.id) {
            renderPart.tintR = 0.2;
            renderPart.tintG = 0.1;
            renderPart.tintB = 0.8;
         } else {
            renderPart.tintR = 0.8;
            renderPart.tintG = 0.0;
            renderPart.tintB = 0.15;
         }
         renderObject.attachRenderPart(renderPart);
      }
   }

   public onSpawn(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      playSoundOnHitbox("blueprint-place.mp3", 0.4, 1, entity, hitbox, false);
   }

   public updateFromData(data: BlueprintComponentData, entity: Entity): void {
      const blueprintComponent = blueprintComponentArray.getComponent(entity);
      
      blueprintComponent.blueprintType = data.blueprintType;
      const blueprintProgress = data.blueprintProgress;
      blueprintComponent.associatedEntity = data.associatedEntity;

      // @Speed: don't do always, only if the data changes!
      updatePartialTexture(entity);

      if (blueprintProgress !== blueprintComponent.lastBlueprintProgress) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         const hitbox = transformComponent.hitboxes[0];

         playSoundOnHitbox("blueprint-work.mp3", 0.4, randFloat(0.9, 1.1), entity, hitbox, false);

         const progressTexture = getCurrentBlueprintProgressTexture(blueprintComponent.blueprintType, blueprintProgress);
         
         // @Cleanup
         const textureAtlas = getEntityTextureAtlasInfo();
         const textureIndex = progressTexture.completedTextureIndex;
         const xShift = textureAtlas.textureWidths[textureIndex] * 4 * 0.5 * randFloat(-0.75, 0.75);
         const yShift = textureAtlas.textureHeights[textureIndex] * 4 * 0.5 * randFloat(-0.75, 0.75);
         rotatePointAroundOrigin(progressTexture.offsetX + xShift, progressTexture.offsetY + yShift, progressTexture.rotation);
         const particleOriginX = hitbox.box.posX + _point.x;
         const particleOriginY = hitbox.box.posY + _point.y;
         
         // @Incomplete: Change the particle effect type depending on the material of the worked-on partial texture
         // Create particle effects
         switch (blueprintComponent.blueprintType) {
            case BlueprintType.woodenDoor:
            case BlueprintType.woodenEmbrasure:
            case BlueprintType.woodenTunnel:
            case BlueprintType.slingTurret:
            case BlueprintType.ballista:
            case BlueprintType.warriorHutUpgrade:
            case BlueprintType.fenceGate: {
               createWoodenBlueprintWorkParticleEffects(entity);
               break;
            }
            case BlueprintType.stoneDoorUpgrade:
            case BlueprintType.stoneEmbrasure:
            case BlueprintType.stoneEmbrasureUpgrade:
            case BlueprintType.stoneFloorSpikes:
            case BlueprintType.stoneTunnel:
            case BlueprintType.stoneTunnelUpgrade:
            case BlueprintType.stoneWallSpikes:
            case BlueprintType.stoneWall:
            case BlueprintType.stoneDoor:
            case BlueprintType.stoneBracings: {
               createStoneBlueprintWorkParticleEffects(particleOriginX, particleOriginY);
               break;
            }
            case BlueprintType.scrappy:
            case BlueprintType.cogwalker: {
               createStoneBlueprintWorkParticleEffects(particleOriginX, particleOriginY);
               break;
            }
            default: {
               assertUnreachable(blueprintComponent.blueprintType);
            }
         }
      }
      blueprintComponent.lastBlueprintProgress = blueprintProgress;
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];

      playSoundOnHitbox("blueprint-work.mp3", 0.4, 1, entity, hitbox, false);
      playSoundOnHitbox("structure-shaping.mp3", 0.4, 1, entity, hitbox, false);

      // @Cleanup: Copy and pasted from blueprint component
      const blueprintComponent = blueprintComponentArray.getComponent(entity);
      switch (blueprintComponent.blueprintType) {
         case BlueprintType.woodenDoor:
         case BlueprintType.woodenEmbrasure:
         case BlueprintType.woodenTunnel:
         case BlueprintType.slingTurret:
         case BlueprintType.ballista:
         case BlueprintType.warriorHutUpgrade:
         case BlueprintType.fenceGate: {
            for (let i = 0; i < 5; i++) {
               const x = hitbox.box.posX + randFloat(-32, 32);
               const y = hitbox.box.posY + randFloat(-32, 32);
               createSawdustCloud(x, y);
            }
      
            for (let i = 0; i < 8; i++) {
               createLightWoodSpeckParticle(hitbox.box.posX, hitbox.box.posY, 32);
            }
            break;
         }
         case BlueprintType.stoneDoorUpgrade:
         case BlueprintType.stoneEmbrasure:
         case BlueprintType.stoneEmbrasureUpgrade:
         case BlueprintType.stoneFloorSpikes:
         case BlueprintType.stoneTunnel:
         case BlueprintType.stoneTunnelUpgrade:
         case BlueprintType.stoneWallSpikes:
         case BlueprintType.stoneWall:
         case BlueprintType.stoneDoor:
         case BlueprintType.stoneBracings: {
            for (let i = 0; i < 5; i++) {
               const offsetDirection = randAngle();
               const offsetAmount = 32 * Math.random();
               createRockParticle(hitbox.box.posX + offsetAmount * Math.sin(offsetDirection), hitbox.box.posY + offsetAmount * Math.cos(offsetDirection), randAngle(), randFloat(50, 70), ParticleRenderLayer.high);
            }
         
            for (let i = 0; i < 10; i++) {
               createRockSpeckParticle(hitbox.box.posX, hitbox.box.posY, 32 * Math.random(), 0, 0, ParticleRenderLayer.high);
            }
         
            for (let i = 0; i < 3; i++) {
               const x = hitbox.box.posX + randFloat(-32, 32);
               const y = hitbox.box.posY + randFloat(-32, 32);
               createDustCloud(x, y);
            }
            break;
         }
         case BlueprintType.scrappy:
         case BlueprintType.cogwalker: {
            break;
         }
         default: {
            assertUnreachable(blueprintComponent.blueprintType);
         }
      }
   }
}

export const blueprintComponentArray = registerServerComponentArray(ServerComponentType.blueprint, BlueprintComponentArray, true);

const updatePartialTexture = (entity: Entity): void => {
   const blueprintComponent = blueprintComponentArray.getComponent(entity);
   const blueprintType = blueprintComponent.blueprintType;
   const blueprintProgress = blueprintComponent.lastBlueprintProgress;
   
   const numTextures = countProgressTextures(blueprintType);
   const stage = Math.floor(blueprintProgress * (numTextures + 1));
   if (stage === 0) {
      return;
   }
   
   const lastTextureIndex = stage - 1;
   const progressTextureInfoArray = BLUEPRINT_PROGRESS_TEXTURE_SOURCES[blueprintType];

   let currentIndexStart = 0;
   for (let i = 0; i < progressTextureInfoArray.length; i++) {
      const progressTextureInfo = progressTextureInfoArray[i];

      let localTextureIndex = lastTextureIndex - currentIndexStart;
      if (localTextureIndex >= progressTextureInfo.progressTextureIndexes.length) {
         localTextureIndex = progressTextureInfo.progressTextureIndexes.length - 1;
      }

      const textureIndex = progressTextureInfo.progressTextureIndexes[localTextureIndex];
      if (blueprintComponent.partialRenderParts.length <= i) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         // @HACK @COPYNPASTE since fence gates don't have their first hitbox at its actual 'position'
         let hitbox: Hitbox;
         if (blueprintType === BlueprintType.fenceGate) {
            // 3rd hitbox is the door hitbox
            hitbox = transformComponent.hitboxes[2];
         } else {
            hitbox = transformComponent.hitboxes[0];
         }
         
         // New render part
         const renderPart = new TexturedRenderPart(
            hitbox,
            progressTextureInfo.zIndex + 0.01,
            progressTextureInfo.rotation,
            progressTextureInfo.offsetX, progressTextureInfo.offsetY,
            textureIndex
         );

         const renderObject = getEntityRenderObject(entity);
         renderObject.attachRenderPart(renderPart);
         blueprintComponent.partialRenderParts.push(renderPart);
      } else {
         // Existing render part
         blueprintComponent.partialRenderParts[i].switchTextureSource(textureIndex);
      }

      currentIndexStart += progressTextureInfo.progressTextureIndexes.length;

      // If the last texture index hasn't reached the next set of progress textures, then break
      if (lastTextureIndex < currentIndexStart) {
         break;
      }
   }
}

const countProgressTextures = (blueprintType: BlueprintType): number => {
   let numTextures = 0;
   const progressTextureInfoArray = BLUEPRINT_PROGRESS_TEXTURE_SOURCES[blueprintType];
   for (let i = 0; i < progressTextureInfoArray.length; i++) {
      const progressTextureInfo = progressTextureInfoArray[i];
      numTextures += progressTextureInfo.progressTextureIndexes.length;
   }
   return numTextures;
}

const getCurrentBlueprintProgressTexture = (blueprintType: BlueprintType, blueprintProgress: number): ProgressTextureInfo => {
   const numTextures = countProgressTextures(blueprintType);

   const stage = Math.floor(blueprintProgress * (numTextures + 1));
   
   const lastTextureIndex = stage - 1;
   const progressTextureInfoArray = BLUEPRINT_PROGRESS_TEXTURE_SOURCES[blueprintType];

   let currentIndexStart = 0;
   for (let i = 0; i < progressTextureInfoArray.length; i++) {
      const progressTextureInfo = progressTextureInfoArray[i];

      currentIndexStart += progressTextureInfo.progressTextureIndexes.length;

      if (currentIndexStart >= lastTextureIndex) {
         return progressTextureInfo;
      }
   }

   return progressTextureInfoArray[progressTextureInfoArray.length - 1];
}