import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { PlayerComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export interface PlayerComponentParams {
   username: string;
}

export class PlayerComponent {
   public readonly username: string;
   
   /** ID of the tribesman the player is interacting with */
   public interactingEntityID = 0;

   public titleOffer: TribesmanTitle | null = null;

   constructor(params: PlayerComponentParams) {
      this.username = params.username;
   }
}

export const PlayerComponentArray = new ComponentArray<PlayerComponent>(ServerComponentType.player, true, {
   serialise: serialise
});

function serialise(entityID: number): PlayerComponentData {
   const playerComponent = PlayerComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.player,
      username: playerComponent.username
   };
}