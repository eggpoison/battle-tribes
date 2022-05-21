import { useEffect, useState } from "react";
import { roundNum } from "../utils";

export let togglePlayerRespawnMessage: (isVisible: boolean) => void;

export let setPlayerRespawnMessageTime: (respawnTime: number) => void;

const PlayerRespawnMessage = () => {
   const [isVisible, setIsVisible] = useState<boolean>(false);
   const [respawnTime, setRespawnTime] = useState<number>(0);

   useEffect(() => {
      togglePlayerRespawnMessage = (isVisible: boolean): void => {
         setIsVisible(isVisible);
      }

      setPlayerRespawnMessageTime = (respawnTime: number) => {
         setRespawnTime(respawnTime);
      }
   }, []);

   return isVisible ? (
      <div id="player-respawn-message">
         <h1>You died!</h1>
         <h2>Respawning in {roundNum(respawnTime, 1)} seconds...</h2>
      </div>
   ) : null;
}

export default PlayerRespawnMessage;