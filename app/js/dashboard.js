// set the dimensions and margins of the graph
var margin = {
        top: 10,
        right: 30,
        bottom: 30,
        left: 40
    },
    width = 340 - margin.left - margin.right,
    height = 300 - margin.top - margin.bottom;

// append the svg object to the body of the page

getSheets()

var sheets

function getSheets() {
    var xhr = new XMLHttpRequest();
    var url = "/getSheets"
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() { // Call a function when the state changes.
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            var response = JSON.parse(xhr.response)
            sheets = response.files
                //submitSheet(sheets[0])
        }
    }
    xhr.send();
}

function handleLogIn() {
    var useridElem = document.getElementById("userid")
    var userid = useridElem.value
    var passwordElem = document.getElementById("userpassword")
    var password = passwordElem.value
    var loginElem = document.getElementById("loginbutton")
    var logoutElem = document.getElementById("logoutbutton")
    var h3Elem = document.getElementById("currentSheet")
    var fileToGet = userid + '.xlsx'
    var fileFound = false
    for (var i = 0; i < sheets.length; i++) {
        if (sheets[i] === fileToGet) {
            fileFound = true
            break
        }
    }
    if (!fileFound)
        alert("Cannot find user")
    else {
        h3Elem.innerHTML = userid
        useridElem.style.display = "none"
        passwordElem.style.display = "none"
        loginElem.style.display = "none"
        logoutElem.style.display = "inline-block"
        submitSheet(fileToGet)
    }

}

function handleLogOut() {
    var useridElem = document.getElementById("userid")
    var passwordElem = document.getElementById("userpassword")
    var loginElem = document.getElementById("loginbutton")
    var logoutElem = document.getElementById("logoutbutton")
    var varElem = document.getElementById("variables_container")
    var h3Elem = document.getElementById("currentSheet")
    useridElem.value = ""
    useridElem.style.display = "inline-block"
    passwordElem.value = ""
    passwordElem.style.display = "inline-block"
    loginElem.style.display = "inline-block"
    logoutElem.style.display = "none"
    varElem.innerHTML = ""
    h3Elem.innerHTML = ""
}

/** Variables to ignore */
var ignoreVariables = ["noise", "distracted", "Speed"]

/**
 * Retrieves a given sheet and creates graphs for it.
 * @param {string} sheetName: Excel sheet name on server to visualize
 */
function submitSheet(sheetName) {
    var xhr = new XMLHttpRequest();
    var url = "/getSheetData?fileName=" + sheetName
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() { // Call a function when the state changes.
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            var response = JSON.parse(xhr.response)
            if (response.error) {
                alert("File not found")
            } else {
                totalData = response.data

                var variablesContainer = document.getElementById("variables_container")
                for (var j = 0; j < response.variableNames.length; j++) {
                    if (isVariableToIgnore(response.variableNames[j], ignoreVariables)) {
                        console.log("Ignore this var")
                    } else {
                        var varNum = j
                        var weeksContainerId = "weeks_container_" + varNum
                        var weeksContainer = document.createElement('div')
                        weeksContainer.style.display = "flex"
                        weeksContainer.id = weeksContainerId
                        variablesContainer.appendChild(weeksContainer)
                        for (var i = 1; i <= 4; i++) {
                            var weekNum = i
                            var weekId = "week_" + weekNum + "_" + response.variableNames[varNum]
                            var weekVar = document.createElement("div")
                            weekVar.id = weekId
                            weeksContainer.appendChild(weekVar)
                        }

                        createGraphsForVariable(response.data, j, response.variableNames)
                    }
                }
            }
        }
    }
    xhr.send();
}

function isVariableToIgnore(varName, ignoreList) {
    for (var i = 0; i < ignoreList.length; i++) {
        if (ignoreList[i] === varName)
            return true
    }
    return false
}

