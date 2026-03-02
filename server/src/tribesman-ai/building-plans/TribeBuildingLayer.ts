import { Box, cloneBox } from "../../../../shared/src/boxes/boxes";
import { RectangularBox } from "../../../../shared/src/boxes/RectangularBox";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType, NUM_ENTITY_TYPES } from "../../../../shared/src/entities";
import { Packet } from "../../../../shared/src/packets";
import { Settings } from "../../../../shared/src/settings";
import { STRUCTURE_TYPES, StructureType } from "../../../../shared/src/structures";
import { angle, clampAngleA, Point } from "../../../../shared/src/utils";
import { Hitbox } from "../../hitboxes";
import Layer from "../../Layer";
import { addBoxDataToPacket, getBoxDataLength } from "../../server/packet-hitboxes";
import { createStructureConfig } from "../../structure-placement";
import Tribe from "../../Tribe";
import { getTribes } from "../../world";
import { addBoxesOccupiedNodes, getSafetyNode, SafetyNode } from "../ai-building";
import { TribeRoom } from "../ai-building-areas";

/** The 4 lines of nodes directly outside a wall. */
type WallNodeSides = [Array<SafetyNode>, Array<SafetyNode>, Array<SafetyNode>, Array<SafetyNode>];

export interface RestrictedBuildingArea {
   readonly position: Point;
   readonly width: number;
   readonly height: number;
   readonly rotation: number;
   /** The ID of the building responsible for the restricted area */
   readonly associatedStructureID: number;
   readonly box: RectangularBox;
   readonly occupiedNodes: Set<SafetyNode>;
}

export const enum VirtualStructureType {
   unidentified,
   wall
}

interface BaseVirtualStructure {
   readonly entityType: StructureType;
   readonly id: number;
   readonly layer: Layer;
   readonly position: Readonly<Point>;
   readonly rotation: number;
   readonly boxes: ReadonlyArray<Box>;
   readonly occupiedNodes: Set<SafetyNode>;
   readonly restrictedBuildingAreas: ReadonlyArray<RestrictedBuildingArea>;
}

export interface VirtualUnidentifiedBuilding extends BaseVirtualStructure {
   readonly entityType: Exclude<StructureType, EntityType.wall | EntityType.door>;
}

export interface VirtualWall extends BaseVirtualStructure {
   readonly entityType: EntityType.wall;
   readonly topSideNodes: Array<SafetyNode>;
   readonly rightSideNodes: Array<SafetyNode>;
   readonly bottomSideNodes: Array<SafetyNode>;
   readonly leftSideNodes: Array<SafetyNode>;
   connectionBitset: number;
}

export const enum TribeDoorType {
   outside,
   enclosed
}

export interface VirtualDoor extends BaseVirtualStructure {
   readonly entityType: EntityType.door;
   doorType: TribeDoorType;
}

export type VirtualStructure = VirtualUnidentifiedBuilding | VirtualWall | VirtualDoor;

// @Location
export type EntitiesByEntityType = { [T in EntityType]: Array<Entity> };
export type VirtualStructuresByEntityType = { [T in StructureType]: Array<VirtualStructure> };

const createRestrictedBuildingArea = (position: Point, width: number, height: number, rotation: number, associatedBuildingID: number): RestrictedBuildingArea => {
   const box = new RectangularBox(position, new Point(0, 0), rotation, width, height);

   const occupiedNodes = new Set<SafetyNode>();
   addBoxesOccupiedNodes([box], occupiedNodes);
   
   return {
      position: position,
      width: width,
      height: height,
      rotation: rotation,
      associatedStructureID: associatedBuildingID,
      box: box,
      occupiedNodes: occupiedNodes
   };
}

