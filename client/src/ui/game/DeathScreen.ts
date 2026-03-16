import { assert, randItem } from "webgl-test-shared";
import { sendRespawnPacket } from "../../game/networking/packet-sending/packet-sending";
import { addTickCallback } from "../../game/game";
import { quitGame } from "../LoadingScreen";
import { deathScreen } from "../../ui-state/death-screen-funcs";

const RESPAWN_TIME_SECONDS = 8;

const DEATH_TIPS: ReadonlyArray<string> = [
   "Always make sure your monitor is on, as otherwise it will not be on.",
   "Cyberbullying is a quick and effective way to get back at people after losing.",
   "Have you tried not dying?"
];

let deathScreenElem: HTMLElement | null = null;
let respawnCountdownElem: HTMLElement | null = null;
let respawnCountdownNode: Text | null = null;

let secondsInScreen = 0;

deathScreen.open = createDeathScreen;

function tickDeathScreen(): void {
   assert(deathScreenElem !== null && respawnCountdownNode !== null && respawnCountdownElem !== null);

   secondsInScreen++;
   if (secondsInScreen >= RESPAWN_TIME_SECONDS) {
      respawnCountdownElem.remove();
      respawnCountdownElem = null;

      const buttonContainerElem = deathScreenElem.querySelector(".button-container")!;

      const respawnButton = document.createElement("button");
      respawnButton.textContent = "Respawn";
      respawnButton.addEventListener("click", sendRespawnPacket);
      buttonContainerElem.appendChild(respawnButton);

      const quitButton = document.createElement("button");
      quitButton.textContent = "Quit";
      quitButton.addEventListener("click", quitGame);
      buttonContainerElem.appendChild(quitButton);
   } else {
      respawnCountdownNode.data = (RESPAWN_TIME_SECONDS - 1 - secondsInScreen).toString();
      addTickCallback(1, tickDeathScreen);
   }
}

function createDeathScreen(): void {
   assert(deathScreenElem === null);

   secondsInScreen = 0;
   
   const tip = randItem(DEATH_TIPS);
   
   deathScreenElem = document.createElement("div");
   deathScreenElem.id = "death-screen";
   deathScreenElem.classList.add("content");
   deathScreenElem.innerHTML = `
      <div class="content">
         <h1 class="title">YOU DIED</h1>

         <p class="tip">Tip: ${tip}</p>

         <div class="button-container">
            <p class="respawn-countdown">${RESPAWN_TIME_SECONDS - 1}</p>
         </div>
      </div>

      <div class="bg"></div>
   `;
   document.body.appendChild(deathScreenElem);

   respawnCountdownElem = deathScreenElem.querySelector(".respawn-countdown")!;
   respawnCountdownNode = respawnCountdownElem.firstChild as Text;

   addTickCallback(1, tickDeathScreen);
}

export function destroyDeathScreen(): void {
   assert(deathScreenElem !== null);
   deathScreenElem.remove();
   deathScreenElem = null;
   respawnCountdownElem = null;
   respawnCountdownNode = null;
}