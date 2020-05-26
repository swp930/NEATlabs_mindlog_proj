var port = process.env.PORT || 3000
var express = require('express')
var path = require('path')
var app = express()
var multer = require('multer')
var XLSX = require('xlsx')
var request = require('request')
var fs = require('fs')

var storage = multer.diskStorage({
    destination: './app/uploads/',
    filename: function(req, file, cb) {
        //req.body is empty...
        //How could I get the new_file_name property sent from client here?
        //cb(null, file.originalname + '-' + Date.now());
        cb(null, file.originalname);
    }
});
var upload = multer({ storage: storage });

var buf = fs.readFileSync("app/uploads/ucsd12.xlsx");
var wb = XLSX.read(buf, { type: 'buffer' });
var headersMean = Object.keys(wb.Sheets.weekly_summary).filter(x => {
    var regex = /[\A-Za-z]*([\d]*)/
    var tmp = x.match(regex)
    if (tmp[1]) {
        if (tmp[1] === "1") {
            if (wb.Sheets.weekly_summary[x]) {
                if (wb.Sheets.weekly_summary[x].v) {
                    return wb.Sheets.weekly_summary[x].v.indexOf("Mean") >= 0
                }
            }
        }
    }
    return false
})
var headersStd = Object.keys(wb.Sheets.weekly_summary).filter(x => {
    var regex = /[\A-Za-z]*([\d]*)/
    var tmp = x.match(regex)
    if (tmp[1]) {
        if (tmp[1] === "1") {
            if (wb.Sheets.weekly_summary[x]) {
                if (wb.Sheets.weekly_summary[x].v) {
                    return wb.Sheets.weekly_summary[x].v.indexOf("STD") >= 0
                }
            }
        }
    }
    return false
})
console.log(headersMean)
console.log(headersStd)

app.use(express.static(__dirname + '/app'))

app.get('/', function(req, res) {
    var options = {
        root: path.join(__dirname, "app")
    }
    res.sendFile('dashboard.html', options)
})

app.post('/stats', upload.single('uploaded_file'), function(req, res) {
    // req.file is the name of your file in the form above, here 'uploaded_file'
    // req.body will hold the text fields, if there were any 
    console.log(req.file, req.body)
    res.send({ "completed": true })
});

app.listen(port, () => { console.log("Running on port:", port) })