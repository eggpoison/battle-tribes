import { useEffect, useState } from "react";
import { toggleTerminalVisiblity } from "./Terminal";

export let setTerminalButtonOpened: (isOpened: boolean) => void;

interface TerminalButtonProps {
   readonly startingIsOpened: boolean;
}

const TerminalButton = ({ startingIsOpened }: TerminalButtonProps) => {
   const [isOpened, setIsOpened] = useState(startingIsOpened);

   useEffect(() => {
      setTerminalButtonOpened = (isOpened: boolean): void => {
         setIsOpened(isOpened);
      }
   }, []);

   return <button id="terminal-button" onClick={() => toggleTerminalVisiblity()} className={isOpened ? "opened" : undefined}>
      Terminal
   </button>;
}

export default TerminalButton;