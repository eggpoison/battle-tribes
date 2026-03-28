import { Box, HitboxCollisionType, distance, Point, StructureType, PacketReader, ServerComponentType, BuildingMaterial, DEFAULT_COLLISION_MASK, CollisionBit } from "webgl-test-shared";
import { createHitboxQuick } from "./hitboxes";
import { createBracingsComponentData } from "./entity-components/server-components/BracingsComponent";
import { createBuildingMaterialComponentData } from "./entity-components/server-components/BuildingMaterialComponent";
import { createCampfireComponentData } from "./entity-components/server-components/CampfireComponent";
import { createCookingComponentData } from "./entity-components/server-components/CookingComponent";
import { createFireTorchComponentData } from "./entity-components/server-components/FireTorchComponent";
import { createFurnaceComponentData } from "./entity-components/server-components/FurnaceComponent";
import { createHealthComponentData } from "./entity-components/server-components/HealthComponent";
import { createInventoryComponentData } from "./entity-components/server-components/InventoryComponent";
import { createSlurbTorchComponentData } from "./entity-components/server-components/SlurbTorchComponent";
import { createSpikesComponentData } from "./entity-components/server-components/SpikesComponent";
import { createStatusEffectComponentData } from "./entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "./entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "./entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "./entity-components/server-components/TribeComponent";
import { EntityRenderObject, recalculateEntityRenderObjectData } from "./EntityRenderObject";
import { currentSnapshot } from "./game";
import Layer from "./Layer";
import { thingIsVisualRenderPart } from "./render-parts/render-parts";
import { removeGhostRenderObject } from "./rendering/webgl/entity-ghost-rendering";
import { playerTribe } from "./tribes";
import { createEntityCreationInfo, EntityComponentData, layers } from "./world";
import { padBoxData, readBoxFromData } from "./networking/packet-hitboxes";
import { createBarrelComponentData } from "./entity-components/server-components/BarrelComponent";
import { cursorWorldPos } from "./camera";
import { ServerComponentData } from "./entity-components/components";
import { getEntityServerComponentTypes } from "./entity-component-types";

export interface VirtualBuilding {
   readonly entityType: StructureType;
   readonly id: number;
   readonly layer: Layer;
   readonly position: Readonly<Point>;
   readonly rotation: number;
   readonly boxes: ReadonlyArray<Box>;
   readonly renderObject: EntityRenderObject;
}

export interface VirtualBuildingSafetySimulation {
   readonly virtualBuilding: VirtualBuilding;
   readonly safety: number;
}

export interface GhostBuildingPlan {
   readonly virtualBuilding: VirtualBuilding;
   readonly virtualBuildingsMap: Map<number, VirtualBuildingSafetySimulation>;
   lastUpdateTicks: number;
}

const ghostBuildingPlans = new Map<number, GhostBuildingPlan>();

const padVirtualBuildingData = (reader: PacketReader): void => {
   reader.padOffset(5 * Float32Array.BYTES_PER_ELEMENT);

   const numHitboxes = reader.readNumber();
   for (let i = 0; i < numHitboxes; i++) {
      padBoxData(reader);
   }
}

