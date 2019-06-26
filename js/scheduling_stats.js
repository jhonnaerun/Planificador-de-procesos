
var Table = new function() {
	var self = this;
	var _sched_combo = "#sched_s_cmb";
	
	// Create initial table
	this.createTable = function() {
		var statsTable = '<table class="statsTable" >';
		
		// Remove placeholder
		statsTable += '<tr><td class="italicEntry" title="Click on the X next to the statistics you wish to remove">Remove statistics:</td></tr>';
		
		// Used strategy
		statsTable += '<tr><td class="boldEntry" title="The scheduling strategy you selected from the drop-down list above">Scheduling strategy:</td></tr>';
		
		// Strategy options
		statsTable += '<tr><td class="boldEntry" title="The scheduling options for the selected scheduling strategy">Scheduling options:</td></tr>';
		
		
		// Global metrics header
		statsTable += '<tr><td class="boldEntry metricsHeader">Global metrics</td></tr>';
		
		// Number of processes
		statsTable += '<tr><td class="boldEntry" title="Number of active processes, which take part in this schedule">Process count:</td></tr>';
		
		// Processor busy / idle
		statsTable += '<tr><td class="boldEntry" title="Number of ' + "'ticks'" + ', where the CPU is busy">Busy CPU time:</td></tr>';
		statsTable += '<tr><td class="boldEntry" title="Number of ' + "'ticks'" + ', where the CPU is idle">Idle CPU time:</td></tr>';
		
		// Processor utilization
		statsTable += '<tr><td class="boldEntry" title="Percentage of busy CPU state">Processor utilization:</td></tr>';
		
		// Fairness
		statsTable += '<tr><td class="boldEntry" title="A fair schedule indicator for this special case. A schedule is fair, when the CPU percentage of each process corresponds the mean CPU percentage with no more deviation than 68%. No process should suffer starvation.">Fair schedule:</td></tr>';
		
		// Turnaround time mean
		statsTable += '<tr><td class="boldEntry" title="Mean time of the interval of time between the submission of processes and their completion. Includes actual execution time plus time spent waiting for resources, including the processor.">Turnaround time mean:</td></tr>';
		
		// Turnaround time standard deviation
		statsTable += '<tr><td class="boldEntry" title="Standard deviation of the turnaround time mean">Turnaround time standard deviation:</td></tr>';
		
		// Waiting time mean
		statsTable += '<tr><td class="boldEntry" title="Mean time of processes spending time on waiting for resources, including the processor.">Waiting time mean:</td></tr>';
		
		// Waiting time standard deviation
		statsTable += '<tr><td class="boldEntry" title="Standard deviation of the waiting time mean">Waiting time standard deviation:</td></tr>';
		
		// Response time mean
		statsTable += '<tr><td class="boldEntry" title="Mean time from the submission of requests until the responses begin to be received.">Response time mean:</td></tr>';
		
		// Response time standard deviation
		statsTable += '<tr><td class="boldEntry" title="Standard deviation of the response time mean">Response time standard deviation:</td></tr>';
		
		
		// Per process metrics header
		statsTable += '<tr><td class="boldEntry metricsHeader">Per process metrics</td></tr>';
		
		// Active processes and their attributes
		statsTable += '<tr><td class="boldEntry">Active processes:</td></tr>';
		
		// Iterate through all strategies and collect all process attributes
		$.each(Sched_ProcessDef.preDefinedAttributes, function(i, val){
			if (i != "name")
				statsTable += '<tr data-attribute="' + i + '"><td class="boldEntry" title="An attribute from the process definition">' + val["description"] + ':</td></tr>';
		});
		
		// Process turnaround time mean
		statsTable += '<tr><td class="boldEntry" title="Mean time of the interval of time between the submission of a process and its completion. Includes actual execution time plus time spent waiting for resources, including the processor.">Turnaround time mean:</td></tr>';
		
		// Process turnaround time standard deviation
		statsTable += '<tr><td class="boldEntry" title="Standard deviation of the turnaround time mean">Turnaround time standard deviation:</td></tr>';
		
		// Process waiting time mean
		statsTable += '<tr><td class="boldEntry" title="Mean time of each process spending time on waiting for resources, including the processor.">Waiting time mean:</td></tr>';
		
		// Process waiting time standard deviation
		statsTable += '<tr><td class="boldEntry" title="Standard deviation of the waiting time mean">Waiting time standard deviation:</td></tr>';
		
		// Process response time mean
		statsTable += '<tr><td class="boldEntry" title="Mean time from the submission of a request until the response begin to be received.">Response time mean:</td></tr>';
		
		// Process response time standard deviation
		statsTable += '<tr><td class="boldEntry" title="Standard deviation of the response time mean">Response time standard deviation:</td></tr>';
		
		// CPU percentage
		statsTable += '<tr><td class="boldEntry" title="CPU percentage of each process">CPU percentage:</td></tr>';
		
		statsTable += "</table>";
		
		$("#sched_stats_headers").html(statsTable);
	};
	
	this.appendStats = function() {
		var cols = Sched_UI.Simulator.getProcessCount();
		if (cols == 0) cols = 1;
		
		var statsTable = '<table class="statsTable" >';
		
		// Remove link
		statsTable += '<tr><td class="italicEntry removeEntry" colspan=' + cols + '><a onclick="$(this).parent().closest(' + "'div'" + ').fadeOut(function(){this.remove();});" title="Click here to remove this statistics">X</a></td></tr>';
		
		// Strategy
		statsTable += '<tr><td class="boldEntry" colspan=' + cols + '>' + $(_sched_combo).val() + '</td></tr>';
		
		// Strategy options
		var strategy = Sched_Strategies.getStrategyByName($(_sched_combo).val());
		var optionString = "";
		$.each(strategy.globalAttributes, function(i, val) {
			optionString += val["description"] + ": " + val["value"] + ", ";
		});
		
		if (optionString.length > 1)
			optionString = optionString.substr(0, optionString.length - 2);
		else
			optionString += "&nbsp;";
		
		statsTable += '<tr><td colspan=' + cols + '>' + optionString + '</td></tr>';
		
		
		// Global metrics header
		statsTable += '<tr><td class="metricsHeader" colspan=' + cols + '>&nbsp;</td></tr>';
		
		// Number of processes
		statsTable += '<tr><td colspan=' + cols + '>' + Sched_UI.Simulator.getProcessCount() + '</td></tr>';
		
		// Processor busy / idle
		statsTable += '<tr><td colspan=' + cols + '>' + Sched_UI.Simulator.Statistics.getBusyCPUTime() + '</td></tr>';
		statsTable += '<tr><td colspan=' + cols + '>' + Sched_UI.Simulator.Statistics.getIdleCPUTime() + '</td></tr>';
		
		// Processor utilization
		statsTable += '<tr><td colspan=' + cols + '>' + Sched_UI.Simulator.Statistics.getProcessorLoad() + '</td></tr>';
		
		// Fairness
		statsTable += '<tr><td colspan=' + cols + '>' + (Sched_UI.Simulator.Statistics.getFairness()?"yes":"no") + '</td></tr>';
		
		// Turnaround time mean
		statsTable += '<tr><td colspan=' + cols + '>' + Sched_UI.Simulator.Statistics.getTurnaroundTimeMean() + '</td></tr>';
		
		// Turnaround time standard deviation
		statsTable += '<tr><td colspan=' + cols + '>' + Sched_UI.Simulator.Statistics.getTurnaroundTimeStandardDeviation() + '</td></tr>';
		
		// Waiting time mean
		statsTable += '<tr><td colspan=' + cols + '>' + Sched_UI.Simulator.Statistics.getWaitingTimeMean() + '</td></tr>';
		
		// Waiting time standard deviation
		statsTable += '<tr><td colspan=' + cols + '>' + Sched_UI.Simulator.Statistics.getWaitingTimeStandardDeviation() + '</td></tr>';
		
		// Response time mean
		statsTable += '<tr><td colspan=' + cols + '>' + Sched_UI.Simulator.Statistics.getResponseTimeMean() + '</td></tr>';
		
		// Response time standard deviation
		statsTable += '<tr><td colspan=' + cols + '>' + Sched_UI.Simulator.Statistics.getResponseTimeStandardDeviation() + '</td></tr>';
		
		
		// Per process metrics header
		statsTable += '<tr><td class="metricsHeader" colspan=' + cols + '>&nbsp;</td></tr>';
		
		// Names of active processes
		statsTable += '<tr>';
		var tmpProcesses = new Array();
		
		$.each(Sched_Scheduler.allProcessList, function(i, val) {
			if (val.isActive)
			{
				tmpProcesses.push(val);
				statsTable += '<td class="boldEntry">' + val.getAttribute("name") + '</td>';
			}
		});
		
		if (Sched_UI.Simulator.getProcessCount() == 0)
			statsTable += '<td colspan=' + cols + '>&nbsp;</td></tr>';
		else
			statsTable += '</tr>';
		
		// Attributes of active processes
		// Iterate through all strategies and collect all process attributes
		$.each(Sched_ProcessDef.preDefinedAttributes, function(i, val){
			if (i != "name")
			{
				statsTable += '<tr>';
				for (var j = 0; j < tmpProcesses.length; j++)
					statsTable += '<td>' + tmpProcesses[j].getAttribute(i) + '</td>';
				
				if (tmpProcesses.length == 0)
					statsTable += '<td colspan=' + cols + '>&nbsp;</td>';
				statsTable += '</tr>';
			}
		});
		
		// Process turnaround time mean
		statsTable += '<tr>';
		for (var j = 0; j < tmpProcesses.length; j++)
			statsTable += "<td>" + Sched_UI.Simulator.Statistics.getProcessTurnaroundTimeMean(tmpProcesses[j].getAttribute("name")) + "</td>";
		
		if (tmpProcesses.length == 0)
			statsTable += '<td colspan=' + cols + '>&nbsp;</td>';
		statsTable += '</tr>';
		
		// Process turnaround time standard deviation
		statsTable += '<tr>';
		for (var j = 0; j < tmpProcesses.length; j++)
			statsTable += "<td>" + Sched_UI.Simulator.Statistics.getProcessTurnaroundTimeStandardDeviation(tmpProcesses[j].getAttribute("name")) + "</td>";
		
		if (tmpProcesses.length == 0)
			statsTable += '<td colspan=' + cols + '>&nbsp;</td>';
		statsTable += '</tr>';
		
		// Process waiting time mean
		statsTable += '<tr>';
		for (var j = 0; j < tmpProcesses.length; j++)
			statsTable += "<td>" + Sched_UI.Simulator.Statistics.getProcessWaitingTimeMean(tmpProcesses[j].getAttribute("name")) + "</td>";
		
		if (tmpProcesses.length == 0)
			statsTable += '<td colspan=' + cols + '>&nbsp;</td>';
		statsTable += '</tr>';
		
		// Process waiting time standard deviation
		statsTable += '<tr>';
		for (var j = 0; j < tmpProcesses.length; j++)
			statsTable += "<td>" + Sched_UI.Simulator.Statistics.getProcessWaitingTimeStandardDeviation(tmpProcesses[j].getAttribute("name")) + "</td>";
		
		if (tmpProcesses.length == 0)
			statsTable += '<td colspan=' + cols + '>&nbsp;</td>';
		statsTable += '</tr>';
		
		// Process response time mean
		statsTable += '<tr>';
		for (var j = 0; j < tmpProcesses.length; j++)
			statsTable += "<td>" + Sched_UI.Simulator.Statistics.getProcessResponseTimeMean(tmpProcesses[j].getAttribute("name")) + "</td>";
		
		if (tmpProcesses.length == 0)
			statsTable += '<td colspan=' + cols + '>&nbsp;</td>';
		statsTable += '</tr>';
		
		// Process response time standard deviation
		statsTable += '<tr>';
		for (var j = 0; j < tmpProcesses.length; j++)
			statsTable += "<td>" + Sched_UI.Simulator.Statistics.getProcessResponseTimeStandardDeviation(tmpProcesses[j].getAttribute("name")) + "</td>";
		
		if (tmpProcesses.length == 0)
			statsTable += '<td colspan=' + cols + '>&nbsp;</td>';
		statsTable += '</tr>';
		
		// CPU percentage
		statsTable += '<tr>';
		for (var j = 0; j < tmpProcesses.length; j++)
			statsTable += "<td>" + Sched_UI.Simulator.Statistics.getProcessCPUPercentage(tmpProcesses[j].getAttribute("name")) + "</td>";
		
		if (tmpProcesses.length == 0)
			statsTable += '<td colspan=' + cols + '>&nbsp;</td>';
		statsTable += '</tr>';
		
		
		statsTable += "</table>";
		
		var output = $('<div class="statsEntry">' + statsTable + '</div>');
		
		$("#sched_stats_tables").prepend(output);
		output.hide().fadeIn();
		
		Tooltip.show("The statistics have been created!", 3);
	};
};