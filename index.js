var port = process.env.PORT || 3000
var express = require('express')
var path = require('path')
var app = express()
app.use(express.static(__dirname + '/app'))

app.get('/', function(req, res) {
    var options = {
        root: path.join(__dirname, "app")
    }
    res.sendFile('dashboard.html', options)
})

app.listen(port, () => { console.log("Running on port:", port) })