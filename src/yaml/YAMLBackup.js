const fs = require("fs")
const EventEmitter = require("events")
const YAML = require("yaml")

function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
}

function formatDate(date) {
    return [
        padTo2Digits(date.getDate()),
        padTo2Digits(date.getMonth() + 1),
        date.getFullYear(),
    ].join('/');
}

const arrayIncludes = (array, input) => {
    let res;
    for (const i of array) {
        if (i == input) {
            res = true
            break;
        } else {
            res = false;
            continue
        }
    }
    return res
}
const writeFileWithDirs = ((data, path) => {
    const dirs = path.split("/").slice(1, -1);

    if (dirs.length === 0) {
        fs.writeFileSync(path, data, "utf-8");
    } else {
        const dirsLength = dirs.length;
        const processedDirs = [];
        let i = 0;

        while (i < dirsLength) {
            processedDirs.push(dirs[i]);
            const currentPath = `./${processedDirs.join("/")}`;

            if (!fs.existsSync(currentPath) || !fs.lstatSync(currentPath).isDirectory()) {
                fs.mkdirSync(currentPath);
            }

            i++;
        }

        fs.writeFileSync(path, data, "utf-8");
    }
});

class YAMLBackup extends EventEmitter {
    constructor(opts) {
        super();
        const db = require("./YAMLDatabase.js")
        this.path = opts.path || false;
        this.time = opts.time || 5;
        this.logging = opts.logging;
        this.backupKeys = [];
        this.backupValues = [];
        this.backupCount = "0";
        this.backupData = {};
        this.lastBackupData = {};
        this.dataStore = {};

        if (!fs.existsSync(this.path) || !fs.lstatSync(this.path).isFile()) {
            writeFileWithDirs("{}", this.path)
        }
        if (!fs.existsSync("./madtethysdb/backupData.yaml") || !fs.lstatSync("./madtethysdb/backupData.yaml").isFile()) {
            writeFileWithDirs("{}", "./madtethysdb/backupData.yaml")
        }
        this.lastBackupData.backupDB = new db({
            filePath: "./madtethysdb/backupData.yaml"
        })
        this.getBackupData = () => {
            let res = {};
            Object.entries(YAML.parse(fs.readFileSync(this.path, "utf-8"))).map(x => Object.entries(x[1].data)).forEach(x => {
                x.forEach(u => {
                    res[u[0]] = u[1]
                })

            })
            return res
        }
        /*this.lastBackupData.backupDB.ayarla = (key,value) => {
          const data = this.lastBackupData.backupDB.data.lastData[key] = value 
            writeFileWithDirs(YAML.stringify(data, null, 2), this.lastBackupData.backupDB.jsonFilePath);
        }*/

        if (fs.readFileSync(this.path, "utf-8") == "") {
            fs.writeFileSync(this.path, "{}", "utf-8")
        }
        if (fs.readFileSync("./madtethysdb/backupData.yaml", "utf-8") == "{}") {
            this.lastBackupData.backupDB.set("BackupData", [])
            /*this.lastBackupData.backupDB.set("backupCount","0")
                    this.lastBackupData.backupDB.set("count","0")
                    this.lastBackupData.backupDB.set("lastData",{})*/
        }
        //console.log(this.lastBackupData.backupDB.get("BackupData").some(x=>x.BackupPath == this.path))

        if (!this.lastBackupData.backupDB.get("BackupData").some(x => x.BackupPath == this.path)) {
            this.lastBackupData.backupDB.push("BackupData", {
                backupCount: "0",
                count: "0",
                lastData: {},
                BackupPath: this.path
            })
        }
        let backupData = this.lastBackupData.backupDB.get("BackupData")
        this.backupCount = backupData.length === 0 ? "0" : this.lastBackupData.backupDB.get("BackupData").find(x => x.BackupPath == this.path) ? this.lastBackupData.backupDB.get("BackupData").find(x => x.BackupPath == this.path).backupCount : "0"
        if (Object.entries(YAML.parse(fs.readFileSync(this.path, "utf-8"))).length != 0) {
            this.backupData = YAML.parse(fs.readFileSync(this.path, "utf-8"))

        }
        if (Object.entries(this.backupData).length != 0) {
            this.backupKeys = Object.entries(this.getBackupData()).map(x => x[0])
            this.backupValues = Object.entries(this.getBackupData()).map(x => x[1])
        }
    }

