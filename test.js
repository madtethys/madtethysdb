const {
    JSONDatabase,
    YAMLDatabase
} = require("./src/index.js")

const db = new YAMLDatabase({
    filePath: "./madtethysdb/database.yaml"
})

console.log(db.set("test1", "testt"))