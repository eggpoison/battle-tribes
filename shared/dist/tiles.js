"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TILE_MOVE_SPEED_MULTIPLIERS = exports.TILE_FRICTIONS = exports.TileTypeString = void 0;
exports.TileTypeString = {
    [0 /* TileType.grass */]: "grass",
    [1 /* TileType.dirt */]: "dirt",
    [2 /* TileType.water */]: "water",
    [3 /* TileType.sludge */]: "sludge",
    [4 /* TileType.slime */]: "slime",
    [5 /* TileType.rock */]: "rock",
    [6 /* TileType.darkRock */]: "dark rock",
    [7 /* TileType.sand */]: "sand",
    [8 /* TileType.sandstone */]: "sandstone",
    [9 /* TileType.snow */]: "snow",
    [10 /* TileType.ice */]: "ice",
    [11 /* TileType.permafrost */]: "permafrost",
    [12 /* TileType.magma */]: "magma",
    [13 /* TileType.lava */]: "lava",
    [14 /* TileType.fimbultur */]: "fimbultur"
};
//                                                                 grass dirt  water sludge slime rock  darkRock sand  sandstone snow  ice  permafrost magma lava  frost 
exports.TILE_FRICTIONS = [0.65, 0.65, 1, 0.9, 1, 0.65, 0.65, 0.65, 0.65, 0.9, 0.2, 0.65, 0.65, 0.85, 0.65];
exports.TILE_MOVE_SPEED_MULTIPLIERS = [1, 1, 0.6, 0.6, 0.3, 1, 1, 1, 1, 0.65, 1.5, 1, 1, 1, 1];
