import { useEffect, useState } from "react";

export let displayMessage: (message: string) => void;
export let clearMessage: () => void;

function MessageDisplay() {
   const [message, setMessage] = useState<string | null>(null);

   useEffect(() => {
      displayMessage = (message: string): void => {
         setMessage(message);
      }

      clearMessage = (): void => {
         setMessage(null);
      }
   }, []);

   return message !== null ? (
      <div id="message-display">
         <div className="content">{message}</div>
      </div>
   ) : null;
}

export default MessageDisplay;