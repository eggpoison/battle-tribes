import { randItem } from "battletribes-shared/utils";
import { useEffect, useState } from "react";
import { AppState } from "../App";
import { sendRespawnPacket } from "../../game/networking/packet-sending";
import { quitGame } from "../../game/client";

const enum Vars {
   RESPAWN_TIME_SECONDS = 8
}

interface DeathScreenProps {
   setAppState(appState: AppState): void;
}

const DEATH_TIPS: ReadonlyArray<string> = [
   "Always make sure your monitor is on, as otherwise it will not be on.",
   "Cyberbullying is a quick and effective way to get back at people after losing.",
   "Have you tried not dying?"
];

const DeathScreen = (props: DeathScreenProps) => {
   const [tip, setTip] = useState<string>("");
   const [secondsInScreen, setSecondsInScreen] = useState(0);

   // @Speed: Garbage collection
   const randomiseTip = (): void => {
      const newTip = randItem(DEATH_TIPS);
      setTip(newTip);
   }

   useEffect(() => {
      randomiseTip();
   }, []);

   useEffect(() => {
      if (secondsInScreen < Vars.RESPAWN_TIME_SECONDS) {
         setTimeout(() => {
            setSecondsInScreen(secondsInScreen + 1);
         }, 1000);
      }
   }, [secondsInScreen]);
   
   return <div id="death-screen">
      <div className="content">
         <h1 className="title">YOU DIED</h1>

         <p className="tip">Tip: {tip}</p>

         <div className="button-container">
         {secondsInScreen < Vars.RESPAWN_TIME_SECONDS ? (
            <p className="respawn-countdown">{Vars.RESPAWN_TIME_SECONDS - 1 - secondsInScreen}</p>
         ) : <>
            <button onClick={sendRespawnPacket}>Respawn</button>
            <button onClick={quitGame}>Quit</button>
         </>}
         </div>
      </div>

      <div className="bg"></div>
   </div>;
}

export default DeathScreen;