function constructFromData(data, week, graphBottom, graphTop, graphTitle) {
    document.getElementById(week).innerHTML = ""
    var svg = d3.select("#" + week)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    var bottomDomain = Number.MAX_SAFE_INTEGER
    var upperDomain = Number.MIN_SAFE_INTEGER
        // Compute quartiles, median, inter quantile range min and max --> these info are then used to draw the box.
    var sumstat = d3.nest() // nest function allows to group the calculation per level of a factor
        .key(function(d) {
            // Data specific, would change this to Mean-0 or Mean-1, can have it be meanType, how data is sampled
            //return d.Species;
            return d.DataType
        })
        .rollup(function(d) {
            q1 = d[0].Mean - d[0].STD
            median = d[0].Mean
            q3 = d[0].Mean + d[0].STD
            interQuantileRange = q3 - q1
            var dist = graphTop - graphBottom
            min = graphBottom + (dist * 0.05)
            max = graphTop - (dist * 0.05)
            bottomDomain = Math.min(bottomDomain, min)
            upperDomain = Math.max(upperDomain, max)
            return ({
                q1: q1,
                median: median,
                q3: q3,
                interQuantileRange: interQuantileRange,
                min: min,
                max: max,
                whitney: d[0].Whitney
            })
        })
        .entries(data)

    // Show the X scale
    var x = d3.scaleBand()
        .range([0, width])
        .domain(["High Mental Wellbeing", "Low Mental Wellbeing"])
        .paddingInner(1)
        .paddingOuter(.5)
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))

    // Show the Y scale
    var y = d3.scaleLinear()
        .domain([graphBottom - 1, graphTop + 1])
        .range([height, 0])
    svg.append("g").call(d3.axisLeft(y))

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
        .attr("stroke-width", "2px")
        .style("fill", function(d) {
            if (d.key === "High Mental Wellbeing")
                return "#1b5e20"
            else
                return "#b71c1c"
        })

    // add a title
    svg.append("text")
        .attr("x", (width / 2))
        .attr("y", 0 + (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text(graphTitle);

    var whitneyData = []
    if (sumstat.length > 0)
        whitneyData.push(sumstat[0])
    var meanBottom1, meanBottom2, meanTop1, meanTop2
    var similarBottom, similarTop
    var similarMeans
    console.log(data)
    /*0:
        DataType: "High Mental Wellbeing"
        Mean: 1369
        STD: 2898.186656325289
        Whitney: 0.2029324797341356
    1:
        DataType: "Low Mental Wellbeing"
        Mean: 384
        STD: 265.5811238272279
        Whitney: 0.2029324797341356*/
    if(data.length == 2) {
        if(data[0].Mean != null && data[0].STD != null) {
            meanBottom1 = data[0].Mean - data[0].STD
            meanTop1 = data[0].Mean + data[0].STD
        }
        if(data[1].Mean != null && data[1].STD != null) {
            meanBottom2 = data[1].Mean - data[1].STD
            meanTop2 = data[1].Mean + data[1].STD
        }
        
        similarBottom = Math.abs((meanBottom1 - meanBottom2)/(Math.max(meanBottom1, meanBottom2, 0.01))) < 0.05
        similarTop = Math.abs((meanTop1 - meanTop2)/Math.max(meanTop1, meanTop2, 0.01)) < 0.05
        similarMeans = Math.abs((data[0].Mean - data[1].Mean)/Math.max(data[0].Mean, data[1].Mean, 0.01)) < 0.05
    }
    
    if (data[0].Whitney <= 0.05 && !(similarBottom || similarTop || similarMeans)) {
        // Rectange for whitney check
        svg
            .selectAll()
            .data(whitneyData)
            .enter()
            .append("rect")
            .attr("x", 12)
            .attr("y", 12)
            .attr("height", 240)
            .attr("width", 248)
            .attr("stroke", "#03a9f4")
            .attr("stroke-width", "2px")
            .style("fill", "none")
    } else {
        svg
            .selectAll()
            .data(whitneyData)
            .enter()
            .append("rect")
            .attr("x", 12)
            .attr("y", 12)
            .attr("height", 240)
            .attr("width", 248)
            .attr("stroke-width", "2px")
            .style("fill", "rgba(33,33,33, 0.9)")
    }

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

var totalData

function createGraphsForVariable(dataFromExcel, varIndex, variableNames) {
    var boundaryBottom = Number.MAX_SAFE_INTEGER,
        boundaryTop = Number.MIN_SAFE_INTEGER
    for (var j = 1; j <= 4; j++) {
        var meanHeaderZero = "Week " + j + " Mean-0"
        var meanHeaderOne = "Week " + j + " Mean-1"
        var stdHeaderZero = "Week " + j + " STD-0"
        var stdHeaderOne = "Week " + j + " STD-1"
        var stdZero, stdOne, meanZero, meanOne
        if (dataFromExcel[meanHeaderZero] != null)
            meanZero = dataFromExcel[meanHeaderZero][varIndex]
        if (dataFromExcel[meanHeaderOne] != null)
            meanOne = dataFromExcel[meanHeaderOne][varIndex]
        if (dataFromExcel[stdHeaderZero] != null)
            stdZero = dataFromExcel[stdHeaderZero][varIndex]
        if (dataFromExcel[stdHeaderOne] != null)
            stdOne = dataFromExcel[stdHeaderOne][varIndex]
        if (meanZero != null && stdZero != null) {
            var tmpMin = meanZero - 1.5 * stdZero
            var tmpMax = meanZero + 1.5 * stdZero
            boundaryBottom = Math.min(tmpMin, boundaryBottom)
            boundaryTop = Math.max(tmpMax, boundaryTop)
        }
        if (meanOne != null && stdOne != null) {
            var tmpMin = meanOne - 1.5 * stdOne
            var tmpMax = meanOne + 1.5 * stdOne
            boundaryBottom = Math.min(tmpMin, boundaryBottom)
            boundaryTop = Math.max(tmpMax, boundaryTop)
        }
    }

    for (var i = 1; i <= 4; i++) {
        var meanHeaderZero = "Week " + i + " Mean-0"
        var meanHeaderOne = "Week " + i + " Mean-1"
        var stdHeaderZero = "Week " + i + " STD-0"
        var stdHeaderOne = "Week " + i + " STD-1"
        var whitneyHeader = "Week " + i + " Whitney U"
        var stdZero, stdOne, meanZero, meanOne, whitney
        if (dataFromExcel[meanHeaderZero] != null)
            meanZero = dataFromExcel[meanHeaderZero][varIndex]
        if (dataFromExcel[meanHeaderOne] != null)
            meanOne = dataFromExcel[meanHeaderOne][varIndex]
        if (dataFromExcel[stdHeaderZero] != null)
            stdZero = dataFromExcel[stdHeaderZero][varIndex]
        if (dataFromExcel[stdHeaderOne] != null)
            stdOne = dataFromExcel[stdHeaderOne][varIndex]
        if (dataFromExcel[whitneyHeader] != null)
            whitney = dataFromExcel[whitneyHeader][varIndex]
        var dataOut = []
        if (meanZero != null && stdZero != null)
            dataOut.push({ "Mean": meanZero, "STD": stdZero, "DataType": "High Mental Wellbeing", "Whitney": whitney })
        else if (meanZero != null)
            dataOut.push({ "Mean": meanZero, "STD": 0, "DataType": "High Mental Wellbeing", "Whitney": whitney })
        if (meanOne != null && stdOne != null)
            dataOut.push({ "Mean": meanOne, "STD": stdOne, "DataType": "Low Mental Wellbeing", "Whitney": whitney })
        else if (meanOne != null)
            dataOut.push({ "Mean": meanOne, "STD": 0, "DataType": "Low Mental Wellbeing", "Whitney": whitney })
        var graphTitle = constructTitle(i, variableNames[varIndex])
        constructFromData(dataOut, "week_" + i + "_" + variableNames[varIndex], boundaryBottom, boundaryTop, graphTitle)
    }
}

/**
 * Create title given week number and variable name
 * @param {*} weekNum: Week number of graph
 * @param {*} varName: Variable name
 */
function constructTitle(weekNum, varName) {
    var weekPart = "" + weekNum
    var varPart = varName

    var weeks = {
        1: "Week 1",
        2: "Week 1-2",
        3: "Week 1-3",
        4: "Week 1-4"
    }

    if (weeks[weekNum])
        weekPart = weeks[weekNum]

    var variables = {
        "cumm_step_count": "Past Half Day Step Count",
        "cumm_step_distance": "Past Half Day Step Distance",
        "cumm_step_calorie": "Past Half Day Step Calories",
        "ppg_std": "Heart Rate Variability (HRV)",
        "MeanBreathingTime": "Mean Breathing Time",
        "cumm_step_speed": "Past Half Day Step Speed",
        "time_of_day": "Time of Day",
        "prev_night_sleep": "Previous Night's Sleep",
        "Consistency": "Breathing Consistency",
        "past_day_fats": "Past Day Fats",
        "past_day_sugars": "Past Day Sugars",
        "heart_rate": "Heart Rate",
        "exercise_duration": "Past Day Exercise Duration",
        "exercise_calorie": "Past Day Exercise Calories",
        "past_day_caffeine": "Past Day Caffeine"
    }

    if (variables[varName])
        varPart = variables[varName]

    return weekPart + " " + varPart
}

function handleChange(event) {
    var selectedIndex = event.srcElement.options.selectedIndex
    createGraphsForVariable(totalData, selectedIndex)
}