import { EntityTypeString } from "../../../../../../shared/src/entities";
import { RenderChunkVars } from "../../../../../../shared/src/render-chunks";
import { Settings } from "../../../../../../shared/src/settings";
import { getTileIndexIncludingEdges, TileType, TileTypeString } from "../../../../../../shared/src/tiles";
import Layer from "../../../../game/Layer";
import { getTileLocalBiome } from "../../../../game/local-biomes";
import { Tile } from "../../../../game/Tile";

let tileTypeNode: Text | null = null;
let xPosNode: Text | null = null;
let yPosNode: Text | null = null;
let biomeNode: Text | null = null;
let temperatureNode: Text | null = null;
let humidityNode: Text | null = null;
let chunkNode: Text | null = null;
let renderChunkNode: Text | null = null;

export function populateTileInspector(rootElem: HTMLElement, layer: Layer, tile: Tile, tileX: number, tileY: number): void {
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);

   const nameElem = document.createElement("div");
   nameElem.className = "title";
   const highlightElem = document.createElement("span");
   highlightElem.className = "highlight";
   highlightElem.textContent = TileTypeString[tile.type] + " tile";
   tileTypeNode = highlightElem.firstChild as Text;
   nameElem.appendChild(highlightElem);
   rootElem.appendChild(nameElem);

   const posElem = document.createElement("p");
   
   const xLabel = document.createTextNode("tileX: ");
   posElem.appendChild(xLabel);

   const xPosElem = document.createElement("span");
   xPosElem.className = "highlight";
   xPosElem.textContent = tileX as unknown as string;
   xPosNode = xPosElem.firstChild as Text;
   posElem.appendChild(xPosElem);
   
   const yLabel = document.createTextNode(" tileY: ");
   posElem.appendChild(yLabel);

   const yPosElem = document.createElement("span");
   yPosElem.className = "highlight";
   yPosElem.textContent = tileY as unknown as string;
   yPosNode = yPosElem.firstChild as Text;
   posElem.appendChild(yPosElem);

   rootElem.appendChild(posElem);

   const chunkElem = document.createElement("p");
   chunkElem.textContent = "Chunk: ";

   const chunkX = Math.floor(tileX / Settings.CHUNK_SIZE);
   const chunkY = Math.floor(tileY / Settings.CHUNK_SIZE);

   const chunkHighlightElem = document.createElement("span");
   chunkHighlightElem.className = "highlight";
   chunkHighlightElem.textContent = chunkX + "-" + chunkY;
   chunkNode = chunkHighlightElem.firstChild as Text;
   chunkElem.appendChild(chunkHighlightElem);
   rootElem.appendChild(chunkElem);

   const renderChunkElem = document.createElement("p");
   renderChunkElem.textContent = "Render chunk: ";

   const renderChunkX = Math.floor(chunkX * Settings.CHUNK_SIZE / RenderChunkVars.RENDER_CHUNK_SIZE);
   const renderChunkY = Math.floor(chunkY * Settings.CHUNK_SIZE / RenderChunkVars.RENDER_CHUNK_SIZE);

   const renderChunkHighlightElem = document.createElement("span");
   renderChunkHighlightElem.className = "highlight";
   renderChunkHighlightElem.textContent = renderChunkX + "-" + renderChunkY;
   renderChunkNode = renderChunkHighlightElem.firstChild as Text;
   renderChunkElem.appendChild(renderChunkHighlightElem);
   rootElem.appendChild(renderChunkElem);

   const biomeElem = document.createElement("p");
   biomeElem.textContent = "Biome: ";

   const biomeHighlightElem = document.createElement("span");
   biomeHighlightElem.className = "highlight";
   biomeHighlightElem.textContent = tile.biome as unknown as string;
   biomeNode = biomeHighlightElem.firstChild as Text;
   biomeElem.appendChild(biomeHighlightElem);
   rootElem.appendChild(biomeElem);

   // Flow direction
   if (tile.type === TileType.water) {
      const flowElem = document.createElement("p");
      flowElem.textContent = "Flow direction: ";

      const highlightElem = document.createElement("span");
      highlightElem.className = "highlight";
      highlightElem.textContent = layer.getRiverFlowDirection(tileIndex) as unknown as string;
      flowElem.appendChild(highlightElem);
      rootElem.appendChild(flowElem);
   // Grass environmental factors
   } else if (tile.type === TileType.grass) {
      const temperatureElem = document.createElement("p");
      temperatureElem.textContent = "Temperature: ";

      const temperatureHighlightElem = document.createElement("span");
      temperatureHighlightElem.className = "highlight";
      temperatureHighlightElem.textContent = layer.tileTemperatures.get(tileIndex)! as unknown as string;
      temperatureNode = temperatureHighlightElem.firstChild as Text;
      temperatureElem.appendChild(temperatureHighlightElem);
      rootElem.appendChild(temperatureElem);
      
      const humidityElem = document.createElement("p");
      humidityElem.textContent = "Humidity: ";

      const humidityHighlightElem = document.createElement("span");
      humidityHighlightElem.className = "highlight";
      humidityHighlightElem.textContent = layer.tileHumidities.get(tileIndex)! as unknown as string;
      humidityNode = humidityHighlightElem.firstChild as Text;
      humidityElem.appendChild(humidityHighlightElem);
      rootElem.appendChild(humidityElem);
   }
   
   // Local biome
   const localBiome = getTileLocalBiome(tileIndex);
   if (localBiome !== null) {
      const listElem = document.createElement("ul");

      for (const [entityType, entityCensusInfo] of localBiome.entityCensus) {
         const itemElem = document.createElement("li");
         itemElem.textContent = `${EntityTypeString[entityType]}: ${entityCensusInfo.count} (density: ${entityCensusInfo.density.toFixed(3)}/${entityCensusInfo.maxDensity.toFixed(3)})`;
         listElem.appendChild(itemElem);
      }
      
      rootElem.appendChild(listElem);
   }

   rootElem.appendChild(
      document.createElement("br")
   );
}

export function updateDebugInspectorTile(layer: Layer, tile: Tile, tileX: number, tileY: number, tileIndex: number): void {
   if (xPosNode !== null) {
      tileTypeNode!.data = TileTypeString[tile.type] + " tile";
      xPosNode.data = tileX as unknown as string;
      yPosNode!.data = tileY as unknown as string;
      biomeNode!.data = tile.biome as unknown as string;

      if (temperatureNode !== null) {
         temperatureNode.data = (layer.tileTemperatures.get(tileIndex) || "undefined") as string;
      }
      if (humidityNode !== null) {
         humidityNode.data = (layer.tileHumidities.get(tileIndex) || "undefined") as string;
      }

      const chunkX = Math.floor(tileX / Settings.CHUNK_SIZE);
      const chunkY = Math.floor(tileY / Settings.CHUNK_SIZE);
      chunkNode!.data = chunkX + "-" + chunkY;

      const renderChunkX = Math.floor(tileX / RenderChunkVars.RENDER_CHUNK_SIZE);
      const renderChunkY = Math.floor(tileY / RenderChunkVars.RENDER_CHUNK_SIZE);
      renderChunkNode!.data = renderChunkX + "-" + renderChunkY;
   }
}