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

function extractDataFromExcel(path) {
    //var buf = fs.readFileSync("app/uploads/ucsd12.xlsx");
    var buf = fs.readFileSync(path);
    var wb = XLSX.read(buf, { type: 'buffer' });

    var weeks = ["1", "2", "3", "4"]
    var validBoxes = Object.keys(wb.Sheets.weekly_summary)
    var headers = {}
    for (var i = 0; i < weeks.length; i++) {
        var weekNum = weeks[i]
        var header1 = "Week " + weekNum + " Mean-0"
        var header2 = "Week " + weekNum + " Mean-1"
        var header3 = "Week " + weekNum + " STD-0"
        var header4 = "Week " + weekNum + " STD-1"
        var header5 = "Week " + weekNum + " Whitney U"
        headers[header1] = true
        headers[header2] = true
        headers[header3] = true
        headers[header4] = true
        headers[header5] = true
    }
    var headersToBox = {}
    for (var i = 0; i < validBoxes.length; i++) {
        var x = validBoxes[i]
        var regex = /[\A-Za-z]*([\d]*)/
        var tmp = x.match(regex)
        if (tmp[1]) {
            if (tmp[1] === "1") {
                if (wb.Sheets.weekly_summary[x]) {
                    if (wb.Sheets.weekly_summary[x].v) {
                        var headerName = wb.Sheets.weekly_summary[x].v
                        if (headers[headerName]) {
                            headersToBox[headerName] = x
                        }
                    }
                }
            }
        }
    }
    var validHeaders = Object.keys(headersToBox)
    console.log(validHeaders)
    console.log(headersToBox)
    var data = {}
    for (var i = 0; i < validHeaders.length; i++) {
        var currHead = headersToBox[validHeaders[i]]
        console.log(currHead)
        var regex = /([\A-Za-z]*)[\d]*/
        var tmp = currHead.match(regex)
        if (tmp[1]) {
            var alpha = tmp[1]
            console.log(alpha)
            data[validHeaders[i]] = []
            for (var j = 2; j <= 26; j++) {
                var boxName = alpha + j
                if (wb.Sheets.weekly_summary[boxName]) {
                    var dataVal = wb.Sheets.weekly_summary[boxName].v
                    data[validHeaders[i]].push(dataVal)
                }
            }
        }
    }
    console.log(data)

    var variableNames = [
        "prev_night_sleep", "ppg_std", "cumm_step_distance", "cumm_step_speed", "curr_step_speed", "cumm_step_calorie", "fats",
        "cumm_step_count", "heart_rate", "MeanBreathingTime", "Consistency", "sugars", "past_day_fats", "time_of_day",
        "exercise_calorie", "curr_step_count", "exercise_duration", "past_day_sugars", "curr_step_calorie", "curr_step_distance",
        "past_day_caffeine", "caffeine", "noise", "distracted", "Speed"
    ]
    var body = {
        "data": data,
        "variableNames": variableNames
    }
    return body
}

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
    res.send({
        "completed": true,
        "path": req.file.path
    })
});

app.get('/getDataFromSheet', function(req, res) {
    var path = req.query.path
    if (path) {
        res.send(extractDataFromExcel(path))
    } else {
        res.send({})
    }
})

app.get('/getSheetData', function(req, res) {
    var fileName = req.query.fileName
    var path_string = "./app/uploads/" + fileName
    console.log(path_string)
    if (fs.existsSync(path_string)) {
        if (fs.lstatSync(path_string).isFile())
            res.send(extractDataFromExcel(path_string))
    } else {
        res.send({ "error": "file not found" })
    }
})

app.get('/getSheets', function(req, res) {
    var dirName = './app/uploads'
    fs.readdir(dirName, (err, files) => {
        res.send({ "files": files })
    });

})

app.listen(port, () => { console.log("Running on port:", port) })