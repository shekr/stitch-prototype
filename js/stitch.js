/* TODO:
    * add in ability to read query params to input values so can 'save' preferred setup
    * update color pickers so can put in hex value directly and so displays hex
    * save to svg option
    */

var svgNs = "http://www.w3.org/2000/svg";
var defaultPrimaryColor = "#ffffff";
var defaultContrastColor = "#000000";
var defaultGridX = 4;
var defaultGridY = 4;
var rectSize = 10;
var fontSize = 10;
var axisHeight = fontSize;
var axisWidth = fontSize + 5;
var zoom = 4;
var outlineWidth = 1;
var viewBoxX;
var viewBoxY;
var defaultRepeatsX = 3;
var defaultRepeatsY = 1;

//Initial setup
var mouseDown = false;
document.addEventListener("mousedown", function() {
    if (!mouseDown)
        mouseDown = true;
})

document.addEventListener("mouseup", function() {
    if (mouseDown)
        mouseDown = false;
})

//colors

var inputPrimaryColor = document.getElementById('primary-color');
var inputContrastColor = document.getElementById('contrast-color');

inputPrimaryColor.value = defaultPrimaryColor;
inputContrastColor.value = defaultContrastColor;

inputPrimaryColor.addEventListener('change', function() { changeColorSet('primary-color') })
inputContrastColor.addEventListener('change', function() { changeColorSet('contrast-color') })

//grid size
var inputGridX = document.getElementById('grid-size-x');
var inputGridY = document.getElementById('grid-size-y');

inputGridX.value = defaultGridX;
inputGridY.value = defaultGridY;

//preview
var inputRepeatX = document.getElementById('repeats-x');
var inputRepeatY = document.getElementById('repeats-y');

inputRepeatX.value = defaultRepeatsX;
inputRepeatY.value = defaultRepeatsY;

//grid edit
var inputGridEditXNum = document.getElementById('grid-edit-x-num');
var inputGridEditYNum = document.getElementById('grid-edit-y-num');
var inputGridEditXSide = document.getElementById('grid-edit-x-side');
var inputGridEditYSide = document.getElementById('grid-edit-y-side');

inputGridEditXNum.value = 0;
inputGridEditYNum.value = -1;

var vis = document.getElementById('vis');
var preview = document.getElementById('vis-preview');

document.getElementById('preview-generator').addEventListener('click', function(e) {
    e.preventDefault();
    generatePreview();
    return false;
})

document.getElementById('grid-generator').addEventListener('click', function(e) {
    e.preventDefault();
    regenerateGridVis();
    return false;
})

document.getElementById('grid-editor').addEventListener('click', function(e) {
    e.preventDefault();
    updateGrid();
    return false;
})

// Make grid vis
generateGridVis();

/* Functions */
function changeColor(e, toggle = false) {
    var block = e.target;
    if (toggle) {
        var newClass = block.getAttribute('class') == 'primary-color' ? 'contrast-color' : 'primary-color';
        var newColor = block.getAttribute('class') == 'primary-color' ? inputContrastColor.value : inputPrimaryColor.value;
    } else {
        newClass = 'contrast-color';
        newColor = inputContrastColor.value;
    }
    block.setAttribute('class', newClass);
    e.target.setAttribute("fill", newColor);
}

function dragChangeColor(e) {
    if (mouseDown) {
        changeColor(e);
    }
}

function changeColorSet(which) {
    var blocks =  document.querySelectorAll('.'+ which);
    if (which.indexOf('primary') > -1)
        newColor = inputPrimaryColor.value;
    if (which.indexOf('contrast') > -1)
        newColor = inputContrastColor.value;
    blocks.forEach(function(elem) {
        elem.setAttribute('fill', newColor);
    })
}

function regenerateGridVis() {
    if (confirm('Regenerating the grid will delete all data')) {
        vis.innerHTML = '';
        generateGridVis();
    }
}

function generateGridVis() {
    var newGrid = createGrid(inputGridY.value, inputGridX.value);
    var axes = createAxes(inputGridY.value, inputGridX.value)
    vis.appendChild(newGrid);
    vis.appendChild(axes); //add last to make them bottom in z-index
    setSVGAttrs(vis, inputGridY.value, inputGridX.value,);
}

// params - element source of data to copy, element target to copy to, starting block in element target
// expecting grids of shape <g><rect /><rect />...</g>
function copyGridData(gridSource, gridTarget, targetStartIndex) {
    var sourceRows = countGridProp(gridSource, 'x');
    var targetRows = countGridProp(gridTarget, 'x');
    var rowOffset = targetRows - sourceRows;
    var currRow = 0;

    if (rowOffset < 0 ) {
        var i = Math.abs(rowOffset);
        while (i < gridSource.children.length) {
            if (i % sourceRows == 0 ) {
                currRow++;
                console.log('newRow!')
                // skip the offset for that row
                i += Math.abs(rowOffset);
            } else {
                var dataChild = gridSource.children[i];
                var targetChild = gridTarget.children[targetStartIndex + i + rowOffset*currRow];
                if (targetChild) {
                    targetChild.setAttribute('fill', dataChild.getAttribute('fill'));
                    targetChild.setAttribute('class', dataChild.getAttribute('class'));
                } else {
                    return; //stop when source is larger than target
                }
                i++;
            }

        }
    } else {
        //we are adding rows
        for (var i = 0; i < gridSource.children.length; i++) {
            if ( i !== 0 && i % sourceRows == 0) {
                currRow++;
            }
            var dataChild = gridSource.children[i];
            var targetChild = gridTarget.children[targetStartIndex + i + rowOffset*currRow];
            if (targetChild) {
                targetChild.setAttribute('fill', dataChild.getAttribute('fill'));
                targetChild.setAttribute('class', dataChild.getAttribute('class'));
            } else {
                return; //stop when source is larger than target
            }
        }
    }
}

