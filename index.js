var port = 3000
var express = require('express')
var path = require('path')
var app = express()
app.use(express.static(__dirname + '/public'))

app.get('/', function(req, res) {
    var options = {
        root: path.join(__dirname, "app/html")
    }
    res.sendFile('dashboard.html', options)
})

app.listen(port, () => { console.log("Running on port:", port) })