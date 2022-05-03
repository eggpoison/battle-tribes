import { useEffect } from "react";

interface WindowPromptProps {
   children: any;
}

const WindowPrompt = ({ children }: WindowPromptProps) => {
   useEffect(() => {
      document.getElementById("mask")!.classList.remove("hidden");

      return () => {
         document.getElementById("mask")!.classList.add("hidden");
      }
   }, []);

   return (
      <div className="window-prompt">
         {children}
      </div>
   )
}

export default WindowPrompt;