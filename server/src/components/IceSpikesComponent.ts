import { randInt } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { ComponentConfig } from "../components";
import { Settings } from "battletribes-shared/settings";
import { Biome } from "battletribes-shared/tiles";
import Board from "../Board";
import { createIceSpikesConfig } from "../entities/resources/ice-spikes";
import { createEntityFromConfig } from "../Entity";
import { TransformComponentArray } from "./TransformComponent";

const enum Vars {
   TICKS_TO_GROW = 1/5 * Settings.TPS,
   GROWTH_TICK_CHANCE = 0.5,
   GROWTH_OFFSET = 60
}

export interface IceSpikesComponentParams {
   /** Root ice spike. If null, defaults to the ice spike itself. */
   rootIceSpike: EntityID | null;
}

export class IceSpikesComponent {
   public readonly maxChildren = randInt(0, 3);
   public numChildrenIceSpikes = 0;
   public iceSpikeGrowProgressTicks = 0;
   public readonly rootIceSpike: EntityID;

   constructor(params: IceSpikesComponentParams) {
      if (params.rootIceSpike === null) {
         console.warn("Root ice spike was null! Defaulting to 0");
         this.rootIceSpike = 0;
      } else {
         this.rootIceSpike = params.rootIceSpike;
      }
   }
}

export const IceSpikesComponentArray = new ComponentArray<IceSpikesComponent>(ServerComponentType.iceSpikes, true, {
   onInitialise: onInitialise,
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onInitialise(config: ComponentConfig<ServerComponentType.iceSpikes>, entity: EntityID): void {
   if (config[ServerComponentType.iceSpikes].rootIceSpike === null) {
      config[ServerComponentType.iceSpikes].rootIceSpike = entity;
   }
}

const canGrow = (iceSpikesComponent: IceSpikesComponent): boolean => {
   if (!Board.hasEntity(iceSpikesComponent.rootIceSpike)) {
      return false;
   }
   
   const rootIceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikesComponent.rootIceSpike);
   return rootIceSpikesComponent.numChildrenIceSpikes < rootIceSpikesComponent.maxChildren;
}

const grow = (iceSpikes: EntityID): void => {
   // @Speed: Garbage collection

   const transformComponent = TransformComponentArray.getComponent(iceSpikes);

   // Calculate the spawn position for the new ice spikes
   const position = transformComponent.position.copy();
   const offsetDirection = 2 * Math.PI * Math.random();
   position.x += Vars.GROWTH_OFFSET * Math.sin(offsetDirection);
   position.y += Vars.GROWTH_OFFSET * Math.cos(offsetDirection);

   // Don't grow outside the board
   if (!Board.positionIsInBoard(position.x, position.y)) {
      return;
   }

   // Only grow into tundra
   const tileX = Math.floor(position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(position.y / Settings.TILE_SIZE);
   if (Board.getTileBiome(tileX, tileY) !== Biome.tundra) {
      return;
   }

   const minDistanceToEntity = Board.distanceToClosestEntity(position);
   if (minDistanceToEntity >= 40) {
      const iceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikes);

      const config = createIceSpikesConfig();
      config[ServerComponentType.transform].position.x = position.x;
      config[ServerComponentType.transform].position.y = position.y;
      config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      config[ServerComponentType.iceSpikes].rootIceSpike = iceSpikesComponent.rootIceSpike;
      createEntityFromConfig(config);
      
      const rootIceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikesComponent.rootIceSpike);
      rootIceSpikesComponent.numChildrenIceSpikes++;
   }
}

function onTick(iceSpikesComponent: IceSpikesComponent, iceSpikes: EntityID): void {
   if (canGrow(iceSpikesComponent) && Math.random() < Vars.GROWTH_TICK_CHANCE / Settings.TPS) {
      iceSpikesComponent.iceSpikeGrowProgressTicks++;
      if (iceSpikesComponent.iceSpikeGrowProgressTicks >= Vars.TICKS_TO_GROW) {
         grow(iceSpikes);
      }
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}

/** Forces an ice spike to immediately grow its maximum number of children */
const forceMaxGrowIceSpike = (iceSpikes: EntityID): void => {
   const rootIceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikes);
   
   const connectedIceSpikes = [iceSpikes];

   while (rootIceSpikesComponent.numChildrenIceSpikes < rootIceSpikesComponent.maxChildren) {
      const growingIceSpikes = connectedIceSpikes[Math.floor(connectedIceSpikes.length * Math.random())];
      grow(growingIceSpikes);
   }
}

export function forceMaxGrowAllIceSpikes(): void {
   for (let i = 0; i < Board.entities.length; i++) {
      const entity = Board.entities[i];
      if (Board.getEntityType(entity) === EntityType.iceSpikes) {
         forceMaxGrowIceSpike(entity);
      }
   }
}