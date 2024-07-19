import { HitData, PlayerKnockbackData, HealData, ResearchOrbCompleteData, VisibleChunkBounds } from "webgl-test-shared/dist/client-server-types";
import Tribe from "../Tribe";
import { EntityTickEvent } from "webgl-test-shared/dist/entity-events";
import { EntityID } from "webgl-test-shared/dist/entities";
import WebSocket from "ws";
import { TransformComponentArray } from "../components/TransformComponent";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point } from "webgl-test-shared/dist/utils";

export const enum PlayerClientVars {
   VIEW_PADDING = 128
}

class PlayerClient {
   public readonly username: string;
   public readonly socket: WebSocket;
   public readonly tribe: Tribe;

   /** ID of the player's entity */
   public instance: EntityID;
   public clientIsActive = false;

   public screenWidth: number;
   public screenHeight: number;
   public visibleChunkBounds: VisibleChunkBounds;

   /** All hits that have occured to any entity visible to the player */
   public visibleHits = new Array<HitData>();
   /** All knockbacks given to the player */
   public playerKnockbacks = new Array<PlayerKnockbackData>();
   /** All healing done to any entity visible to the player */
   public heals = new Array<HealData>();
   /** All entity tick events visible to the player */
   public entityTickEvents = new Array<EntityTickEvent>();
   
   public visibleEntityDeathIDs = new Array<number>();
   public orbCompletes = new Array<ResearchOrbCompleteData>();
   public hasPickedUpItem = false;
   public gameDataOptions = 0;

   public visibleEntities = new Set<EntityID>();

   constructor(socket: WebSocket, tribe: Tribe, screenWidth: number, screenHeight: number, playerPosition: Point, instance: EntityID, username: string) {
      this.socket = socket;
      this.tribe = tribe;
      this.screenWidth = screenWidth;
      this.screenHeight = screenHeight;
      this.visibleChunkBounds = this.getVisibleChunkBounds(playerPosition, screenWidth, screenHeight);
      this.instance = instance;
      this.username = username;
   }

   public getVisibleChunkBounds(playerPosition: Point, screenWidth: number, screenHeight: number): VisibleChunkBounds {
      const minVisibleX = playerPosition.x - screenWidth * 0.5 - PlayerClientVars.VIEW_PADDING;
      const maxVisibleX = playerPosition.x + screenWidth * 0.5 + PlayerClientVars.VIEW_PADDING;
      const minVisibleY = playerPosition.y - screenHeight * 0.5 - PlayerClientVars.VIEW_PADDING;
      const maxVisibleY = playerPosition.y + screenHeight * 0.5 + PlayerClientVars.VIEW_PADDING;
      
      const minChunkX = Math.max(Math.min(Math.floor(minVisibleX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkX = Math.max(Math.min(Math.floor(maxVisibleX / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const minChunkY = Math.max(Math.min(Math.floor(minVisibleY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      const maxChunkY = Math.max(Math.min(Math.floor(maxVisibleY / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
      return [minChunkX, maxChunkX, minChunkY, maxChunkY];
   }
}

export default PlayerClient;