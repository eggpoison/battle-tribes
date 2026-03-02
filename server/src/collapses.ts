import { Settings } from "../../shared/src/settings";
import { getSubtileX, getSubtileY, subtileIsInWorld, getSubtileIndex } from "../../shared/src/subtiles";
import { SubtileType } from "../../shared/src/tiles";
import { customTickIntervalHasPassed, distance } from "../../shared/src/utils";
import { TransformComponent } from "./components/TransformComponent";
import Layer from "./Layer";
import { layers } from "./layers";
import PlayerClient, { PlayerClientVars } from "./server/PlayerClient";
import { getGameTicks } from "./world";

const enum Vars {
   MAX_SUPPORT = 100,
   // @Temporary
   /** The amount that support is reduced each time the tile moves in. */
   SUPPORT_REDUCTION = 0,
   // SUPPORT_REDUCTION = 10,
   COLLAPSE_THRESHOLD = 50,
   COLLAPSE_WARNING_TIME_TICKS = 5 * Settings.TICK_RATE
}

const enum ExpansionType {
   /** For marking which tiles to collapse */
   expandMarkedCollapse,
   /** For actually collapsing them */
   expandCollapse
}

export interface MinedSubtileInfo {
   readonly subtileType: SubtileType;
   support: number;
}

interface CollapseInfo {
   readonly layer: Layer;
   age: number;
   readonly originSubtileIndex: number;
   readonly collapsingSubtiles: Array<number>;
   // Used to expand the collapse
   readonly collapsedSubtiles: Array<number>;
}

const ongoingCollapses = new Array<CollapseInfo>();

/** Contains all tiles currently involved in collapsing */
const collapsingSubtileSet = new Set<number>();

export function subtileIsCollapsing(subtileIndex: number): boolean {
   return collapsingSubtileSet.has(subtileIndex);
}

export function getSubtileSupport(layer: Layer, subtileIndex: number): number {
   const subtileInfo = layer.minedSubtileInfoMap.get(subtileIndex);
   if (typeof subtileInfo === "undefined") {
      throw new Error();
   }
   return subtileInfo.support;
}

const getNeighbourSupport = (layer: Layer, subtileIndex: number): number => {
   // - If the subtile is a wall, skip it by 
   // - If the subtile could have a wall, then use that tile's safety.
   // - Otherwise, set it to max safety
   if (layer.subtileIsWall(subtileIndex)) {
      // Returning 0 effectively skips it
      return 0;
   } else if (layer.subtileCanHaveWall(subtileIndex)) {
      // @Cleanup: '!'
      return layer.minedSubtileInfoMap.get(subtileIndex)!.support - Vars.SUPPORT_REDUCTION;
   } else {
      return Vars.MAX_SUPPORT - Vars.SUPPORT_REDUCTION;
   }
}

export function registerMinedSubtile(layer: Layer, subtileIndex: number, subtileType: SubtileType): void {
   const subtileX = getSubtileX(subtileIndex);
   const subtileY = getSubtileY(subtileIndex);
   
   let support = 0;

   // Right
   if (subtileIsInWorld(subtileX + 1, subtileY)) {
      const rightSubtileIndex = getSubtileIndex(subtileX + 1, subtileY);
      support = Math.max(support, getNeighbourSupport(layer, rightSubtileIndex));
   }

   // Left
   if (subtileIsInWorld(subtileX - 1, subtileY)) {
      const leftSubtileIndex = getSubtileIndex(subtileX - 1, subtileY);
      support = Math.max(support, getNeighbourSupport(layer, leftSubtileIndex));
   }

   // Top
   if (subtileIsInWorld(subtileX, subtileY + 1)) {
      const topSubtileIndex = getSubtileIndex(subtileX, subtileY + 1);
      support = Math.max(support, getNeighbourSupport(layer, topSubtileIndex));
   }

   // Bottom
   if (subtileIsInWorld(subtileX, subtileY - 1)) {
      const bottomSubtileIndex = getSubtileIndex(subtileX, subtileY - 1);
      support = Math.max(support, getNeighbourSupport(layer, bottomSubtileIndex));
   }

   if (support < 0) {
      support = 0;
   }

   const minedSubtileInfo: MinedSubtileInfo = {
      subtileType: subtileType,
      support: support
   };
   layer.minedSubtileInfoMap.set(subtileIndex, minedSubtileInfo);
}