export function createVirtualStructureFromHitboxes(buildingLayer: TribeBuildingLayer, position: Readonly<Point>, rotation: number, entityType: StructureType, hitboxes: ReadonlyArray<Hitbox>): VirtualStructure {
   const boxes = hitboxes.map(hitbox => cloneBox(hitbox.box));
   
   const occupiedNodes = new Set<SafetyNode>();
   addBoxesOccupiedNodes(boxes, occupiedNodes);
   
   const virtualEntityID = buildingLayer.tribe.virtualEntityIDCounter++;
   
   switch (entityType) {
      case EntityType.wall: {
         const sides = getWallNodeSides(position, rotation, occupiedNodes);
         
         const virtualBuilding: VirtualWall = {
            id: virtualEntityID,
            layer: buildingLayer.layer,
            position: position,
            rotation: rotation,
            occupiedNodes: occupiedNodes,
            entityType: entityType,
            boxes: boxes,
            restrictedBuildingAreas: [],
            topSideNodes: sides[0],
            rightSideNodes: sides[1],
            bottomSideNodes: sides[2],
            leftSideNodes: sides[3],
            connectionBitset: 0
         };
         updateWallConnectionBitset(buildingLayer, virtualBuilding);
         return virtualBuilding;
      }
      case EntityType.door: {
         const restrictedBuildingAreas = new Array<RestrictedBuildingArea>();
         for (let i = 0; i < 2; i++) {
            const offsetAmount = 16 / 2 + 50;
            const offsetDirection = rotation + (i === 1 ? Math.PI : 0);
            const restrictedAreaPosition = position.offset(offsetAmount, offsetDirection);
         
            const restrictedArea = createRestrictedBuildingArea(restrictedAreaPosition, 50, 50, offsetDirection, virtualEntityID);
            restrictedBuildingAreas.push(restrictedArea);
         }

         const virtualBuilding: VirtualDoor = {
            entityType: entityType,
            id: virtualEntityID,
            layer: buildingLayer.layer,
            position: position,
            rotation: rotation,
            occupiedNodes: occupiedNodes,
            boxes: boxes,
            restrictedBuildingAreas: restrictedBuildingAreas,
            // Default value until the actual door type gets calculated
            doorType: TribeDoorType.enclosed
         };
         return virtualBuilding;
      }
      default: {
         const restrictedBuildingAreas = new Array<RestrictedBuildingArea>();

         switch (entityType) {
            case EntityType.workerHut: {
               const offsetAmount = 88 / 2 + 55;
               const x = position.x + offsetAmount * Math.sin(rotation);
               const y = position.y + offsetAmount * Math.cos(rotation);
      
               const restrictedArea = createRestrictedBuildingArea(new Point(x, y), 100, 70, rotation, virtualEntityID);
               restrictedBuildingAreas.push(restrictedArea);
               
               break;
            }
            case EntityType.warriorHut: {
               // @Incomplete
      
               break;
            }
            case EntityType.workbench: {
               const offsetAmount = 80 / 2 + 55;
               const offsetDirection = rotation + Math.PI;
               const restrictedAreaPosition = position.offset(offsetAmount, offsetDirection);
      
               const restrictedArea = createRestrictedBuildingArea(restrictedAreaPosition, 80, 80, offsetDirection, virtualEntityID);
               restrictedBuildingAreas.push(restrictedArea);
               
               break;
            }
         }
         
         const virtualBuilding: VirtualUnidentifiedBuilding = {
            entityType: entityType,
            id: virtualEntityID,
            layer: buildingLayer.layer,
            position: position,
            rotation: rotation,
            occupiedNodes: occupiedNodes,
            boxes: boxes,
            restrictedBuildingAreas: restrictedBuildingAreas
         };
         return virtualBuilding;
      }
   }
}

export function createVirtualStructure(buildingLayer: TribeBuildingLayer, position: Readonly<Point>, rotation: number, entityType: StructureType): VirtualStructure {
   // @SUPAHACK
   const tribe = getTribes()[0];
   const entityConfig = createStructureConfig(tribe, entityType, position, rotation, []);
   const transformComponent = entityConfig.components[ServerComponentType.transform]!;
   
   return createVirtualStructureFromHitboxes(buildingLayer, position, rotation, entityType, transformComponent.hitboxes);
}

export function addVirtualBuildingData(packet: Packet, virtualBuilding: VirtualStructure): void {
   packet.writeNumber(virtualBuilding.id);
   packet.writeNumber(virtualBuilding.entityType);
   packet.writeNumber(virtualBuilding.layer.depth);
   packet.writeNumber(virtualBuilding.position.x);
   packet.writeNumber(virtualBuilding.position.y);
   packet.writeNumber(virtualBuilding.rotation);

   // Hitboxes
   packet.writeNumber(virtualBuilding.boxes.length);
   for (const box of virtualBuilding.boxes) {
      addBoxDataToPacket(packet, box);
   }
}
export function getVirtualBuildingDataLength(virtualBuilding: VirtualStructure): number {
   let lengthBytes = 6 * Float32Array.BYTES_PER_ELEMENT;

   lengthBytes += Float32Array.BYTES_PER_ELEMENT;
   for (const box of virtualBuilding.boxes) {
      lengthBytes += getBoxDataLength(box);
   }
   return lengthBytes;
}

const getWallSideNodeDir = (node: SafetyNode, wallPosition: Point, wallRotation: number): number => {
   const nodeX = node % Settings.SAFETY_NODES_IN_WORLD_WIDTH;
   const nodeY = Math.floor(node / Settings.SAFETY_NODES_IN_WORLD_WIDTH);
   const x = (nodeX + 0.5) * Settings.SAFETY_NODE_SEPARATION;
   const y = (nodeY + 0.5) * Settings.SAFETY_NODE_SEPARATION;

   let dir = angle(x - wallPosition.x, y - wallPosition.y) - wallRotation;
   dir += Math.PI/4;
   dir = clampAngleA(dir);

   return dir;
}

