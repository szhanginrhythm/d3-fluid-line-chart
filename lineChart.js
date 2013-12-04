app.directive('lineChart', ['$timeout', '$log', function($timeout, $log) {
	return {
		restrict: 'E',
		scope: {
			data: '=',
			size: '='
		},
		link: function (scope, item, attrs) {
			//if item already has child, means svg has already appended.
			//don't do anything in that case.
			if (angular.element(item).children().length) {
				return;
			}
			
			var curAlloc,
			    prevYear,
			    curYear,
			    //max and min of enrollment and attendance data.
			    max,
			    min,
			    maxIdx,
			    minIdx,
			    //dataSpan is max-min, we might use that couple times to broaden span
			    //made by maxYcoordinate and minYcoordinate
			    dataSpan,
			    //span of maxYCoordinate and minYCoordinate should be greater than
			    //span of max and min, since we want Y coordinate to be longer
			    //also needs to include allocation, which could be outside of [min, max]
			    maxYCoordinate,
			    minYCoordinate,
			    enrollments,
			    attendance;

			enrollments = scope.data.enrollments;
			attendance = scope.data.attendance;
			max = scope.data.max;
			min = scope.data.min;
			maxIdx = scope.data.maxIdx;
			minIdx = scope.data.minIdx;
			curAlloc = scope.data.allocation;
			prevYear = scope.data.prevYear;
			curYear = scope.data.curYear;

			dataSpan = max - min;
			//extend Y axis anyway since we want Y axis to be broader than max and min.
			maxYCoordinate = max + dataSpan;
			minYCoordinate = min - dataSpan;
			//extend the y axis if current allocation is out of the current span
			while (curAlloc < minYCoordinate || curAlloc > maxYCoordinate) {
			    maxYCoordinate += dataSpan;
			    minYCoordinate -= dataSpan;
			}

			var margin = {
					top: scope.size.top,
					right: scope.size.right,
					bottom: scope.size.bottom,
					left: scope.size.left
				},
			    width = scope.size.width,
			    height = scope.size.height,
			    dateFormat = d3.time.format('%b');

			var x = d3.time.scale()
			    .domain([new Date(prevYear, 07), new Date(curYear, 05)])
			    .rangeRound([0, width - margin.left - margin.right]);

			var y = d3.scale.linear()
			    .domain([minYCoordinate, maxYCoordinate])
			    .range([height - margin.top - margin.bottom, 0]);

			var xAxis = d3.svg.axis()
			    .scale(x)
			    .orient('bottom')
			    .ticks(d3.time.months)
			    .tickFormat(dateFormat)
			    .tickSize(20)
			    .tickPadding(10);

			var yAxis = d3.svg.axis()
			    .scale(y)
			    .ticks(6)
			    .orient('left')
			    .tickSize(20)
			    .tickPadding(8);

			var svg = d3.select(item[0]).append('svg')
			    .attr('class', 'chart')
			    // .attr('width', width)
			    // .attr('height', height)
			    // use viewBox and preserveAspectRatio to make the svg more fluid.
			    .attr('viewBox', '0 0 ' + width + ' ' + height)
				.attr('preserveAspectRatio', 'xMinYMin')
			    .append('g')
			    .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

			svg.append('g')
			    .attr('class', 'x axis')
			    .attr('transform', 'translate(0, ' + (height - margin.top - margin.bottom) + ')')
			    .call(xAxis);
			    // .selectAll('.tick text')
			    // .style('text-anchor', 'start')
			    // .attr('x', 0);

			svg.append('g')
			  .attr('class', 'y axis')
			  .call(yAxis);

			// verticle lines
			svg.selectAll("line.x")
			  .data(x.ticks(10))
			  .enter().append("line")
			  .attr("class", "x")
			  .attr("x1", x)
			  .attr("x2", x)
			  .attr("y1", 0)
			  .attr("y2", height-margin.bottom-margin.top)
			  .style("stroke", "#ccc")
			  .style("stroke-dasharray", ("3","3"));

			// horizontal lines
			svg.selectAll("line.y")
			  .data(y.ticks(6))
			  .enter().append("line")
			  .attr("class", "x")
			  .attr("x1", 0)
			  .attr("x2", width-margin.left-margin.right)
			  .attr("y1", y)
			  .attr("y2", y)
			  .style("stroke", "#ccc");

			 // //Draw current allocation line
			 svg.append("line")
			    .attr("x1", 0)
			    .attr("y1", y(curAlloc))
			    .attr("x2", width-margin.left-margin.right)
			    .attr("y2", y(curAlloc))
			    .attr("stroke-width", 1.5)
			    .attr("stroke", "purple");

			var line = d3.svg.line()
			    .x(function(d) { 
			        return x(d.date); 
			    })
			    .y(function(d) { 
			        return y(d.value); 
			    });

			//draw enrollments line.
			svg.append("path")
			    .attr("d", line(enrollments))
			    .attr("stroke-width", 1.5)
			    .attr("stroke", "purple")
			    // make sure have this to avoid the shadow area.
			    .style("fill", "none");

			//draw attendance line.
			svg.append("path")
			    .attr("d", line(attendance))
			    .attr("stroke-width", 1.5)
			    .attr("stroke", "green")
			    // make sure have this to avoid the shadow area.
			    .style("fill", "none");

			var maxElement = enrollments[maxIdx],
			    minElement = attendance[minIdx],
			    allCircles = [];

			for (var i=0; i<enrollments.length; i++) {
				if (i !== maxIdx) {
					enrollments[i]['color'] = "purple";
					allCircles.push(enrollments[i]);
				}
			}
			for (var i=0; i<attendance.length; i++) {
			    if (i !== minIdx) {
			    	attendance[i]['color'] = "green";
			    	allCircles.push(attendance[i]);
			    }
			}

			svg.selectAll("circle")
			    .data(allCircles)
			    .enter()
			    .append("circle")
			    .attr("cx", line.x())
			    .attr("cy", line.y())
			    .attr("r", 5)
			    .style("fill", function(d) { return d.color; });

			var getTriangleData = function (point, r, orient) {
				
			    var pointX = x(point.date),
			        pointY = y(point.value),
			        triagnle;
			    switch (orient) {
			        case 'up':
			            triagnle = [
			                {"x": pointX, "y": pointY-r, name: 'top'},
			                {"x": pointX+1.5*r, "y": pointY+r, name: 'right'},
			                {"x": pointX-1.5*r, "y": pointY+r, name: 'left'}
			            ];
			            break;
			        case 'down':
			            triagnle = [
			                {"x": pointX, "y": pointY+r, name: 'down'},
			                {"x": pointX-1.5*r, "y": pointY-r, name: 'left'},
			                {"x": pointX+1.5*r, "y": pointY-r, name: 'right'}
			            ];
			            break;
			    }
			    
			    return triagnle;
			};

			var triangleUpData = getTriangleData(maxElement, 6.5, 'up');
			var triangleDownData = getTriangleData(minElement, 6.5, 'down');

			var triagnleLine = d3.svg.line()
			                          .x(function(d) { return d.x; })
			                          .y(function(d) { return d.y; })
			                          .interpolate("linear");

			var triangleUp = svg.append("path")
			                     .attr("d", triagnleLine(triangleUpData))
			                     .attr("stroke", "red")
			                     .attr("stroke-width", 0)
			                     .attr("fill", "red");

			var triangleUp = svg.append("path")
			                     .attr("d", triagnleLine(triangleDownData))
			                     .attr("stroke", "red")
			                     .attr("stroke-width", 0)
			                     .attr("fill", "green");
			                     
		}
	};
}]);
