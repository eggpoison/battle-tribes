import { VisibleChunkBounds, HitData, PlayerKnockbackData, HealData, ResearchOrbCompleteData } from "webgl-test-shared/dist/client-server-types";
import Tribe from "../Tribe";
import { EntityTickEvent } from "webgl-test-shared/dist/entity-events";
import { EntityID } from "webgl-test-shared/dist/entities";
import WebSocket from "ws";

class PlayerClient {
   public readonly username: string;
   public readonly socket: WebSocket;
   public readonly tribe: Tribe;

   /** ID of the player's entity */
   public instance: EntityID;
   public clientIsActive = true;

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

   public visibleEntities = new Array<EntityID>();

   constructor(socket: WebSocket, tribe: Tribe, visibleChunkBounds: VisibleChunkBounds, instance: EntityID, username: string) {
      this.socket = socket;
      this.tribe = tribe;
      this.visibleChunkBounds = visibleChunkBounds;
      this.instance = instance;
      this.username = username;
   }
}

export default PlayerClient;