export function damageWallSubtitle(layer: Layer, subtileIndex: number, damage: number): number {
   let damageDealt: number;
   if (!layer.wallSubtileDamageTakenMap.has(subtileIndex)) {
      damageDealt = Math.min(damage, 3);
      layer.wallSubtileDamageTakenMap.set(subtileIndex, damageDealt);
   } else {
      // @Cleanup: '!'
      const previousDamageTaken = layer.wallSubtileDamageTakenMap.get(subtileIndex)!;
      damageDealt = Math.min(damage, 3 - previousDamageTaken);
      layer.wallSubtileDamageTakenMap.set(subtileIndex, previousDamageTaken + damageDealt);
   }

   // @Cleanup: '!'
   const damageTaken = layer.wallSubtileDamageTakenMap.get(subtileIndex)!;
   if (damageTaken >= 3) {
      const previousSubtileType = layer.wallSubtileTypes[subtileIndex];
      layer.wallSubtileTypes[subtileIndex] = SubtileType.none;
      registerMinedSubtile(layer, subtileIndex, previousSubtileType);
   }

   layer.wallSubtileUpdates.push({
      subtileIndex: subtileIndex,
      subtileType: layer.wallSubtileTypes[subtileIndex],
      damageTaken: damageTaken
   });

   return damageDealt;
}

const startCollapse = (layer: Layer, originSubtileIndex: number): void => {
   // First make sure that there are no collapses already ongoing which would be connected


   collapsingSubtileSet.add(originSubtileIndex);

   const collapseInfo: CollapseInfo = {
      layer: layer,
      age: 0,
      originSubtileIndex: originSubtileIndex,
      collapsingSubtiles: [originSubtileIndex],
      collapsedSubtiles: []
   };
   ongoingCollapses.push(collapseInfo);
}

const expandCollapseToSubtile = (collapse: CollapseInfo, subtileIndex: number, expansionType: ExpansionType): boolean => {
   // Expand to subtiles which aren't already collapsing and which are are mined-out
   
   const expandingSubtiles = expansionType === ExpansionType.expandMarkedCollapse ? collapse.collapsingSubtiles : collapse.collapsedSubtiles;
   
   // @Speed!
   // If the subtile is already collapsing, don't expand to it
   for (const currentSubtileIndex of expandingSubtiles) {
      if (currentSubtileIndex === subtileIndex) {
         return false;
      }
   }

   // Make sure it is mined out
   if (collapse.layer.subtileIsMined(subtileIndex)) {
      if (expandingSubtiles.includes(subtileIndex)) {
         console.assert(false);
      }
      
      expandingSubtiles.push(subtileIndex);

      switch (expansionType) {
         case ExpansionType.expandMarkedCollapse: {
            collapsingSubtileSet.add(subtileIndex);
            break;
         }
         case ExpansionType.expandCollapse: {
            // Remove from the collapsing array
            const idx = collapse.collapsingSubtiles.indexOf(subtileIndex);
            if (idx !== -1) {
               collapse.collapsingSubtiles.splice(idx, 1);
            }

            const minedSubtileInfo = collapse.layer.minedSubtileInfoMap.get(subtileIndex);
            // @Hack: Shouldn't need!
            if (typeof minedSubtileInfo === "undefined") {
               break;
            }

            collapse.layer.restoreWallSubtile(subtileIndex, minedSubtileInfo.subtileType);
            collapsingSubtileSet.delete(subtileIndex);
         }
      }
            
      return true;
   }

   return false;
}

const doExpansionPass = (collapse: CollapseInfo, expansionProbability: number, expansionType: ExpansionType): void => {
   const expandingSubtiles = expansionType === ExpansionType.expandMarkedCollapse ? collapse.collapsingSubtiles : collapse.collapsedSubtiles;

   const length = expandingSubtiles.length;
   for (let i = 0; i < length; i++) {
      if (Math.random() > expansionProbability) {
         continue;
      }
      
      const subtileIndex = expandingSubtiles[i];

      const subtileX = getSubtileX(subtileIndex);
      const subtileY = getSubtileY(subtileIndex);

      const topSubtileIndex = getSubtileIndex(subtileX, subtileY + 1);
      expandCollapseToSubtile(collapse, topSubtileIndex, expansionType);
      
      const bottomSubtileIndex = getSubtileIndex(subtileX, subtileY - 1);
      expandCollapseToSubtile(collapse, bottomSubtileIndex, expansionType);

      const rightSubtileIndex = getSubtileIndex(subtileX + 1, subtileY);
      expandCollapseToSubtile(collapse, rightSubtileIndex, expansionType);

      const leftSubtileIndex = getSubtileIndex(subtileX - 1, subtileY);
      expandCollapseToSubtile(collapse, leftSubtileIndex, expansionType);
   }
}

