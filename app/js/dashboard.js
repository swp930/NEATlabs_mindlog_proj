// set the dimensions and margins of the graph
var margin = {
        top: 10,
        right: 30,
        bottom: 30,
        left: 40
    },
    width = 460 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

// append the svg object to the body of the page
var svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

// Read the data and compute summary statistics for each specie
d3.csv("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/iris.csv", function(data) {
    //constructFromData(data)
})

function constructFromData(data) {
    console.log(data)

    var bottomDomain = Number.MAX_SAFE_INTEGER
    var upperDomain = Number.MIN_SAFE_INTEGER
        // Compute quartiles, median, inter quantile range min and max --> these info are then used to draw the box.
    var sumstat = d3.nest() // nest function allows to group the calculation per level of a factor
        .key(function(d) {
            // Data specific, would change this to Mean-0 or Mean-1, can have it be meanType, how data is sampled
            //return d.Species;
            console.log(d.DataType)
            return d.DataType
        })
        .rollup(function(d) {
            console.log(d)
            q1 = d[0].Mean - d[0].STD
            median = d[0].Mean
            q3 = d[0].Mean + d[0].STD
            interQuantileRange = q3 - q1
            min = q1 - 1.5 * interQuantileRange
            max = q3 + 1.5 * interQuantileRange
            bottomDomain = Math.min(bottomDomain, min)
            upperDomain = Math.max(upperDomain, max)
            return ({
                q1: q1,
                median: median,
                q3: q3,
                interQuantileRange: interQuantileRange,
                min: min,
                max: max
            })
        })
        .entries(data)

    // Show the X scale
    var x = d3.scaleBand()
        .range([0, width])
        .domain(["Mean-0", "Mean-1"])
        .paddingInner(1)
        .paddingOuter(.5)
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))

    // Show the Y scale
    var y = d3.scaleLinear()
        .domain([bottomDomain - 1, upperDomain + 1])
        .range([height, 0])
    svg.append("g").call(d3.axisLeft(y))

    // Show the main vertical line
    svg
        .selectAll("vertLines")
        .data(sumstat)
        .enter()
        .append("line")
        .attr("x1", function(d) {
            return (x(d.key))
        })
        .attr("x2", function(d) {
            return (x(d.key))
        })
        .attr("y1", function(d) {
            return (y(d.value.min))
        })
        .attr("y2", function(d) {
            return (y(d.value.max))
        })
        .attr("stroke", "black")
        .style("width", 40)

    // rectangle for the main box
    var boxWidth = 100
    svg
        .selectAll("boxes")
        .data(sumstat)
        .enter()
        .append("rect")
        .attr("x", function(d) {
            return (x(d.key) - boxWidth / 2)
        })
        .attr("y", function(d) {
            return (y(d.value.q3))
        })
        .attr("height", function(d) {
            return (y(d.value.q1) - y(d.value.q3))
        })
        .attr("width", boxWidth)
        .attr("stroke", "black")
        .style("fill", "#69b3a2")

    // Show the median
    svg
        .selectAll("medianLines")
        .data(sumstat)
        .enter()
        .append("line")
        .attr("x1", function(d) {
            return (x(d.key) - boxWidth / 2)
        })
        .attr("x2", function(d) {
            return (x(d.key) + boxWidth / 2)
        })
        .attr("y1", function(d) {
            return (y(d.value.median))
        })
        .attr("y2", function(d) {
            return (y(d.value.median))
        })
        .attr("stroke", "black")
        .style("width", 80)
}



var uploadForm = document.getElementById("upload_file_form")
uploadForm.addEventListener('submit', e => {
    e.preventDefault()
    var files = document.getElementById('uploaded_file').files;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        let file = files[i]

        formData.append('uploaded_file', file)
    }
    var url = '/stats'
    fetch(url, {
        method: 'POST',
        body: formData,
    }).then(response => {
        var reader = response.body.getReader()
        reader.read().then(function processText({ done, value }) {
            var string = new TextDecoder("utf-8").decode(value);
            var resp = JSON.parse(string)
            console.log(resp)
            var xhr = new XMLHttpRequest();
            var url = "/getDataFromSheet?path=" + resp.path
            xhr.open("GET", url, true);
            xhr.onreadystatechange = function() { // Call a function when the state changes.
                if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                    var response = JSON.parse(xhr.response)
                    var meanZero = response.data["Week 1 Mean-0"][0]
                    var meanOne = response.data["Week 1 Mean-1"][0]
                    var stdZero = response.data["Week 1 STD-0"][0]
                    var stdOne = response.data["Week 1 STD-1"][0]
                    var dataOut = []
                    dataOut.push({ "Mean": meanZero, "STD": stdZero, "DataType": "Mean-0" })
                    dataOut.push({ "Mean": meanOne, "STD": stdOne, "DataType": "Mean-1" })
                    console.log(dataOut)
                    constructFromData(dataOut)
                }
            }
            xhr.send();
        })
    })
})