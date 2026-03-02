import { PlayerKnockbackData, HealData, ResearchOrbCompleteData, GameDataPacketOptions } from "battletribes-shared/client-server-types";
import Tribe from "../Tribe";
import { EntityTickEvent } from "battletribes-shared/entity-events";
import { Entity } from "battletribes-shared/entities";
import WebSocket from "ws";
import { Settings } from "battletribes-shared/settings";
import { Point } from "battletribes-shared/utils";
import Layer from "../Layer";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Hitbox } from "../hitboxes";

export const enum PlayerClientVars {
   VIEW_PADDING = 128
}

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
   public isActive = false;
   
   public isSpectating: boolean;
   
   // When the player is dead, we need to remember where their final position is so they can receive updates while dead
   public lastViewedPositionX: number;
   public lastViewedPositionY: number;
   /** The last layer that the player was viewing. */
   public lastLayer: Layer;
   public screenWidth: number;
   public screenHeight: number;

   public minVisibleX = 0;
   public maxVisibleX = 0;
   public minVisibleY = 0;
   public maxVisibleY = 0;

   public minVisibleChunkX = 0;
   public maxVisibleChunkX = 0;
   public minVisibleChunkY = 0;
   public maxVisibleChunkY = 0;

   /** All hits that have occured to any entity visible to the player */
   public visibleHits = new Array<HitData>();
   /** All knockbacks given to the player */
   public playerKnockbacks = new Array<PlayerKnockbackData>();
   /** All healing done to any entity visible to the player */
   public heals = new Array<HealData>();
   /** All entity tick events visible to the player */
   public entityTickEvents = new Array<EntityTickEvent>();
   
   public orbCompletes = new Array<ResearchOrbCompleteData>();
   public hasPickedUpItem = false;
   public gameDataOptions = 0;

   public visibleEntities = new Set<Entity>();
   public visibleDirtiedEntities = new Array<Entity>();
   public visibleRemovedEntities = new Array<Entity>();
   public visibleDestroyedEntities = new Array<number>();

   public viewedSpawnDistribution = -1;

   constructor(socket: WebSocket, tribe: Tribe, layer: Layer, screenWidth: number, screenHeight: number, playerPosition: Point, instance: Entity, username: string, isSpectating: boolean, isDev: boolean) {
      this.socket = socket;
      this.tribe = tribe;
      this.lastLayer = layer;
      this.lastViewedPositionX = playerPosition.x;
      this.lastViewedPositionY = playerPosition.y;
      this.screenWidth = screenWidth;
      this.screenHeight = screenHeight;
      this.instance = instance;
      this.cameraSubject = instance;
      this.isSpectating = isSpectating;
      this.username = username;
      this.isDev = isDev;

      this.updateVisibleChunkBounds();
   }

   private updateVisibleChunkBounds(): void {
      this.minVisibleX = this.lastViewedPositionX - this.screenWidth * 0.5 - PlayerClientVars.VIEW_PADDING;
      this.maxVisibleX = this.lastViewedPositionX + this.screenWidth * 0.5 + PlayerClientVars.VIEW_PADDING;
      this.minVisibleY = this.lastViewedPositionY - this.screenHeight * 0.5 - PlayerClientVars.VIEW_PADDING;
      this.maxVisibleY = this.lastViewedPositionY + this.screenHeight * 0.5 + PlayerClientVars.VIEW_PADDING;
      
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
}

export default PlayerClient;