import Tribe from "../Tribe.js";
import WebSocket from "ws";
import Layer from "../Layer.js";
import { Hitbox } from "../hitboxes.js";
import { HealData, ResearchOrbCompleteData, GameDataPacketOptions } from "../../../shared/dist/client-server-types.js";
import { Entity } from "../../../shared/dist/entities.js";
import { AttackEffectiveness } from "../../../shared/dist/entity-damage-types.js";
import { EntityTickEvent } from "../../../shared/dist/entity-events.js";
import { Settings } from "../../../shared/dist/settings.js";
import { Point } from "../../../shared/dist/utils.js";
import { getRenderChunkIndex } from "../../../shared/dist/render-chunks.js";

export interface HitData {
   readonly hitEntity: Entity;
   readonly hitHitbox: Hitbox;
   readonly hitPosition: Readonly<Point>;
   readonly attackEffectiveness: AttackEffectiveness;
   readonly damage: number;
   readonly shouldShowDamageNumber: boolean;
   readonly flags: number;
}

class PlayerClient {
   public readonly username: string;
   public readonly socket: WebSocket;
   public readonly tribe: Tribe;
   public readonly isDev: boolean;
   
   /** The player's entity */
   public instance: Entity;
   /** The entity currently being viewed by the player. Typically the player instance. */
   public cameraSubject: Entity;
   // Initially true, as packets need to be sent immediately after the initialisation packet to be kept up-to-date.
   public isActive = true;
   
   public isSpectating: boolean;
   
   // When the player is dead, we need to remember where their final position is so they can receive updates while dead
   public lastViewedPositionX: number;
   public lastViewedPositionY: number;
   /** The last layer that the player was viewing. */
   public lastLayer: Layer;

   public readonly deviceAspectRatio: number;

   public minVisibleX = 0;
   public maxVisibleX = 0;
   public minVisibleY = 0;
   public maxVisibleY = 0;

   public minVisibleChunkX = 0;
   public maxVisibleChunkX = 0;
   public minVisibleChunkY = 0;
   public maxVisibleChunkY = 0;

   /** All hits that have occured to any entity visible to the player */
   public visibleHits: HitData[] = [];
   /** All knockbacks given to the player */
   public playerKnockbacks: Point[] = [];
   /** All healing done to any entity visible to the player */
   public heals: HealData[] = [];
   /** All entity tick events visible to the player */
   public entityTickEvents: EntityTickEvent[] = [];
   
   public orbCompletes: ResearchOrbCompleteData[] = [];
   public hasPickedUpItem = false;
   public gameDataOptions = 0;

   public visibleEntities = new Set<Entity>();
   public visibleDirtiedEntities: Entity[] = [];
   public visibleRemovedEntities: Entity[] = [];
   public visibleDestroyedEntities: number[] = [];

   public viewedSpawnDistribution = -1;

   public readonly nearbyRenderChunks: number[];

   constructor(socket: WebSocket, tribe: Tribe, layer: Layer, deviceAspectRatio: number, playerPosition: Point, instance: Entity, username: string, isSpectating: boolean, isDev: boolean) {
      this.socket = socket;
      this.tribe = tribe;
      this.lastLayer = layer;
      this.lastViewedPositionX = playerPosition.x;
      this.lastViewedPositionY = playerPosition.y;
      this.deviceAspectRatio = deviceAspectRatio;
      this.instance = instance;
      this.cameraSubject = instance;
      this.isSpectating = isSpectating;
      this.username = username;
      this.isDev = isDev;

      this.updateVisibleChunkBounds();
      this.nearbyRenderChunks = this.calculateNearbyRenderChunks();
   }

   private updateVisibleChunkBounds(): void {
      const viewWidth = Settings.MAX_VIEW_HEIGHT * this.deviceAspectRatio;
      const viewHeight = Settings.MAX_VIEW_HEIGHT;
      
      this.minVisibleX = this.lastViewedPositionX - viewWidth * 0.5 - Settings.PLAYER_VIEW_PADDING;
      this.maxVisibleX = this.lastViewedPositionX + viewWidth * 0.5 + Settings.PLAYER_VIEW_PADDING;
      this.minVisibleY = this.lastViewedPositionY - viewHeight * 0.5 - Settings.PLAYER_VIEW_PADDING;
      this.maxVisibleY = this.lastViewedPositionY + viewHeight * 0.5 + Settings.PLAYER_VIEW_PADDING;
      
      this.minVisibleChunkX = Math.max(Math.min(Math.floor(this.minVisibleX / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
      this.maxVisibleChunkX = Math.max(Math.min(Math.floor(this.maxVisibleX / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
      this.minVisibleChunkY = Math.max(Math.min(Math.floor(this.minVisibleY / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
      this.maxVisibleChunkY = Math.max(Math.min(Math.floor(this.maxVisibleY / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1), 0);
   }

   public updatePosition(x: number, y: number): void {
      this.lastViewedPositionX = x;
      this.lastViewedPositionY = y;
      this.updateVisibleChunkBounds();
   }

   public hasPacketOption(packetOption: GameDataPacketOptions): boolean {
      return (this.gameDataOptions & packetOption) !== 0;
   }
   
   public calculateNearbyRenderChunks(): number[] {
      // @HACK based on the client's definition of a render chunk...
      const minRenderChunkX = Math.floor(this.minVisibleChunkX / 2);
      const maxRenderChunkX = Math.floor(this.maxVisibleChunkX / 2);
      const minRenderChunkY = Math.floor(this.minVisibleChunkY / 2);
      const maxRenderChunkY = Math.floor(this.maxVisibleChunkY / 2);
      
      const chunks: number[] = [];
      for (let renderChunkY = minRenderChunkY; renderChunkY <= maxRenderChunkY; renderChunkY++) {
         for (let renderChunkX = minRenderChunkX; renderChunkX <= maxRenderChunkX; renderChunkX++) {
            const chunkIdx = getRenderChunkIndex(renderChunkX, renderChunkY);
            chunks.push(chunkIdx);
         }
      }
      return chunks;
   }
}

export default PlayerClient;