const readVirtualBuildingFromData = (reader: PacketReader, virtualBuildingID: number): VirtualBuilding => {
   const entityType = reader.readNumber() as StructureType;
   const layerDepth = reader.readNumber();
   const x = reader.readNumber();
   const y = reader.readNumber();
   const rotation = reader.readNumber();
   
   const layer = layers[layerDepth];

   // Hitboxes
   const boxes = new Array<Box>();
   const numHitboxes = reader.readNumber();
   for (let i = 0; i < numHitboxes; i++) {
      const box = readBoxFromData(reader);
      boxes.push(box);
   }

   // @Copynpaste @Hack

   const components = new Array<ServerComponentData<ServerComponentType>>();

   const componentTypes = getEntityServerComponentTypes(entityType);
   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];

      switch (componentType) {
         case ServerComponentType.transform: {
            const transformComponentData = createTransformComponentData(
               // @HACK
               boxes.map(box => {
                  return createHitboxQuick(0, 0, null, box, 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [])
               }),
            );

            components.push(transformComponentData);
            break;
         }
         case ServerComponentType.health: {
            const data = createHealthComponentData();
            components.push(data);
            break;
         }
         case ServerComponentType.statusEffect: {
            const data = createStatusEffectComponentData();
            components.push(data);
            break;
         }
         case ServerComponentType.structure: {
            components.push(createStructureComponentData());
            break;
         }
         case ServerComponentType.tribe: {
            components.push(createTribeComponentData(playerTribe));
            break;
         }
         case ServerComponentType.buildingMaterial: {
            components.push(createBuildingMaterialComponentData(BuildingMaterial.wood));
            break;
         }
         case ServerComponentType.bracings: {
            components.push(createBracingsComponentData());
            break;
         }
         case ServerComponentType.inventory: {
            components.push(createInventoryComponentData({}));
            break;
         }
         case ServerComponentType.cooking: {
            components.push(createCookingComponentData());
            break;
         }
         case ServerComponentType.campfire: {
            components.push(createCampfireComponentData());
            break;
         }
         case ServerComponentType.furnace: {
            components.push(createFurnaceComponentData());
            break;
         }
         case ServerComponentType.spikes: {
            components.push(createSpikesComponentData());
            break;
         }
         case ServerComponentType.fireTorch: {
            components.push(createFireTorchComponentData());
            break;
         }
         case ServerComponentType.slurbTorch: {
            components.push(createSlurbTorchComponentData());
            break;
         }
         case ServerComponentType.barrel: {
            components.push(createBarrelComponentData());
            break;
         }
         case ServerComponentType.researchBench: {
            components.push({
               isOccupied: false
            });
            break;
         }
         case ServerComponentType.totemBanner: {
            components.push({
               banners: []
            });
            break;
         }
         case ServerComponentType.hut: {
            components.push({
               doorSwingAmount: 0,
               isRecalling: false
            });
            break;
         }
         default: {
            throw new Error(ServerComponentType[componentType]);
         }
      }
   }

   const entityComponentData: EntityComponentData = {
      entityType: entityType,
      serverComponentData: components,
      // @Incomplete
      clientComponentData: []
   };

   // Create the entity
   const creationInfo = createEntityCreationInfo(0, entityComponentData);

   const renderObject = creationInfo.renderObject;

   // Modify all the render part's opacity
   for (let i = 0; i < renderObject.renderPartsByZIndex.length; i++) {
      const renderThing = renderObject.renderPartsByZIndex[i];
      if (thingIsVisualRenderPart(renderThing)) {
         renderThing.opacity *= 0.5;
      }
   }

   // @Hack: Manually set the render object's position and rotation
   // @INCOMPLETE
   // const transformComponentData = components[ServerComponentType.transform]!;
   // renderObject.renderPosition.x = transformComponentData.position.x;
   // renderObject.renderPosition.y = transformComponentData.position.y;
   // renderObject.rotation = transformComponentData.rotation;
   recalculateEntityRenderObjectData(renderObject);

   return {
      entityType: entityType,
      id: virtualBuildingID,
      layer: layer,
      position: new Point(x, y),
      rotation: rotation,
      boxes: boxes,
      renderObject: renderObject
   };
}

export function readGhostVirtualBuildings(reader: PacketReader): void {
   while (reader.readBool()) {
      const virtualBuildingID = reader.readNumber();

      const existingGhostBuildingPlan = ghostBuildingPlans.get(virtualBuildingID);
      if (existingGhostBuildingPlan !== undefined) {
         padVirtualBuildingData(reader);

         const numPotentialPlans = reader.readNumber();
         for (let i = 0; i < numPotentialPlans; i++) {
            reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
            padVirtualBuildingData(reader);
            reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
         }

         existingGhostBuildingPlan.lastUpdateTicks = currentSnapshot.tick;
      } else {
         const virtualBuilding = readVirtualBuildingFromData(reader, virtualBuildingID);
   
         const virtualBuildingSafetySimulationMap = new Map<number, VirtualBuildingSafetySimulation>();
         const numPotentialPlans = reader.readNumber();
         for (let i = 0; i < numPotentialPlans; i++) {
            const virtualBuildingID = reader.readNumber();
            const virtualBuilding = readVirtualBuildingFromData(reader, virtualBuildingID);
         
            const safety = reader.readNumber();
   
            const VirtualBuildingSafetySimulation: VirtualBuildingSafetySimulation = {
               virtualBuilding: virtualBuilding,
               safety: safety
            };
            virtualBuildingSafetySimulationMap.set(virtualBuilding.id, VirtualBuildingSafetySimulation);
         }
   
         const ghostBuildingPlan: GhostBuildingPlan = {
            virtualBuilding: virtualBuilding,
            virtualBuildingsMap: virtualBuildingSafetySimulationMap,
            lastUpdateTicks: currentSnapshot.tick
         };
         ghostBuildingPlans.set(virtualBuilding.id, ghostBuildingPlan);
      }
   }
}

export function getVisibleBuildingPlan(): GhostBuildingPlan | null {
   let closestGhostBuildingPlan: GhostBuildingPlan | undefined;
   let minDist = 64;
   for (const pair of ghostBuildingPlans) {
      const ghostBuildingPlan = pair[1];
      const virtualBuilding = ghostBuildingPlan.virtualBuilding;
      
      const dist = distance(cursorWorldPos.x, cursorWorldPos.y, virtualBuilding.position.x, virtualBuilding.position.y);
      if (dist < minDist) {
         minDist = dist;
         closestGhostBuildingPlan = ghostBuildingPlan;
      }
   }

   if (closestGhostBuildingPlan !== undefined) {
      return closestGhostBuildingPlan;
   }
   return null;
}

export function pruneGhostBuildingPlans(): void {
   for (const pair of ghostBuildingPlans) {
      const ghostBuildingInfo = pair[1];
      if (ghostBuildingInfo.lastUpdateTicks !== currentSnapshot.tick) {
         removeGhostRenderObject(ghostBuildingInfo.virtualBuilding.renderObject);
         ghostBuildingPlans.delete(pair[0]);
      }
   }
}