function countGridProp(grid, which) {
    if (grid.children.length == 0)
        return 0;
    var exampleVal = grid.children[0].getAttribute(which);
    var propCount = 0;
    for (var i = 0; i < grid.children.length; i++) {
        if ((grid.children[i]).getAttribute(which) == exampleVal)
            propCount++;
    }
    return propCount;
}

// creates and returns a grid
function createGrid(rows, cols) {
    var gridG = document.createElementNS(svgNs, 'g');
    gridG.setAttribute('id', 'vis-rectangles')
    for (var i = 0; i < cols ; i++) {
        for (var j = 0; j < rows; j++) {
            //calc placement
            var xLoc = i * rectSize;
            var yLoc = j * rectSize;

            //rectangles
            var rect = createNewRect(rectSize, xLoc, yLoc);
            gridG.appendChild(rect);
        }
    }
    return gridG;
}

//creates and returns labeled grid axes
function createAxes(rows, cols) {
    var axes = document.createElementNS(svgNs, 'g');
    axes.setAttribute('id', 'vis-axes')
    
    //y-axis - rows
    for (var i = 0; i < rows; i++) {
        //calc placement
        var xLoc = 0; //constant
        var yLoc = i * rectSize;
        var label = document.createElementNS(svgNs, "text")
        var labelNum = rows - i;
        label.innerHTML = labelNum;
        var xTextAdditional = calcDigitPadding(labelNum);
        label.setAttribute('class', 'label');
        label.setAttribute('x', xLoc + xTextAdditional);
        label.setAttribute('y', yLoc + fontSize + outlineWidth);
        axes.appendChild(label);
    }

    //x-axis - cols
    for (var i = 0; i < cols ; i++) {
        //calc placement
        var xLoc = i * rectSize;
        var yLoc = (rows - 1) * rectSize; //constant
        var label = document.createElementNS(svgNs, "text")
        var labelNum = cols - i;
        label.innerHTML = labelNum;
        label.setAttribute('class', 'label');
        var xTextAdditional = calcDigitPadding(labelNum);
        label.setAttribute('x', xLoc + axisWidth + xTextAdditional);
        label.setAttribute('y', yLoc + fontSize + axisHeight);
        axes.appendChild(label);
    }
    return axes;
}

//sets the viewbox, height, and width of the svg based on current sizing
function setSVGAttrs(svgTarget, rows, cols) {
    viewBoxX = cols * rectSize + axisWidth + outlineWidth;
    viewBoxY = rows * rectSize + axisHeight + outlineWidth;
    svgTarget.setAttribute('viewBox', '0 0 ' + viewBoxX + ' ' + viewBoxY);
    svgTarget.setAttribute('width', cols * rectSize * zoom);
    svgTarget.setAttribute('height', rows * rectSize * zoom);
}

//creates and returns a new grid rectangle
function createNewRect(rectSize, xLoc, yLoc) {
    var rect = document.createElementNS(svgNs, "rect")
    rect.setAttribute("width", rectSize);
    rect.setAttribute("height", rectSize);
    rect.setAttribute('class', 'primary-color')
    rect.setAttribute('fill', inputPrimaryColor.value);
    rect.addEventListener("mousedown", function(e) {
        if (e.buttons == 1) //only respond to primary button
            changeColor(e, true)
    });
    rect.addEventListener("mouseover", function(e) {
        if (e.buttons == 1) //only respond to primary button
            dragChangeColor(e);
    });
    rect.setAttribute('x', xLoc + axisWidth);
    rect.setAttribute('y', yLoc + outlineWidth);
    return rect;
}

function calcDigitPadding(num) {
    var digits = Math.floor(num/10) + 1;
    var digitSize = fontSize/3;
    var noPadding = 2;
    return xTextAdditional = digits < noPadding ? (noPadding - digits) * digitSize : 0;
}

function generatePreview() {
    //remove any old preview first
    preview.innerHTML = '';

    var pattern = document.querySelectorAll('#vis rect');
    preview.setAttribute('width', inputRepeatX.value * viewBoxX);
    preview.setAttribute('height', inputRepeatY.value * viewBoxY);
    for (var i = 0; i < inputRepeatX.value; i++) {
        for (var j = 0; j < inputRepeatY.value; j++) {
            var grouper = document.createElementNS(svgNs, "g");
            grouper.setAttribute('class', 'pattern')
            grouper.setAttribute("transform", "translate(" + i * rectSize * inputGridX.value + "," + j * rectSize * inputGridY.value + ")");
            pattern.forEach(function(elem) {
                var cloneNode = elem.cloneNode();
                grouper.appendChild(cloneNode);
            })
            preview.appendChild(grouper);
        }
    }
}

function updateGrid() {
    if (Math.abs(inputGridEditYNum.value) > inputGridY.value ) {
        alert('You cannot have negative rows in your grid!')
        return;
    }
    if (inputGridEditXNum.value !== 0 || inputGridEditYNum.value !== 0) {
        var newRows = parseInt(inputGridY.value) + parseInt(inputGridEditYNum.value);
        var newCols = parseInt(inputGridX.value) + parseInt(inputGridEditXNum.value);
        var newGrid = createGrid(newRows, newCols);
        inputGridY.value = newRows;
        inputGridX.value = newCols;

        copyGridData(document.getElementById('vis-rectangles'), newGrid, parseInt(inputGridEditYNum.value));
    }
    var axes = createAxes(newRows, newCols)
    vis.innerHTML = '';
    vis.appendChild(newGrid);
    vis.appendChild(axes); //add last to make them bottom in z-index
    setSVGAttrs(vis, newRows, newCols);
}