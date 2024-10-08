const fs = require("fs"); 
const Backup = require("./JSONBackup.js") 
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
const EventEmitter = require("events")
class JSONDatabase extends EventEmitter {
    constructor(construct) {
        super();
        this.data = {};
        this.lastData = null;
        this.lastDataType = null;
        this.jsonFilePath = construct.filePath || "./madtethysdb/database.json"
        this.eventData = {}
        this.eventData.check = null;
        this.eventData.willBeExecutedDatas = [];
        this.eventData.deleteEventCheck = null;
        this.eventData.willBeExecutedDeleteDatas = [];
        this.eventData.backupCheck = null;
        this.eventData.willBeExecutedBackupDatas = [];
        let file = this.jsonFilePath.split(".")
        if (file[file.length - 1] != "json") {
            throw Error("❌ madtethysdb Hatası: Girilen veri tabanı dosyasının uzantısı json değil")
        }
        setInterval(() => {
            if (this.eventData.check != null) {
                for (const data of this.eventData.willBeExecutedDatas) {
                    this.emit('dataSet', data)
                }
                this.eventData.check = null
                this.eventData.willBeExecutedDatas = []
            }
            if (this.eventData.deleteEventCheck != null) {
                for (const data of this.eventData.willBeExecutedDeleteDatas) {
                    this.emit('dataDelete', data)
                }
                this.eventData.deleteEventCheck = null
                this.eventData.willBeExecutedDeleteDatas = []
            }

            if (this.eventData.backupCheck != null) {
                for (const data of this.eventData.willBeExecutedBackupDatas) {
                    this.emit('backup', data)
                }
                this.eventData.backupCheck = null
                this.eventData.willBeExecutedBackupDatas = []
            }
        }, construct.eventInterval || 100)
        let log;
        if (construct.backup) {
            if (construct.backup.logging == true) {
                log = true
            } else if (construct.backup.logging == false) {
                log = false
            } else {
                log = true
            }
        }
        if (!fs.existsSync(this.jsonFilePath) || !fs.lstatSync(this.jsonFilePath).isFile()) {
            writeFileWithDirs("{}", this.jsonFilePath);
        }
        if (construct.backup) {
            if (construct.backup && construct.backup.path) {
                let backupFile = construct.backup.path.split(".")
                if (backupFile[backupFile.length - 1] != "json") {
                    throw Error("❌ madtethysdb Hatası: Girilen veri tabanı dosyasının uzantısı json değil")
                }
            }
            this.backup = new Backup({
                path: construct.backup.path || "./madtethysdb/backup.json",
                time: construct.backup.time || 5,
                logging: log
            })
            this.backup.on("backup", (data) => {
                this.eventData.backupCheck = data;
                this.eventData.willBeExecutedBackupDatas.push(data)
            })
            this.lastBackupData = {}
            this.lastBackupData.backupDB = this.backup.lastBackupData.backupDB
            this.getBackupData = () => {
                let res = {};
                Object.entries(JSON.parse(fs.readFileSync(this.backup.path, "utf-8"))).map(x => Object.entries(x[1].data)).forEach(x => {
                    x.forEach(u => {
                        res[u[0]] = u[1]
                    })

                })
                return res
            }
            /*function set(key,value) {
      console.log(key + "  " + value)
      this.lastBackupData.backupDB.data.lastData[key] = value 
        writeFileWithDirs(JSON.stringify(this.lastBackupData.backupDB.data, null, 2), this.lastBackupData.backupDB.jsonFilePath);
    }*/
            //console.log(set)
            // this.lastBackupData.backupDB.set = set
        }
        this.fetchDataFromFile()
    }
    fetchDataFromFile() {
        let savedData;
        try {
            savedData = JSON.parse(fs.readFileSync(this.jsonFilePath, "utf-8"));
        } catch (error) {
            console.error(error)
        }

        this.data = savedData;
    }
    kaydet(key, value, type) {
        writeFileWithDirs(JSON.stringify(this.data, null, 2), this.jsonFilePath);
        if (this.backup && !(type == "clear" || type == "delete")) {
            this.backup.sendBackup(key, value)
        }
    }
    get(key) {
        if (!key) {
            throw Error("❌ madtethysdb Hatası: Veri Tabanından Çekilecek Veri Bulunamadı. Lütfen Çekmek İstediğiniz Veriyi Girin.")
        } else {
            return this.data[key];
        }
    }
    has(key, returnDatas = false) {
        if (!key) throw Error("❌ madtethysdb Hatası: Veri Tabanında Varlığı Kontrol Edilecek Veri Bulunamadı. Lütfen Şartlanacak Veriyi Girin.")
        let result = Boolean(this.data[key]);
        if (returnDatas === true) {
            let data = Object.entries(JSON.parse(fs.readFileSync(this.jsonFilePath, "utf-8"))).filter(x => x[0] === key)
            let obj = {}
            result == true ? obj[data[0][0]] = data[0][1] : ""
            return {
                result: result,
                data: obj
            }
        } else {
            return result;
        }
    }
    set(key, value) {
        const old = this.data[key]
        if (!key) {
            throw Error("❌ madtethysdb Hatası: Veri Tabanı Dosyasına Eklenecek Veri Bulunamadı. Lütfen Eklemek İstediğiniz Verinin İsmini Girin.")
        } else if (!value) {
            throw Error("❌ madtethysdb Hatası: Veri Tabanı Dosyasına Eklenecek Veri Bulunamadı. Lütfen Eklemek İstediğiniz Verinin Değerini Girin.")
        } else {
            this.data[key] = value;
            this.kaydet(key, value, 'set');
            const data = {
                key: key,
                changed: old == undefined ? false : this.data[key] == old ? false : true,
                newAdded: old == undefined,
                oldValue: old,
                value: value
            }
            this.eventData.check = data
            this.eventData.willBeExecutedDatas.push(data)
        }
    }
    delete(key) {
        const val = this.data[key]
        if (!key) {
            throw Error("❌ madtethysdb Hatası: Veri Tabanı Dosyasınan Silinmek İstenen Veri Bulunamadı. Lütfen Silinecek Veriyi Girin.")
        } else {
            delete this.data[key];
            this.kaydet(undefined, undefined, "delete");
            this.eventData.deleteEventCheck = {
                key: key,
                value: val
            }
            this.eventData.willBeExecutedDeleteDatas.push(this.eventData.deleteEventCheck)
        }
    }
    conc(key, count) {
        if (!key) {
            throw Error("❌ madtethysdb Hatası: Veri Tabanında Üzerine Ekleme Yapılmak İstenen Veri Bulunamadı. Lütfen Ekleme Yapmak İstediğiniz Verinin İsmini Girin.")
        }
        if (!count) {
            throw Error("❌ madtethysdb Hatası: Verinin Üzerine Eklemek İstediğiniz Değer Bulunamadı. Lütfen Ekleme Yapmak İstediğiniz Verinin İsmini Girin.")
        }
        if (!this.data[key]) {
            //console.log(this.data)
            this.data[key] = count;
            this.kaydet(key, this.data[key])
            this.lastData = count;
            this.lastDataType = "conc"
            return;
        }
        if (typeof this.data[key] == 'string' && isNaN(parseInt(this.data[key])) == false) {
            const val = String(parseInt(this.data[key]) + parseInt(count));
            this.data[key] = val
            this.kaydet(key, this.data[key]);
        } else {
            this.data[key] += count;
            this.kaydet(key, this.data[key]);
        }


        this.lastData = count;
        this.lastDataType = "conc"
    }
    multi(key, count) {
        if (!key) {
            throw Error("❌ madtethysdb Hatası: Veri Tabanında Çarpma İşlemine Sokulacak Veri Bulunamadı. Lütfen Verinin İsmini Girin.")
        }
        if (!count) {
            throw Error("❌ madtethysdb Hatası: Veri ile Çarpma İşlemine Sokmak İstediğiniz Değer Bulunamadı. Lütfen İşleme Sokmak İstediğiniz Verinin İsmini Girin.")
        }
        if (isNaN(parseInt(this.data[key])) == true) {
            throw Error("❌ madtethysdb Hatası: Veri ile Çarpma İşlemine Sokmak İstediğiniz Değer Bir Sayı Olmalı. Lütfen İşleme Sokmak İstediğiniz Veriyi Sayı Formatında Girin.")
        }
        if (!this.data[key]) {
            this.data[key] = count;
            this.lastData = count;
            this.lastDataType = "multi"
            this.kaydet(key, this.data[key]);
            return;
        } else {
            const val = String(parseInt(this.data[key]) * parseInt(count));
            this.data[key] = val
        }
        this.lastData = count;
        this.lastDataType = "multi"
        this.kaydet(key, this.data[key]);
    }
    divide(key, count) {
        if (!key) {
            throw Error("❌ madtethysdb Hatası: Veri Tabanında Bölme İşlemine Sokulacak Veri Bulunamadı. Lütfen Verinin İsmini Girin.")
        }
        if (!count) {
            throw Error("❌ madtethysdb Hatası: Veri ile Bölme İşlemine Sokmak İstediğiniz Değer Bulunamadı. Lütfen İşleme Sokmak İstediğiniz Verinin İsmini Girin.")
        }
        if (isNaN(parseInt(this.data[key])) == true) {
            throw Error("❌ madtethysdb Hatası: Veri ile Bölme İşlemine Sokmak İstediğiniz Değer Bir Sayı Olmalı. Lütfen İşleme Sokmak İstediğiniz Veriyi Sayı Formatında Girin.")
        }
        if (!this.data[key]) {
            this.data[key] = count;
            this.lastData = count;
            this.lastDataType = "divide"
            this.kaydet(key, this.data[key]);
            return;
        } else {
            const val = String(parseInt(this.data[key]) / parseInt(count));
            this.data[key] = val
        }
        this.lastData = count;
        this.lastDataType = "divide"
        this.kaydet(key, this.data[key]);
    }
    sum(key, count) {
        if (!key) {
            throw Error("❌ madtethysdb Hatası: Veri Tabanında Toplama İşlemine Sokulacak Veri Bulunamadı. Lütfen Verinin İsmini Girin.")
        }
        if (!count) {
            throw Error("❌ madtethysdb Hatası: Veri ile Toplama İşlemine Sokmak İstediğiniz Değer Bulunamadı. Lütfen İşleme Sokmak İstediğiniz Verinin İsmini Girin.")
        }
        if (isNaN(parseInt(this.data[key])) == true) {
            throw Error("❌ madtethysdb Hatası: Veri ile Toplama İşlemine Sokmak İstediğiniz Değer Bir Sayı Olmalı. Lütfen İşleme Sokmak İstediğiniz Veriyi Sayı Formatında Girin.")
        }
        if (!this.data[key]) {
            this.data[key] = +count;
            this.lastData = count;
            this.lastDataType = "sum"
            this.kaydet(key, this.data[key]);
            return;
        } else {
            const val = String(parseInt(this.data[key]) + parseInt(count));
            this.data[key] = val
        }
        this.lastData = count;
        this.lastDataType = "sum"
        this.kaydet(key, this.data[key]);
    }
    sub(key, count) {
        if (!key) {
            throw Error("❌ madtethysdb Hatası: Veri Tabanında Çıkarma İşlemine Sokulacak Veri Bulunamadı. Lütfen Verinin İsmini Girin.")
        }
        if (!count) {
            throw Error("❌ madtethysdb Hatası: Veri ile Çıkarma İşlemine Sokmak İstediğiniz Değer Bulunamadı. Lütfen İşleme Sokmak İstediğiniz Verinin İsmini Girin.")
        }
        if (isNaN(parseInt(this.data[key])) == true) {
            throw Error("❌ madtethysdb Hatası: Veri ile Çıkarma İşlemine Sokmak İstediğiniz Değer Bir Sayı Olmalı. Lütfen İşleme Sokmak İstediğiniz Veriyi Sayı Formatında Girin.")
        }
        if (!this.data[key]) {
            this.data[key] = -count;
            this.lastData = count;
            this.lastDataType = "sub"
            this.kaydet(key, this.data[key])
            return;
        } else {
            const val = String(parseInt(this.data[key]) - parseInt(count));
            this.data[key] = val
        }
        this.lastData = count;
        this.lastDataType = "sub"
        this.kaydet(key, this.data[key]);
    }
    push(key, element) {
        if (!key) {
            throw Error("❌ madtethysdb Hatası: Veri Tabanında Üzerine Değer Eklemek İstediğiniz Array Bir Veri Bulunamadı. Lütfen Verinin İsmini Girin.")
        }
        if (!element) {
            throw Error("❌ madtethysdb Hatası: Verinin Üzerine Eklemek İstediğiniz Değer Bulunamadı. Lütfen Eklemek İstediğiniz Değerin İsmini Girin.")
        }
        if (!this.data[key]) {
            this.data[key] = [];
            this.lastData = element;
            this.lastDataType = "push"
            this.kaydet(key, this.data[key])
            return;
        }
        if (!Array.isArray(this.data[key])) {
            throw Error("❌ madtethysdb Hatası: Veri Tabanında Üzerine Değer Eklemek İstediğiniz Veri Array Değil. Lütfen Veriyi Array Formatında Olacak Biçimde Değiştirin.")
        } else {
            this.data[key].push(element)
            this.kaydet(key, this.data[key]);
            this.lastData = element;
            this.lastDataType = "push"
        }
    }
    clear() {
        this.data = {};
        this.kaydet(undefined, undefined, "clear");
    }
    get info() {
        return {
            name: "madtethysdb",
            type: "JSONDatabase",
            version: "2.3.2",
            owner: "falsisdev",
            developers: ["falsisdev", "berat141"],
            github: "https://github.com/madtethys/madtethysdb",
            pathfile: this.jsonFilePath,
            backupfile: this.log ? this.construct.backup.path : 'Ayarlanmamış.',
            backuptime: this.log ? this.construct.backup.time : 5,
            lastdata: {
                data: this.lastData,
                type: this.lastDataType
            }
        }
    }