export function runCollapses(): void {
   // Update ongoing collapses
   for (let i = 0; i < ongoingCollapses.length; i++) {
      const collapse = ongoingCollapses[i];
      collapse.age++;

      if (customTickIntervalHasPassed(collapse.age, 0.5)) {
         if (collapse.age <= Vars.COLLAPSE_WARNING_TIME_TICKS) {
            // Warning time
            doExpansionPass(collapse, 1, ExpansionType.expandMarkedCollapse);
            doExpansionPass(collapse, 0.5, ExpansionType.expandMarkedCollapse);
            doExpansionPass(collapse, 0.5, ExpansionType.expandMarkedCollapse);
         } else {
            // Collapse time
            
            const lengthBefore = collapse.collapsedSubtiles.length;
            
            // Special case if only just starting the collapse
            if (collapse.collapsedSubtiles.length === 0) {
               // Collapse origin and around origin
               expandCollapseToSubtile(collapse, collapse.originSubtileIndex, ExpansionType.expandCollapse);
            } else {
               // Do full pass
               doExpansionPass(collapse, 1, ExpansionType.expandCollapse);
            }
            doExpansionPass(collapse, 0.5, ExpansionType.expandCollapse);
            doExpansionPass(collapse, 0.5, ExpansionType.expandCollapse);

            // If the collapse is finished (there are no more subtiles to expand), cleanup the object
            const lengthAfter = collapse.collapsedSubtiles.length;
            if (lengthBefore === lengthAfter) {
               ongoingCollapses.splice(i, 1);
               i--;
            }
         }
      }
   }
   
   // Once a second, check for new collapses
   // @Temporary
   if (getGameTicks() % Settings.TICK_RATE === 0 && 1 + 1 === 1) {
      for (const layer of layers) {
         for (const pair of layer.minedSubtileInfoMap) {
            const minedSubtileInfo = pair[1];
            const support = minedSubtileInfo.support;
            
            if (support > Vars.COLLAPSE_THRESHOLD) {
               continue;
            }
   
            const progressToMaxCollapse = 1 - support / Vars.COLLAPSE_THRESHOLD;
            const collapseChancePerSecond = (0.25 + progressToMaxCollapse) / 100;
   
            if (Math.random() < collapseChancePerSecond * Settings.DT_S) {
               const subtile = pair[0];
               startCollapse(layer, subtile);
            }
         }
      }
   }
}

export function getPlayerNearbyCollapses(playerClient: PlayerClient): ReadonlyArray<[CollapseInfo, number]> {
   const nearbyCollapses = new Array<[CollapseInfo, number]>();
   
   // @Speed
   for (const collapse of ongoingCollapses) {
      let minDist = Number.MAX_SAFE_INTEGER;
      let closestSubtileIndex = 0;
      for (const subtileIndex of collapse.collapsingSubtiles) {
         const subtileX = getSubtileX(subtileIndex);
         const subtileY = getSubtileY(subtileIndex);

         const x = subtileX * Settings.SUBTILE_SIZE;
         const y = subtileY * Settings.SUBTILE_SIZE;

         const dist = distance(x, y, playerClient.lastViewedPositionX, playerClient.lastViewedPositionY);
         if (dist < minDist) {
            minDist = dist;
            closestSubtileIndex = subtileIndex;
         }
      }

      // @Hack: should only send if any of the subtiles are within hearing range of the player
      if (minDist < 2000) {
         nearbyCollapses.push([collapse, closestSubtileIndex]);
      }
   }

   return nearbyCollapses;
}

export function registerEntitySupports(transformComponent: TransformComponent): void {
   // @Incomplete

   // for (const hitbox of transformComponent.children) {
      
   // }
}

export function deregisterEntitySupports(transformComponent: TransformComponent): void {
   // @Incomplete
}

export function getVisibleSubtileSupports(playerClient: PlayerClient): ReadonlyArray<number> {
   // @Copynpaste
   const minVisibleX = playerClient.lastViewedPositionX - playerClient.screenWidth * 0.5 - PlayerClientVars.VIEW_PADDING;
   const maxVisibleX = playerClient.lastViewedPositionX + playerClient.screenWidth * 0.5 + PlayerClientVars.VIEW_PADDING;
   const minVisibleY = playerClient.lastViewedPositionY - playerClient.screenHeight * 0.5 - PlayerClientVars.VIEW_PADDING;
   const maxVisibleY = playerClient.lastViewedPositionY + playerClient.screenHeight * 0.5 + PlayerClientVars.VIEW_PADDING;

   const supports = new Array<number>();
   
   const minSubtileX = (minVisibleX / Settings.TILE_SIZE) << 2;
   const maxSubtileX = (maxVisibleX / Settings.TILE_SIZE) << 2;
   const minSubtileY = (minVisibleY / Settings.TILE_SIZE) << 2;
   const maxSubtileY = (maxVisibleY / Settings.TILE_SIZE) << 2;
   for (let subtileX = minSubtileX; subtileX <= maxSubtileX; subtileX++) {
      for (let subtileY = minSubtileY; subtileY <= maxSubtileY; subtileY++) {
         const subtileIndex = getSubtileIndex(subtileX, subtileY);
         if (playerClient.lastLayer.subtileIsMined(subtileIndex)) {
            supports.push(subtileIndex);
         }
      }
   }

   return supports;
}