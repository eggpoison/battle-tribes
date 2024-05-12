"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rectanglePointsDoIntersect = exports.computeSideAxis = exports.circleAndRectangleDoIntersect = exports.circlesDoIntersect = exports.DEFAULT_COLLISION_MASK = exports.COLLISION_BITS = void 0;
const utils_1 = require("./utils");
// @Speed: Maybe make into const enum?
exports.COLLISION_BITS = {
    default: 1 << 0,
    cactus: 1 << 1,
    none: 1 << 2,
    iceSpikes: 1 << 3,
    plants: 1 << 4,
    planterBox: 1 << 5
};
exports.DEFAULT_COLLISION_MASK = exports.COLLISION_BITS.default | exports.COLLISION_BITS.cactus | exports.COLLISION_BITS.iceSpikes | exports.COLLISION_BITS.plants | exports.COLLISION_BITS.planterBox;
const findMinWithOffset = (vertices, offsetX, offsetY, axisX, axisY) => {
    const firstVertex = vertices[0];
    let min = axisX * (firstVertex.x + offsetX) + axisY * (firstVertex.y + offsetY);
    for (let i = 1; i < 4; i++) {
        const vertex = vertices[i];
        const dotProduct = axisX * (vertex.x + offsetX) + axisY * (vertex.y + offsetY);
        if (dotProduct < min) {
            min = dotProduct;
        }
    }
    return min;
};
const findMaxWithOffset = (vertices, offsetX, offsetY, axisX, axisY) => {
    const firstVertex = vertices[0];
    let max = axisX * (firstVertex.x + offsetX) + axisY * (firstVertex.y + offsetY);
    for (let i = 1; i < 4; i++) {
        const vertex = vertices[i];
        const dotProduct = axisX * (vertex.x + offsetX) + axisY * (vertex.y + offsetY);
        if (dotProduct > max) {
            max = dotProduct;
        }
    }
    return max;
};
function circlesDoIntersect(circle1x, circle1y, radius1, circle2x, circle2y, radius2) {
    const dist = (0, utils_1.distance)(circle1x, circle1y, circle2x, circle2y);
    return dist <= radius1 + radius2;
}
exports.circlesDoIntersect = circlesDoIntersect;
/** Checks if a circle and rectangle are intersecting */
function circleAndRectangleDoIntersect(circlePosX, circlePosY, circleRadius, rectPosX, rectPosY, rectWidth, rectHeight, rectRotation) {
    // Rotate the circle around the rectangle to "align" it
    const alignedCirclePosX = (0, utils_1.rotateXAroundPoint)(circlePosX, circlePosY, rectPosX, rectPosY, -rectRotation);
    const alignedCirclePosY = (0, utils_1.rotateYAroundPoint)(circlePosX, circlePosY, rectPosX, rectPosY, -rectRotation);
    // 
    // Then do a regular rectangle check
    // 
    const distanceX = Math.abs(alignedCirclePosX - rectPosX);
    const distanceY = Math.abs(alignedCirclePosY - rectPosY);
    if (distanceX > (rectWidth / 2 + circleRadius))
        return false;
    if (distanceY > (rectHeight / 2 + circleRadius))
        return false;
    if (distanceX <= rectWidth / 2)
        return true;
    if (distanceY <= rectHeight / 2)
        return true;
    const cornerDistanceSquared = Math.pow(distanceX - rectWidth / 2, 2) + Math.pow(distanceY - rectHeight / 2, 2);
    return cornerDistanceSquared <= Math.pow(circleRadius, 2);
}
exports.circleAndRectangleDoIntersect = circleAndRectangleDoIntersect;
/** Computes the axis for the line created by two points */
function computeSideAxis(point1, point2) {
    const direction = point1.calculateAngleBetween(point2);
    return utils_1.Point.fromVectorForm(1, direction);
}
exports.computeSideAxis = computeSideAxis;
/** Allows for precomputation of points for optimization */
function rectanglePointsDoIntersect(vertexPositions1, vertexPositions2, offset1x, offset1y, offset2x, offset2y, axis1x, axis1y, axis2x, axis2y) {
    // Axis 1
    const axis1min1 = findMinWithOffset(vertexPositions1, offset1x, offset1y, axis1x, axis1y);
    const axis1max1 = findMaxWithOffset(vertexPositions1, offset1x, offset1y, axis1x, axis1y);
    const axis1min2 = findMinWithOffset(vertexPositions2, offset2x, offset2y, axis1x, axis1y);
    const axis1max2 = findMaxWithOffset(vertexPositions2, offset2x, offset2y, axis1x, axis1y);
    if (axis1min2 >= axis1max1 || axis1min1 >= axis1max2) {
        return false;
    }
    // Axis 1 complement
    const axis1ComplementMin1 = findMinWithOffset(vertexPositions1, offset1x, offset1y, -axis1y, axis1x);
    const axis1ComplementMax1 = findMaxWithOffset(vertexPositions1, offset1x, offset1y, -axis1y, axis1x);
    const axis1ComplementMin2 = findMinWithOffset(vertexPositions2, offset2x, offset2y, -axis1y, axis1x);
    const axis1ComplementMax2 = findMaxWithOffset(vertexPositions2, offset2x, offset2y, -axis1y, axis1x);
    if (axis1ComplementMin2 >= axis1ComplementMax1 || axis1ComplementMin1 >= axis1ComplementMax2) {
        return false;
    }
    // Axis 2
    const axis2min1 = findMinWithOffset(vertexPositions1, offset1x, offset1y, axis2x, axis2y);
    const axis2max1 = findMaxWithOffset(vertexPositions1, offset1x, offset1y, axis2x, axis2y);
    const axis2min2 = findMinWithOffset(vertexPositions2, offset2x, offset2y, axis2x, axis2y);
    const axis2max2 = findMaxWithOffset(vertexPositions2, offset2x, offset2y, axis2x, axis2y);
    if (axis2min2 >= axis2max1 || axis2min1 >= axis2max2) {
        return false;
    }
    // Axis 2 complement
    const axis2ComplementMin1 = findMinWithOffset(vertexPositions1, offset1x, offset1y, -axis2y, axis2x);
    const axis2ComplementMax1 = findMaxWithOffset(vertexPositions1, offset1x, offset1y, -axis2y, axis2x);
    const axis2ComplementMin2 = findMinWithOffset(vertexPositions2, offset2x, offset2y, -axis2y, axis2x);
    const axis2ComplementMax2 = findMaxWithOffset(vertexPositions2, offset2x, offset2y, -axis2y, axis2x);
    if (axis2ComplementMin2 >= axis2ComplementMax1 || axis2ComplementMin1 >= axis2ComplementMax2) {
        return false;
    }
    return true;
}
exports.rectanglePointsDoIntersect = rectanglePointsDoIntersect;