    sendBackup(key, value) {
        const backupData = this.lastBackupData.backupDB.get("BackupData").filter(x => x.BackupPath == this.path)[0]

        if (!arrayIncludes(this.backupKeys, key) && !arrayIncludes(Object.entries(backupData.lastData).length == 0 ? [] : Object.entries(backupData.lastData).map(x => x[0]), key)) {
            this.setLastData(key, value)
            this.increaseBackupCount()
        }

        if (backupData.lastData[key] != undefined && backupData.lastData[key] != value /*&& Object.entries(this.getBackupData()).filter(x=>arrayIncludes(x,key) && arrayIncludes(x,value)).length == 0*/ ) {
            this.setLastData(key, value)
            this.increaseBackupCount()
        }
        if (backupData.lastData[key] ? (backupData.lastData[key] != value ? true : false) : true) {
            if (this.getBackupData()[key] != value) {
                if (this.getBackupData()[key] != undefined) {
                    this.setLastData(key, value)
                    this.increaseBackupCount()
                }
            }
        }
        //console.log(Object.entries(this.dataStore))//console.log(Object.entries(this.dataStore))
        //console.log(Object.entries(data))   


        //console.log(Object.entries(this.backupdata))      
        if (this.backupCount == this.time /*&& Object.entries(this.dataStore).length != 0*/ ) {
            this.backupCount = 0;
            let newBackupCount = this.lastBackupData.backupDB.get("BackupData")
            this.increaseCount()
            newBackupCount.forEach(x => {
                if (x.BackupPath == this.path) {
                    x.backupCount = "0"
                }
            })
            this.lastBackupData.backupDB.set("BackupData", newBackupCount)
            let newData = this.lastBackupData.backupDB.get("BackupData").find(x => x.BackupPath == this.path).lastData
            let count = this.lastBackupData.backupDB.get("BackupData").find(x => x.BackupPath == this.path).count
            // if(Object.entries(this.dataStore).length != 0){      
            let backup = {}
            backup[`Back-Up-${count}`] = {
                date: formatDate(new Date()),
                data: newData
            }
            this.backup(backup)
            if (this.logging === true) {
                console.log("📝 madtethysdb Bilgilendirme: Yedekleme Alındı. Yedek ismi: Back-Up-" + count + ".")
            }
            this.emit("backup", {
                lastData: newData
            })
            this.clearLastData()
            //if(Object.entries(this.backupdata).length != 0){  
            this.backupKeys = Object.entries(this.getBackupData()).map(x => x[0])

            this.backupValues = Object.entries(this.getBackupData()).map(x => x[1])

            // }
            //  }

        }
    }

    backup(backup) {
        const name = Object.entries(backup)[Object.entries(backup).length == 0 ? 0 : Object.entries(backup).length - 1][0]
        const inside = Object.entries(backup)[Object.entries(backup) == 0 ? 0 : Object.entries(backup).length - 1][1]
        const backupData = Object.entries(YAML.parse(fs.readFileSync(this.path, "utf-8"))).length == 0 ? {} : Object.entries(YAML.parse(fs.readFileSync(this.path, "utf-8")))[0]
        const data = YAML.parse(fs.readFileSync(this.path, "utf-8"))
        data[name] = inside
        fs.writeFileSync(this.path, YAML.stringify(data, null, 2), "utf-8")
    }
    clearLastData() {
        let backupData = this.lastBackupData.backupDB.get("BackupData")
        backupData.forEach(x => {
            if (x.BackupPath == this.path) {
                x.lastData = {}
            }
        })
        this.lastBackupData.backupDB.set("BackupData", backupData)
    }


    increaseCount() {
        let backupData = this.lastBackupData.backupDB.get("BackupData")

        backupData.forEach(x => {
            if (x.BackupPath == this.path) {
                x.count = String(parseInt(x.count) + 1)
            }
        })
        this.lastBackupData.backupDB.set("BackupData", backupData)
    }

    increaseBackupCount() {
        let backupData = this.lastBackupData.backupDB.get("BackupData")

        backupData.forEach(x => {
            if (x.BackupPath == this.path) {
                x.backupCount = String(parseInt(x.backupCount) + 1)
            }
        })
        this.lastBackupData.backupDB.set("BackupData", backupData)
        this.backupCount = String(parseInt(this.backupCount) + 1)
    }
    setLastData(key, value) {
        let backupData = this.lastBackupData.backupDB.get("BackupData")

        backupData.forEach(x => {
            if (x.BackupPath == this.path) {
                x.lastData[key] = value
            }
        })
        this.lastBackupData.backupDB.set("BackupData", backupData)
    }
}

module.exports = YAMLBackup;