const getWallNodeSides = (wallPosition: Point, wallRotation: number, occupiedNodes: ReadonlySet<SafetyNode>): WallNodeSides => {
   // Find border nodes
   const borderNodes = new Set<SafetyNode>();
   for (const node of occupiedNodes) {
      const nodeX = node % Settings.SAFETY_NODES_IN_WORLD_WIDTH;
      const nodeY = Math.floor(node / Settings.SAFETY_NODES_IN_WORLD_WIDTH);

      // Top
      if (nodeY < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
         const node = getSafetyNode(nodeX, nodeY + 1);
         if (!occupiedNodes.has(node)) {
            borderNodes.add(node);
         }
      }

      // Right
      if (nodeX < Settings.SAFETY_NODES_IN_WORLD_WIDTH - 1) {
         const node = getSafetyNode(nodeX + 1, nodeY);
         if (!occupiedNodes.has(node)) {
            borderNodes.add(node);
         }
      }

      // Bottom
      if (nodeY > 0) {
         const node = getSafetyNode(nodeX, nodeY - 1);
         if (!occupiedNodes.has(node)) {
            borderNodes.add(node);
         }
      }

      // Left
      if (nodeX > 0) {
         const node = getSafetyNode(nodeX - 1, nodeY);
         if (!occupiedNodes.has(node)) {
            borderNodes.add(node);
         }
      }
   }
   
   const topNodes = new Array<SafetyNode>();
   const rightNodes = new Array<SafetyNode>();
   const bottomNodes = new Array<SafetyNode>();
   const leftNodes = new Array<SafetyNode>();

   // Sort the border nodes based on their dir
   const sortedBorderNodes = new Array<SafetyNode>();
   for (const node of borderNodes) {
      const nodeDir = getWallSideNodeDir(node, wallPosition, wallRotation);
      
      let insertIdx = 0;
      for (let i = 0; i < sortedBorderNodes.length; i++) {
         const currentNode = sortedBorderNodes[i];
         const currentNodeDir = getWallSideNodeDir(currentNode, wallPosition, wallRotation);
         if (nodeDir < currentNodeDir) {
            break;
         }
         insertIdx++;
      }

      sortedBorderNodes.splice(insertIdx, 0, node);
   }

   const separation = 0.2;

   for (const node of sortedBorderNodes) {
      const dir = getWallSideNodeDir(node, wallPosition, wallRotation);
      if (dir > separation && dir < Math.PI/2 - separation) {
         topNodes.push(node);
      } else if (dir > Math.PI/2 + separation && dir < Math.PI - separation) {
         rightNodes.push(node);
      } else if (dir > Math.PI + separation && dir < Math.PI*3/2 - separation) {
         bottomNodes.push(node)
      } else if (dir > Math.PI*3/2 + separation && dir < Math.PI*2 - separation) {
         leftNodes.push(node);
      }
   }

   return [topNodes, rightNodes, bottomNodes, leftNodes];
}

const wallSideIsConnected = (buildingLayer: TribeBuildingLayer, wallSideNodes: ReadonlyArray<SafetyNode>): boolean => {
   // Make sure all nodes of the side link to another wall, except for the first and last
   for (let i = 1; i < wallSideNodes.length - 1; i++) {
      const node = wallSideNodes[i];
      if (!buildingLayer.occupiedSafetyNodes.has(node)) {
         return false;
      }

      // Only make connections between walls and doors
      const virtualBuildingIDs = buildingLayer.occupiedNodeToVirtualStructureIDRecord[node];
      for (let i = 0; i < virtualBuildingIDs.length; i++) {
         const buildingID = virtualBuildingIDs[i];
         const virtualBuilding = buildingLayer.virtualStructureRecord[buildingID];
         if (virtualBuilding.entityType !== EntityType.wall && virtualBuilding.entityType !== EntityType.door) {
            return false;
         }
      }
   }

   return true;
}

const updateWallConnectionBitset = (buildingLayer: TribeBuildingLayer, wall: VirtualWall): void => {
   let connections = 0;

   if (wallSideIsConnected(buildingLayer, wall.topSideNodes)) {
      connections |= 0b1;
   }
   if (wallSideIsConnected(buildingLayer, wall.rightSideNodes)) {
      connections |= 0b10;
   }
   if (wallSideIsConnected(buildingLayer, wall.bottomSideNodes)) {
      connections |= 0b100;
   }
   if (wallSideIsConnected(buildingLayer, wall.leftSideNodes)) {
      connections |= 0b1000;
   }

   wall.connectionBitset = connections;
}

