interface InventoryTitleProps {
   readonly content: string;
}

const InventoryTitle = ({ content }: InventoryTitleProps) => {
   return (
      <h1>{content}</h1>
   );
}

export default InventoryTitle;