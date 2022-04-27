import Item from "./Item";

export enum ItemName {
    berry
}

type ItemsType = { [key in ItemName]: Item };

const ITEMS: ItemsType = {
    [ItemName.berry]: new Item({
        iconSrc: "berry.png"
    })
};

export default ITEMS;