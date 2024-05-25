import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { PlayerComponentData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import { PlayerComponentArray } from "./ComponentArray";

export class PlayerComponent {
   public readonly username: string;
   
   /** ID of the tribesman the player is interacting with */
   public interactingEntityID = 0;

   public titleOffer: TribesmanTitle | null = null;

   constructor(username: string) {
      this.username = username;
   }
}

export function serialisePlayerComponent(player: Entity): PlayerComponentData {
   const playerComponent = PlayerComponentArray.getComponent(player.id);
   return {
      username: playerComponent.username
   };
}