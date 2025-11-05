<script lang="ts">
   import { EntityTypeString } from "webgl-test-shared/src/entities";
   import { Settings } from "webgl-test-shared/src/settings";
   import { TileTypeString, TileType } from "webgl-test-shared/src/tiles";
   import Layer, { getTileIndexIncludingEdges } from "../../../../game/Layer";
   import { getTileLocalBiome } from "../../../../game/local-biomes";
   import { RENDER_CHUNK_SIZE } from "../../../../game/rendering/render-chunks";
   import { Tile } from "../../../../game/Tile";

   interface Props {
      readonly layer: Layer;
      readonly tile: Tile;
   }

   let props: Props = $props();
   const layer = props.layer;
   const tile = props.tile;

   const chunkX = Math.floor(tile.x / Settings.CHUNK_SIZE);
   const chunkY = Math.floor(tile.y / Settings.CHUNK_SIZE);

   const renderChunkX = Math.floor(chunkX * Settings.CHUNK_SIZE / RENDER_CHUNK_SIZE);
   const renderChunkY = Math.floor(chunkY * Settings.CHUNK_SIZE / RENDER_CHUNK_SIZE);

   const tileIndex = getTileIndexIncludingEdges(tile.x, tile.y);
   const localBiome = getTileLocalBiome(tileIndex);
</script>

<div class="title"><span class="highlight">{TileTypeString[tile.type]}</span> tile</div>

<p>x: <span class="highlight">{tile.x}</span>, y: <span class="highlight">{tile.y}</span></p>

<p>Chunk: <span class="highlight">{chunkX}-{chunkY}</span></p>
<p>Render chunk: <span class="highlight">{renderChunkX}-{renderChunkY}</span></p>

<p>Biome: <span class="highlight">{tile.biome}</span></p>

{#if tile.type === TileType.water}
   <p>Flow direction: <span class="highlight">{layer.getRiverFlowDirection(tile.x, tile.y)}</span></p>
{/if}

{#if tile.type === TileType.grass}
   <p>Temperature: <span class="highlight">{layer.grassInfo[tile.x][tile.y].temperature}</span></p>
   <p>Humidity: <span class="highlight">{layer.grassInfo[tile.x][tile.y].humidity}</span></p>
{/if}

{#if localBiome !== null}
   <ul>
      {#each [...localBiome.entityCensus] as [entityType, entityCensusInfo]}
         <li>{EntityTypeString[entityType]}: {entityCensusInfo.count} (density: {entityCensusInfo.density.toFixed(3)}/{entityCensusInfo.maxDensity.toFixed(3)})</li>
      {/each}
   </ul>
{/if}

<br />