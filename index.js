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
        cb(null, file.originalname);
    }
});
var upload = multer({ storage: storage });

/**
 * Given a path to the excel file on the server extract the data for the Means, STD and Whitney values 
 * @param {*} path 
 */
function extractDataFromExcel(path) {
    var buf = fs.readFileSync(path);

    // Create excel workbook
    var wb = XLSX.read(buf, { type: 'buffer' });

    // List of weeks to read from 
    var weeks = ["1", "2", "3", "4"]
    console.log(wb.Sheets.weekly_summary['!ref'])
    var varNames = wb.Sheets.weekly_summary['!ref'].split(':')
    var startingVarInd = parseInt(varNames[0].split('A')[1])
    var endingVarInd = parseInt(varNames[1].split('AL')[1])
    var varNameValues = []

    // Extract list of variable names
    for (var i = startingVarInd + 1; i <= endingVarInd; i++) {
        var key = 'A' + i
        console.log(key)
        varNameValues.push(wb.Sheets.weekly_summary[key].v)
    }
    console.log(varNameValues)
    console.log(startingVarInd, endingVarInd)
    var validBoxes = Object.keys(wb.Sheets.weekly_summary)
    var headers = {}

    // Create a dictionary of available headers
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

    // Create a dictionary mapping headers to the values from the Excel sheet
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
    var data = {}
    for (var i = 0; i < validHeaders.length; i++) {
        var currHead = headersToBox[validHeaders[i]]
        var regex = /([\A-Za-z]*)[\d]*/
        var tmp = currHead.match(regex)
        if (tmp[1]) {
            var alpha = tmp[1]
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

    var body = {
        "data": data,
        "variableNames": varNameValues
    }
    return body
}

app.use(express.static(__dirname + '/app'))

/**
 * Route for dashboard.html
 */
app.get('/', function(req, res) {
    var options = {
        root: path.join(__dirname, "app")
    }
    res.sendFile('dashboard.html', options)
})

app.post('/stats', upload.single('uploaded_file'), function(req, res) {
    // req.file is the name of your file in the form above, here 'uploaded_file'
    // req.body will hold the text fields, if there were any 
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

/**
 * Extracts data from given sheet name 
 */
app.get('/getSheetData', function(req, res) {
    var fileName = req.query.fileName
    var path_string = "./app/uploads/" + fileName
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