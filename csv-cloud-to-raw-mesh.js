/* 
 * Produces a 3d mesh from a point cloud.
 * Originally written to produce a terrain in Blender from an AutoCAD survey drawing,
 * as AutoCAD can export a csv of attribute values and Blender has an add-on importer for raw meshes.
 * 
 * Specifically:
 * 
 * Takes a CSV of 3d points, where each row is a point
 * and the first, second and third columns the point's x, y and z respectively.
 * Save the input file as 'data.csv' in the same folder as the script.
 * 
 * Creates a .raw 3d mesh with triangular faces,
 * where each face is a row and each row is in the form x0 y0 z0 x1 y1 z1 x2 y2 z2,
 * where 1, 2 and 3 are the three vertices that define the face.
 * The script outputs 'mesh.raw' in the same folder.
 * 
 * If used for a land lot, as intended, some cleanup of extra faces around the edges may be necessary.
 * 
 * Requires delaunay-triangulate
 * found here: https://github.com/mikolalysenko/delaunay-triangulate
 * installed using: npm install delaunay-triangulate
 * 
 * Last tested on Node v8.9.0 LTS
 */

const fs = require('fs');
var triangulate = require("delaunay-triangulate");

const data = fs.readFileSync('data.csv', 'utf8'); // Read the CSV file
const points = csvToPoints(data, '\r\n', ',', true); // Turn it into an array of 3d points

const points2D = points.map(function(point) {
  return [point[0], point[1]];
}); // Make a 2d version of the points, leaving out z, to only make a surface
var triangles = triangulate(points2D); // Turn the points into a surface using Delaunay triangulation (returns groups of point indexes)

const facesAsCoords = triangles.map(function(triangle){
  let face = [
    points[triangle[0]][0],
    points[triangle[0]][1],
    points[triangle[0]][2],
    points[triangle[1]][0],
    points[triangle[1]][1],
    points[triangle[1]][2],
    points[triangle[2]][0],
    points[triangle[2]][1],
    points[triangle[2]][2]
  ];
  return face.join(' '); // Each element of the array now has the form x0 y0 z0 x1 y1 z1 x2 y2 z2
}); // Translate point indexes to coordinates

const raw = facesAsCoords.join('\n'); // Turn the elements of the array into rows
fs.writeFile('mesh.raw', raw, (err) => {
  if (err) throw err;
}); // Sync save of the RAW file

function csvToPoints(csv, newline, delimiter, titles) {
  // Expects CSV file as string, its new line character ('\n', '\r' or '\r\n') and delimiter as strings
  // 'titles' is a boolean, reflects whether the file includes column titles
  // The first three columns are expected to be each point's x, y and z
  // Returns an array of points, every point an array of 3 coordinates: [[x0, y0, z0], [x1, y1, z1], ...]
  let pointsAsStrings = csv.split(newline); // Turn each row of the string into an element of an array
  if (titles === true) {     // If the first element is column titles...
    pointsAsStrings.shift(); // ...remove the first element.
  }
  let pointsAsArrays = pointsAsStrings.map(function(point) {
    let columns = point.split(delimiter); // Turn each former row into an array, each former column now an element
    let x = (columns[0] === '')? null : Number(columns[0]); // Avoid turning empty strings to zeroes...
    let y = (columns[1] === '')? null : Number(columns[1]); // ...so that we can later easily filter out those points...
    let z = (columns[2] === '')? null : Number(columns[2]); // ...that don't have all three coordinates.
    return [x, y, z];
  }).filter(function(point){
    return (point[0] != null && point[1] != null && point[2] != null); // Remove points that don't have all three coordinates (commonly expected in survey drawings)
  });
  return pointsAsArrays;
}

function test() {
  const assert = require('assert');
  assert.strictEqual(csvToPoints('0, 1, 2\r\n3, 4, 5\r\n6,,8', '\r\n', ',', false), [[0, 1, 2], [3, 4, 5]]); // Zeroes should pass, empty strings shouldn't
}