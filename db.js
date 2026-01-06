import fs from "fs";
import path from "path";

const DB_PATH = path.resolve("db/videos.json");

export function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

export function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}