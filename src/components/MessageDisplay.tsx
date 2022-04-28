import { useEffect, useState } from "react";

export let setMessageDisplay: (message: string) => void;
export let hideMessageDisplay: () => void;

function MessageDisplay() {
   const [message, setMessage] = useState<string | null>(null);

   useEffect(() => {
      setMessageDisplay = (message: string): void => {
         setMessage(message);
      }

      hideMessageDisplay = (): void => {
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