    all() {
        if (!this.jsonFilePath) {
            throw new TypeError("❌ madtethysdb Hatası: Veri Tabanı Dosyası Bulunamadı. Lütfen Geliştiriciler İle İletişime Geçin.")
        }
        return fs.readFileSync(`${this.jsonFilePath}`, "utf8")
    }
    includesKey(key, returnDatas = false) {
        if (!key) {
            throw new Error("❌ madtethysdb Hatası: Veri Tabanında Varlığı Kontrol Edilecek Veri Bulunamadı. Lütfen Şartlanacak Veriyi Girin.")
        } else {
            let data = Object.entries(JSON.parse(fs.readFileSync(this.jsonFilePath, "utf-8"))).filter(x => x[0].includes(key))
            if (returnDatas = false) {
                return data.length > 0 ? true : false
            } else {
                let obj = {};
                data.forEach(x => {
                    obj[x[0]] = x[1]
                })
                return {
                    result: data.length > 0 ? true : false,
                    data: obj
                }

            }
        }
    }

    includesValue(value, returnDatas = false) {
        if (!value) {
            throw new Error("❌ madtethysdb Hatası: Veri Tabanında Varlığı Kontrol Edilecek Veri Değeri Bulunamadı. Lütfen Şartlanacak Verinin Değerini Girin.")
        } else {
            let data = Object.entries(JSON.parse(fs.readFileSync(this.jsonFilePath, "utf-8"))).filter(x => x[1].includes(value))
            if (returnDatas = false) {
                return data.length > 0 ? true : false
            } else {
                let obj = {};
                data.forEach(x => {
                    obj[x[0]] = x[1]
                })
                return {
                    result: data.length > 0 ? true : false,
                    data: obj
                }

            }
        }
    }
    hasValue(value, returnDatas = false) {
        if (!value) {
            throw new Error("❌ madtethysdb Hatası: Veri Tabanında Varlığı Kontrol Edilecek Veri Değeri Bulunamadı. Lütfen Şartlanacak Verinin Değerini Girin.")
        }

        let data = Object.entries(JSON.parse(fs.readFileSync(this.jsonFilePath, "utf-8"))).filter(x => x[1] === value)

        if (returnDatas == false) {
            return data.length === 0 ? false : true
        } else {
            let obj = {}
            data.forEach(x => {
                obj[x[0]] = x[1]
            })
            return {
                result: data.length > 0 ? true : false,
                data: obj
            }
        }
    }

    keys() {
        return Object.entries(JSON.parse(fs.readFileSync(this.jsonFilePath, "utf-8"))).map(x => x[0])
    }

    values() {
        return Object.entries(JSON.parse(fs.readFileSync(this.jsonFilePath, "utf-8"))).map(x => x[1])
    }
    all() {
        this.fetchDataFromFile()
        return this.data
    }

    find(fn) {
        this.fetchDataFromFile()
        let res = {};
        for (const [key, val] of Object.entries(this.data)) {
            if (fn(val, key, this.data)) {
                res[key] = val
                break;
            } else continue
        }
        return res
    }

    filter(fn) {
        this.fetchDataFromFile()
        let res = {};
        for (const [key, val] of Object.entries(this.data)) {
            if (fn(val, key, this.data))
                res[key] = val
        }
        return res
    }
    filterKey(fn) {
        let res = {};
        for (const [key, val] of Object.entries(this.data)) {
            if (fn(key, val, this.data))
                res[key] = val
        }
        return res
    }

    findKey(fn) {
        let res = {};
        for (const [key, val] of Object.entries(this.data)) {
            if (fn(key, val, this.data)) {
                res[key] = val
                break;
            } else continue
        }
        return res
    }
}

module.exports = JSONDatabase;
