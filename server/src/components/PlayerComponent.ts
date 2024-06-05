import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { PlayerComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export class PlayerComponent {
   public readonly username: string;
   
   /** ID of the tribesman the player is interacting with */
   public interactingEntityID = 0;

   public titleOffer: TribesmanTitle | null = null;

   constructor(username: string) {
      this.username = username;
   }
}

export const PlayerComponentArray = new ComponentArray<ServerComponentType.player, PlayerComponent>(true, {
   serialise: serialise
});

function serialise(entityID: number): PlayerComponentData {
   const playerComponent = PlayerComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.player,
      username: playerComponent.username
   };
}