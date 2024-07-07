import { VisibleChunkBounds, HitData, PlayerKnockbackData, HealData, ResearchOrbCompleteData } from "webgl-test-shared/dist/client-server-types";
import Tribe from "../Tribe";
import { ISocket } from "./server";
import { EntityTickEvent } from "webgl-test-shared/dist/entity-events";
import { EntityID } from "webgl-test-shared/dist/entities";

class PlayerClient {
   public readonly username: string;
   public readonly socket: ISocket;
   public readonly tribe: Tribe;

   /** ID of the player's entity */
   public instanceID: EntityID;
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
   public pickedUpItem = false;
   public gameDataOptions = 0;

   constructor(socket: ISocket, tribe: Tribe, visibleChunkBounds: VisibleChunkBounds, instanceID: number, username: string) {
      this.socket = socket;
      this.tribe = tribe;
      this.visibleChunkBounds = visibleChunkBounds;
      this.instanceID = instanceID;
      this.username = username;
   }
}

export default PlayerClient;