export function updateTribeWalls(buildingLayer: TribeBuildingLayer): void {
   for (const wall of buildingLayer.virtualStructuresByEntityType[EntityType.wall]) {
      // @Hack: cast
      updateWallConnectionBitset(buildingLayer, wall as VirtualWall);
   }
}

export function getNumWallConnections(wallConnectionBitset: number): number {
   let numConnections = 0;
   if ((wallConnectionBitset & 0b0001) !== 0) {
      numConnections++;
   }
   if ((wallConnectionBitset & 0b0010) !== 0) {
      numConnections++;
   }
   if ((wallConnectionBitset & 0b0100) !== 0) {
      numConnections++;
   }
   if ((wallConnectionBitset & 0b1000) !== 0) {
      numConnections++;
   }
   return numConnections;
}

// @Location
export function createEntitiesByEntityType(): EntitiesByEntityType {
   const record: Partial<EntitiesByEntityType> = {};
   // @Memory
   for (let entityType: EntityType = 0; entityType < NUM_ENTITY_TYPES; entityType++) {
      record[entityType] = [];
   }
   // @Hack
   record[EntityType.blueprintEntity as StructureType] = [];
   return record as EntitiesByEntityType;
}

export function createVirtualStructuresByEntityType(): VirtualStructuresByEntityType {
   const record: Partial<VirtualStructuresByEntityType> = {};
   for (const entityType of STRUCTURE_TYPES) {
      record[entityType] = [];
   }
   // @Hack
   record[EntityType.blueprintEntity as StructureType] = [];
   return record as VirtualStructuresByEntityType;
}

export default class TribeBuildingLayer {
   public readonly layer: Layer;
   public readonly tribe: Tribe;
   
   public safetyRecord: Record<SafetyNode, number> = {};
   public occupiedSafetyNodes = new Set<SafetyNode>();
   public safetyNodes = new Set<SafetyNode>();

   public occupiedNodeToVirtualStructureIDRecord: Record<SafetyNode, Array<number>> = {};

   public nodeToRoomRecord: Record<SafetyNode, TribeRoom> = {};

   public virtualStructures = new Array<VirtualStructure>();
   public virtualStructureRecord: Record<number, VirtualStructure> = {};
   public virtualStructuresByEntityType = createVirtualStructuresByEntityType();

   public rooms = new Array<TribeRoom>();
   
   constructor(layer: Layer, tribe: Tribe) {
      this.layer = layer;
      this.tribe = tribe;
   }

   public addVirtualBuilding(virtualStructure: VirtualStructure): void {
      // Add to building layer
      this.virtualStructures.push(virtualStructure);
      this.virtualStructureRecord[virtualStructure.id] = virtualStructure;
      this.virtualStructuresByEntityType[virtualStructure.entityType]!.push(virtualStructure);

      // Add to tribe
      this.tribe.virtualStructures.push(virtualStructure);
      this.tribe.virtualStructureRecord[virtualStructure.id] = virtualStructure;
      this.tribe.virtualStructuresByEntityType[virtualStructure.entityType]!.push(virtualStructure);
   }

   public removeVirtualBuilding(virtualStructure: VirtualStructure): void {
      // Remove from building layer
      
      delete this.virtualStructureRecord[virtualStructure.id];
      
      let idx = this.virtualStructures.indexOf(virtualStructure);
      if (idx !== -1) {
         this.virtualStructures.splice(idx, 1);
      } else {
         throw new Error();
      }

      let buildingsOfType = this.virtualStructuresByEntityType[virtualStructure.entityType];
      idx = buildingsOfType.indexOf(virtualStructure);
      if (idx !== -1) {
         buildingsOfType.splice(idx, 1);
      } else {
         throw new Error();
      }

      // Remove from tribe
      
      delete this.tribe.virtualStructureRecord[virtualStructure.id];
      
      idx = this.tribe.virtualStructures.indexOf(virtualStructure);
      if (idx !== -1) {
         this.tribe.virtualStructures.splice(idx, 1);
      } else {
         throw new Error();
      }

      buildingsOfType = this.tribe.virtualStructuresByEntityType[virtualStructure.entityType];
      idx = buildingsOfType.indexOf(virtualStructure);
      if (idx !== -1) {
         buildingsOfType.splice(idx, 1);
      } else {
         throw new Error();
      }

      // @Bug: I don't think occupiedNodeToVirtualBuildingIDRecord is updated???
      // Can cause a crash in wallSideIsConnected
      // We should update it here, as it is used for more than calculating optimal building placements - new virtual buildings can connect to them
   }
}