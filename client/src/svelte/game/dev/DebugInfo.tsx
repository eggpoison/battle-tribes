import { EntityDebugData } from "battletribes-shared/client-server-types";
import { getTileIndexIncludingEdges, roundNum } from "battletribes-shared/utils";
import { TileType, TileTypeString } from "battletribes-shared/tiles";
import { Settings } from "battletribes-shared/settings";
import { useEffect, useReducer, useRef, useState } from "react";
import { Tile } from "../../../game/Tile";
import CLIENT_ENTITY_INFO_RECORD from "../../../game/client-entity-info";
import Layer from "../../../game/Layer";
import { entityExists, getCurrentLayer, getEntityType } from "../../../game/world";
import { RENDER_CHUNK_SIZE } from "../../../game/rendering/render-chunks";
import { Entity, EntityTypeString } from "../../../../../shared/src/entities";
import { TransformComponentArray } from "../../../game/entity-components/server-components/TransformComponent";
import { HealthComponentArray } from "../../../game/entity-components/server-components/HealthComponent";
import { InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
import InventoryContainer from "../inventories/InventoryContainer";
import { InventoryNameString } from "../../../../../shared/src/items/items";
import { StructureComponentArray } from "../../../game/entity-components/server-components/StructureComponent";
import { getTileLocalBiome } from "../../../game/local-biomes";
import { getHitboxVelocity } from "../../../game/hitboxes";
import { SnobeComponentArray } from "../../../game/entity-components/server-components/SnobeComponent";
import { cursorWorldPos } from "../../../game/mouse-input-input";

export let updateDebugInfoTile: (tile: Tile | null) => void = () => {};

export let updateDebugInfoEntity: (entity: Entity | null) => void = () => {};

export let setDebugInfoDebugData: (debugData: EntityDebugData | null) => void = () => {};

export let refreshDebugInfo: () => void = () => {};

interface TileDebugInfoProps {
   readonly layer: Layer;
   readonly tile: Tile;
}
const TileDebugInfo = ({ layer, tile }: TileDebugInfoProps) => {
   const chunkX = Math.floor(tile.x / Settings.CHUNK_SIZE);
   const chunkY = Math.floor(tile.y / Settings.CHUNK_SIZE);

   const renderChunkX = Math.floor(chunkX * Settings.CHUNK_SIZE / RENDER_CHUNK_SIZE);
   const renderChunkY = Math.floor(chunkY * Settings.CHUNK_SIZE / RENDER_CHUNK_SIZE);

   const tileIndex = getTileIndexIncludingEdges(tile.x, tile.y);
   const localBiome = getTileLocalBiome(tileIndex);
   
   return <>
      <div className="title"><span className="highlight">{TileTypeString[tile.type]}</span> tile</div>
      
      <p>x: <span className="highlight">{tile.x}</span>, y: <span className="highlight">{tile.y}</span></p>

      <p>Chunk: <span className="highlight">{chunkX}-{chunkY}</span></p>
      <p>Render chunk: <span className="highlight">{renderChunkX}-{renderChunkY}</span></p>

      <p>Biome: <span className="highlight">{tile.biome}</span></p>

      {tile.type === TileType.water ? <>
         <p>Flow direction: <span className="highlight">{layer.getRiverFlowDirection(tile.x, tile.y)}</span></p>
      </> : undefined}

      {tile.type === TileType.grass ? <>
         <p>Temperature: <span className="highlight">{layer.grassInfo[tile.x][tile.y].temperature}</span></p>
         <p>Humidity: <span className="highlight">{layer.grassInfo[tile.x][tile.y].humidity}</span></p>
      </> : undefined}

      {localBiome !== null ? (
         <ul>
            {[...localBiome.entityCensus].map(([entityType, entityCensusInfo], i) => {
               return <li key={i}>{EntityTypeString[entityType]}: {entityCensusInfo.count} (density: {entityCensusInfo.density.toFixed(3)}/{entityCensusInfo.maxDensity.toFixed(3)})</li>
            })}
         </ul>
      ) : null}

      <br />
   </>;
}

interface EntityDebugInfoProps {
   readonly entity: Entity;
   readonly debugData: EntityDebugData | null;
}
const EntityDebugInfo = ({ entity, debugData }: EntityDebugInfoProps) => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   if (transformComponent === null) {
      return;
   }

   const hitbox = transformComponent.hitboxes[0];

   const displayX = roundNum(hitbox.box.position.x, 0);
   const displayY = roundNum(hitbox.box.position.y, 0);

   const velocity = getHitboxVelocity(hitbox);
   let displayVelocityMagnitude = roundNum(velocity.magnitude(), 0);

   const chunks = Array.from(transformComponent.chunks).map(chunk => `${chunk.x}-${chunk.y}`);
   const chunkDisplayText = chunks.reduce((previousValue, chunk, idx) => {
      const newItems = previousValue.slice();
      newItems.push(
         <span key={idx} className="highlight">{chunk}</span>
      );

      if (idx < chunks.length - 1) {
         newItems.push(
            ", "
         );
      }

      return newItems;
   }, [] as Array<JSX.Element | string>);

   const healthComponent = HealthComponentArray.getComponent(entity);
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   const structureComponent = StructureComponentArray.getComponent(entity);
   const snobeComponent = SnobeComponentArray.getComponent(entity);

   return <>
      <div className="title">{CLIENT_ENTITY_INFO_RECORD[getEntityType(entity)].name}<span className="id">#{entity}</span></div>
      
      <p>x: <span className="highlight">{displayX}</span>, y: <span className="highlight">{displayY}</span></p>

      { typeof displayVelocityMagnitude !== "undefined" ? (
         <p>Velocity: <span className="highlight">{displayVelocityMagnitude}</span></p>
      ) : null }
      
      <p>Angle: <span className="highlight">{hitbox.box.angle.toFixed(2)}</span></p>
      <p>rAngle: <span className="highlight">{hitbox.box.relativeAngle.toFixed(2)}</span></p>
      <p>Angular acceleration: <span className="highlight">{hitbox.angularAcceleration.toFixed(2)}</span></p>

      <p>Chunks: {chunkDisplayText}</p>

      <p>Bounds: {transformComponent.boundingAreaMinX.toFixed(0)}, {transformComponent.boundingAreaMaxX.toFixed(0)}, {transformComponent.boundingAreaMinY.toFixed(0)}, {transformComponent.boundingAreaMaxY.toFixed(0)}</p>

      {healthComponent !== null ? (() => {
         return <>
            <p>Health: <span className="highlight">{healthComponent.health}/{healthComponent.maxHealth}</span></p>
         </>;
      })() : undefined}

      {inventoryComponent !== null ? (() => {
         return <>
            {inventoryComponent.inventories.map((inventory, i) => {
               return <div key={i}>
                  <p>{InventoryNameString[inventory.name]}</p>
                  <InventoryContainer inventory={inventory} />
                  <br/>
               </div>
            })}
         </>;
      })() : undefined}

      {structureComponent !== null ? (() => {
         return <>
            <p>Connected to:</p>
            <ul>
               {structureComponent.connections.map((connection, i) => {
                  return <li key={i}>{connection.entity}</li>
               })}
            </ul>
         </>;
      })() : undefined}

      {snobeComponent !== null ? (() => {
         return <>
            <p>Is digging:{snobeComponent.isDigging ? "true" : "false"}</p>
            <p>Digging progress:{snobeComponent.diggingProgress.toFixed(2)}</p>
         </>;
      })() : undefined}

      {debugData !== null ? debugData.debugEntries.map((str, i) => {
         return <p key={i}>{str}</p>;
      }) : undefined}

      <br />
   </>;
}

const DebugInfo = () => {
   const [tile, setTile] = useState<Tile | null>(null);
   const [entity, setEntity] = useState<Entity | null>(null);
   const debugData = useRef<EntityDebugData | null>(null);
   const [, forceUpdate] = useReducer(x => x + 1, 0);

   const layer = getCurrentLayer();

   useEffect(() => {
      updateDebugInfoTile = (tile: Tile | null): void => {
         setTile(tile);
      }
      
      updateDebugInfoEntity = (entity: Entity | null): void => {
         setEntity(entity);
      }

      refreshDebugInfo = (): void => {
         forceUpdate();
      }

      setDebugInfoDebugData = (newDebugData: EntityDebugData | null): void => {
         debugData.current = newDebugData;
      }
   }, []);

   return <div id="debug-info">
      <p>Looking at pos <span className="highlight">{cursorWorldPos.x.toFixed(0)}</span> <span className="highlight">{cursorWorldPos.y.toFixed(0)}</span></p>
      
      {tile !== null ? <TileDebugInfo layer={layer} tile={tile} /> : undefined}
      {entity !== null && entityExists(entity) ? <EntityDebugInfo entity={entity} debugData={debugData.current} /> : undefined}
   </div>;
}

export default DebugInfo;