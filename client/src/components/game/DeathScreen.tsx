import { randItem } from "webgl-test-shared/dist/utils";
import { useEffect, useState } from "react";
import Client from "../../client/Client";
import Game from "../../Game";
import { resetUsername, setGameState, setLoadingScreenInitialStatus } from "../App";
import { sendRespawnPacket } from "../../client/packet-creation";

const DEATH_TIPS: ReadonlyArray<string> = [
   "Always make sure your monitor is on, as otherwise it will not be on.",
   "Cyberbullying is a quick and effective way to get back at people after losing.",
   "Have you tried not dying?"
];

const quitGame = (): void => {
   resetUsername();
   setLoadingScreenInitialStatus("establishing_connection");
   setGameState("main_menu");
   Game.stop();
   Client.disconnect();
}

const DeathScreen = () => {
   const [tip, setTip] = useState<string>("");

   const randomiseTip = (): void => {
      const newTip = randItem(DEATH_TIPS);
      setTip(newTip);
   }

   useEffect(() => {
      randomiseTip();
   }, []);
   
   return <div id="death-screen">
      <div className="content">
         <h1 className="title">YOU DIED</h1>

         <p className="tip">Tip: {tip}</p>

         <div className="button-container">
            <button onClick={sendRespawnPacket}>Respawn</button>
            <button onClick={quitGame}>Quit</button>
         </div>
      </div>

      <div className="bg"></div>
   </div>;
}

export default DeathScreen;