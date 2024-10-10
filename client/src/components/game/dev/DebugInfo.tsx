import { ServerComponentType } from "battletribes-shared/components";
import { EntityDebugData } from "battletribes-shared/client-server-types";
import { roundNum } from "battletribes-shared/utils";
import { TileType, TileTypeString } from "battletribes-shared/tiles";
import { Settings } from "battletribes-shared/settings";
import { useEffect, useReducer, useRef, useState } from "react";
import Entity from "../../../Entity";
import { Tile } from "../../../Tile";
import CLIENT_ENTITY_INFO_RECORD from "../../../client-entity-info";
import Layer from "../../../Layer";
import { getEntityLayer, getEntityType } from "../../../world";
import Player from "../../../entities/Player";
import { RENDER_CHUNK_SIZE } from "../../../rendering/render-chunks";

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

      <br />
   </>;
}

interface EntityDebugInfoProps {
   readonly entity: Entity;
   readonly debugData: EntityDebugData | null;
}
const EntityDebugInfo = ({ entity, debugData }: EntityDebugInfoProps) => {
   const transformComponent = entity.getServerComponent(ServerComponentType.transform);

   const displayX = roundNum(transformComponent.position.x, 0);
   const displayY = roundNum(transformComponent.position.y, 0);

   let displayVelocityMagnitude: number | undefined;
   let displayAccelerationMagnitude: number | undefined;
   if (entity.hasServerComponent(ServerComponentType.physics)) {
      const physicsComponent = entity.getServerComponent(ServerComponentType.physics);

      displayVelocityMagnitude = roundNum(physicsComponent.selfVelocity.length(), 0);
      displayAccelerationMagnitude = roundNum(physicsComponent.acceleration.length(), 0);
   }

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

   return <>
      <div className="title">{CLIENT_ENTITY_INFO_RECORD[getEntityType(entity.id)].name}<span className="id">#{entity.id}</span></div>
      
      <p>x: <span className="highlight">{displayX}</span>, y: <span className="highlight">{displayY}</span></p>

      { typeof displayVelocityMagnitude !== "undefined" ? (
         <p>Velocity: <span className="highlight">{displayVelocityMagnitude}</span></p>
      ) : null }
      { typeof displayAccelerationMagnitude !== "undefined" ? (
         <p>Acceleration: <span className="highlight">{displayAccelerationMagnitude}</span></p>
      ) : null }
      
      <p>Rotation: <span className="highlight">{transformComponent.rotation.toFixed(2)}</span></p>

      <p>Chunks: {chunkDisplayText}</p>

      {entity.hasServerComponent(ServerComponentType.health) ? (() => {
         const healthComponent = entity.getServerComponent(ServerComponentType.health);

         return <>
            <p>Health: <span className="highlight">{healthComponent.health}/{healthComponent.maxHealth}</span></p>
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

   // @Incomplete @Bug: will crash when the player dies
   const layer = getEntityLayer(Player.instance!.id);

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
      {tile !== null ? <TileDebugInfo layer={layer} tile={tile} /> : undefined}
      {entity !== null ? <EntityDebugInfo entity={entity} debugData={debugData.current} /> : undefined}
   </div>;
}

export default DebugInfo;