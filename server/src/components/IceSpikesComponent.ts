import { randInt } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Biome } from "battletribes-shared/tiles";
import { positionIsInWorld } from "../Layer";
import { createIceShardExplosion, createIceSpikesConfig } from "../entities/resources/ice-spikes";
import { createEntityFromConfig } from "../Entity";
import { TransformComponentArray } from "./TransformComponent";
import { ItemType } from "../../../shared/src/items/items";
import { createItemsOverEntity } from "../entity-shared";
import { entityExists, getEntityLayer } from "../world";
import { EntityConfig } from "../components";

const enum Vars {
   TICKS_TO_GROW = 1/5 * Settings.TPS,
   GROWTH_TICK_CHANCE = 0.5,
   GROWTH_OFFSET = 60
}

export class IceSpikesComponent {
   public readonly maxChildren = randInt(0, 3);
   public numChildrenIceSpikes = 0;
   public iceSpikeGrowProgressTicks = 0;
   public rootIceSpike: EntityID;

   constructor(rootIceSpikes: EntityID) {
      this.rootIceSpike = rootIceSpikes;
   }
}

export const IceSpikesComponentArray = new ComponentArray<IceSpikesComponent>(ServerComponentType.iceSpikes, true, {
   onInitialise: onInitialise,
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   onRemove: onRemove,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onInitialise(config: EntityConfig<ServerComponentType.iceSpikes>, entity: EntityID): void {
   if (config.components[ServerComponentType.iceSpikes].rootIceSpike === 0) {
      config.components[ServerComponentType.iceSpikes].rootIceSpike = entity;
   }
}

const canGrow = (iceSpikesComponent: IceSpikesComponent): boolean => {
   if (!entityExists(iceSpikesComponent.rootIceSpike)) {
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
   if (!positionIsInWorld(position.x, position.y)) {
      return;
   }

   // Only grow into tundra
   const tileX = Math.floor(position.x / Settings.TILE_SIZE);
   const tileY = Math.floor(position.y / Settings.TILE_SIZE);
   const layer = getEntityLayer(iceSpikes);
   if (layer.getTileXYBiome(tileX, tileY) !== Biome.tundra) {
      return;
   }

   const minDistanceToEntity = layer.getDistanceToClosestEntity(position);
   if (minDistanceToEntity >= 40) {
      const iceSpikesComponent = IceSpikesComponentArray.getComponent(iceSpikes);

      const config = createIceSpikesConfig(iceSpikesComponent.rootIceSpike);
      config.components[ServerComponentType.transform].position.x = position.x;
      config.components[ServerComponentType.transform].position.y = position.y;
      config.components[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      createEntityFromConfig(config, layer, 0);
      
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

function onRemove(iceSpikes: EntityID): void {
   if (Math.random() < 0.5) {
      createItemsOverEntity(iceSpikes, ItemType.frostcicle, 1, 40);
   }

   const transformComponent = TransformComponentArray.getComponent(iceSpikes);
   
   // Explode into a bunch of ice spikes
   const numProjectiles = randInt(3, 4);
   createIceShardExplosion(getEntityLayer(iceSpikes), transformComponent.position.x, transformComponent.position.y, numProjectiles);
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
   for (let i = 0; i < IceSpikesComponentArray.activeEntities.length; i++) {
      const entity = IceSpikesComponentArray.activeEntities[i];
      forceMaxGrowIceSpike(entity);
   }
}