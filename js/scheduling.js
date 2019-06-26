var Sched_ProcessDef = new function() {
	var self = this;
	this.attributes = {};
	
	this.preDefinedAttributes = {
		"name" : {
			"type" : "STRING",
			"description" : "Process name",
			"isUnique" : true,
			"width" : "150px"
		},
		"arrival" : {
			"type" : "NUMBER",
			"description" : "Arrival",
			"isUnique" : false,
			"width" : "50px"
		},
		"cpuBurst" : {
			"type" : "RANGE+",
			"description" : "CPU burst",
			"isUnique" : false,
			"width" : "80px"
		},
		"ioBurst" : {
			"type" : "RANGE",
			"description" : "IO burst",
			"isUnique" : false,
			"width" : "80px"
		},
		"priority" : {
			"type" : "NUMBER",
			"description" : "Priority",
			"isUnique" : false,
			"width" : "50px"
		}
	};
};

// A process
var Sched_Process = function() {
	var self = this;
	var attributes = {};
	
	var seed = Math.random();
	var rng = new RNG(seed);
	
	this.isActive = false;
	this.isValid = false;
	
	// Use process name as seed value
	var updateSeed = function(name) {
		seed = name;
		rng = new RNG(name);
	};
	
	// Return next random in closed interval [min, max]
	this.random = function(min_val, max_val) {
		// Include bounds, so max_val + 1
		return rng.random(min_val, max_val + 1);
	};
	
	// Reset random generator
	this.resetRandom = function() {
		rng = new RNG(seed);
	};
	
	// Set a process attribute; unique ones cant be changed again
	this.setAttribute = function(name, value) {
		if(Sched_ProcessDef.attributes[name] != undefined && value != "")
			if (Sched_ProcessDef.attributes[name]["isUnique"])
			{
				if (attributes[name] == undefined)
				{
					// Update seed using name
					if (name == "name")updateSeed(value);
					
					attributes[name] = value;
					return true;
				}
			}
			else
			{
				// Update seed using name
				if (name == "name")updateSeed(value);
				
				attributes[name] = value;
				return true;
			}
		
		return false;
	};
	
	// Return an attribute value
	this.getAttribute = function(name) {
		return attributes[name];
	};
};

// Scheduling strategies
var Sched_Strategies = new function() {
	var self = this;
	var worker = null;
	var clearEnv = 'atob = btoa = clearInterval = clearTimeout = dump = setInterval = setTimeout';
	clearEnv += ' = XMLHttpRequest = Worker = URL = TextEncoder = TextDecoder = WorkerNavigator = WorkerLocation = WorkerGlobalScope = ImageData = FileReaderSync';
	clearEnv += ' = importScripts = addEventListener = undefined;'
	this.activeStrategy = 0;
	
	// Strategy: First-Come First-Served
	var FCFS = new function () {
		var self_ = this;
		this.name = "First-Come First-Served";
		this.globalAttributes = {};
		
		// This function needs to be called each time a strategy is selected
		this.setup = function() {
			// Stop current worker
			if (worker)
			{
				worker.terminate();
			}
			
			// Reset needed attributes
			// Always provide name as default
			Sched_ProcessDef.attributes = {"name" : Sched_ProcessDef.preDefinedAttributes["name"]};
			
			// Push needed attributes from predefined pool
			Sched_ProcessDef.attributes["arrival"] = Sched_ProcessDef.preDefinedAttributes["arrival"];
			Sched_ProcessDef.attributes["cpuBurst"] = Sched_ProcessDef.preDefinedAttributes["cpuBurst"];
			Sched_ProcessDef.attributes["ioBurst"] = Sched_ProcessDef.preDefinedAttributes["ioBurst"];
		};
		
		// Create a scheduling instance to deal with in the doSchedule() function
		this.getSchedInstance = function (involvedProcessesList) {
			var schedInstance = {};
			
			schedInstance["allProcesses"] = involvedProcessesList;
			
			// Process states
			schedInstance["running"] = {
				"process" : undefined,
				"remaining" : 0
			};
			schedInstance["ready"] = new Array();
			schedInstance["blocked"] = new Array();
			
			schedInstance["arrivedThisTick"] = 0;
			schedInstance["changedSignal"] = false;
			
			
			// Also create drawInstance
			var drawInstance = {
				"states": {
					"NONE" : {
						"name" : "Not started",
						"visible" : false,
						"type" : "NONE"
					},
					"RUNNING" : {
						"name" : "Running",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#0ac40a",
						"stroke" : "#007700"
					},
					"READY" : {
						"name" : "Ready",
						"visible" : true,
						"type" : "LINE",
						"stroke" : "#007700"
					},
					"BLOCKED" : {
						"name" : "Blocked",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#ffd6b8",
						"stroke" : "#dd874a"
					}
				},
				"tCount" : 0,
				"t" : {}
			};
			
			schedInstance["drawInstance"] = drawInstance;
			
			return schedInstance;
		};
		
		// Before doSchedule
		this.beforeDoSchedule = function(schedInstance, t) {
			// Reset changed signal
			schedInstance["changedSignal"] = false;
			schedInstance["finishedRunning"] = false;
			
			// Notify running process finished
			if (schedInstance["running"]["process"] != undefined)
			{
				if (schedInstance["running"]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
					schedInstance["finishedRunning"] = schedInstance["running"]["process"];
				}
			}
			
			// Notify blocked processes finished
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
				}
			}
			
			// This part handles process arrival
			schedInstance["arrivedThisTick"] = 0;
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				if (schedInstance["allProcesses"][i].getAttribute("arrival") == t)
				{
					// Put arrived process in ready list
					schedInstance["ready"].push(schedInstance["allProcesses"][i]);
					
					schedInstance["arrivedThisTick"]++;
					
					// Signal change
					schedInstance["changedSignal"] = true;
				}
			}
		};
		
		// After doSchedule
		this.afterDoSchedule = function(schedInstance, t) {
			// Handle running process
			if (schedInstance["running"]["process"] != undefined)
			{
				schedInstance["running"]["remaining"]--;
			}
			
			// Handle blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				schedInstance["blocked"][i]["remaining"]--;
			}
			
			
			// Update drawInstance
			
			schedInstance["drawInstance"]["tCount"] = t+1;
			
			var tNow = {};
			
			// Map changed signal in drawInstance
			tNow["poi"] = schedInstance["changedSignal"];
			tNow["finishedRunning"] = schedInstance["finishedRunning"] == false ? false : schedInstance["finishedRunning"].getAttribute("name");
			tNow["states"] = {};
			
			
			// Not yet arrived processes
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				// Assume every process has not arrived,
				// because the operations below will override the states
				tNow["states"][schedInstance["allProcesses"][i].getAttribute("name")] = "NONE";
			}
			
			// Running process
			if (schedInstance["running"]["process"] != undefined)
				tNow["states"][schedInstance["running"]["process"].getAttribute("name")] = "RUNNING";
			
			// Ready processes
			for (var i = 0; i < schedInstance["ready"].length; i++)
				tNow["states"][schedInstance["ready"][i].getAttribute("name")] = "READY";
			
			// Blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
				tNow["states"][schedInstance["blocked"][i]["process"].getAttribute("name")] = "BLOCKED";
			
			
			schedInstance["drawInstance"]["t"][t] = tNow;
			
		};
		
		// Schedule implementation
		this.doSchedule = function(schedInstance, t) {
			// DoSchedule will do the following:
			// 1. finished running? running -> blocked
			// 2. finished blocked? blocked -> ready
			// 3. nothing is running? ready -> running
			
			
			// 1. finished running? running -> blocked
			if (schedInstance["running"]["process"] != undefined && schedInstance["running"]["remaining"] == 0)
			{
				// Put finished running process in blocked
				var p = schedInstance["running"]["process"];
				
				var ioburst = p.getAttribute("ioBurst");
				
				var rX = /^(([0-9]+)(-([0-9]+))?)$/;
				var match = rX.exec(ioburst);
				
				if (match[4])
				{ // Burst is a range
					ioburst = p.random(parseInt(match[2]), parseInt(match[4]));
				}
				else
				{
					ioburst = parseInt(ioburst);
				}
				
				schedInstance["blocked"].push({
					"process" : p,
					"remaining" : ioburst
				});
				
				// Remove it from running state
				schedInstance["running"]["process"] = undefined;
			}
			
			// 2. finished blocked? blocked -> ready
			var readyWaiting = schedInstance["ready"].length - schedInstance["arrivedThisTick"];
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					// Put finished blocked process in ready
					schedInstance["ready"].push(schedInstance["blocked"][i]["process"]);
					
					// Rearrange ready list
					// All processes that got ready in this tick will be sorted by definition order
					var j = schedInstance["ready"].length - 1;
					
					while(j>readyWaiting && 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j]) < 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j-1]))
					{
						var tmp_P = schedInstance["ready"][j];
						schedInstance["ready"][j] = schedInstance["ready"][j-1];
						schedInstance["ready"][j-1] = tmp_P;
						j--;
					}
					
					// Mark remove index
					schedInstance["blocked"][i]["process"] = undefined;
				}
			}
			// Remove all marked as undefined
			for (var i = schedInstance["blocked"].length-1; i >= 0; i--)
			{
				if (schedInstance["blocked"][i]["process"] == undefined)
				{
					schedInstance["blocked"].splice(i, 1);
				}
			}
			
			// 3. nothing is running? ready -> running
			if (schedInstance["running"]["process"] == undefined && schedInstance["ready"].length > 0) {
				var p = schedInstance["ready"].shift();
				
				var cpuburst = p.getAttribute("cpuBurst");
				
				var rX = /^(([0-9]+)(-([0-9]+))?)$/;
				var match = rX.exec(cpuburst);
				
				if (match[4])
				{ // Burst is a range
					cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
				}
				else
				{
					cpuburst = parseInt(cpuburst);
				}
				
				schedInstance["running"]["process"] = p;
				schedInstance["running"]["remaining"] = cpuburst;
			}
		};
	};
	
	// Strategy: Round Robin
	var RR = new function () {
		var self_ = this;
		this.name = "Round Robin";
		this.globalAttributes = {
			"timeSlice" : {
				"type" : "NUMBER+",
				"description" : "Time slice",
				"value" : "2",
				"readOnly" : false
			}
		};
		
		// This function needs to be called each time a strategy is selected
		this.setup = function() {
			// Stop current worker
			if (worker)
			{
				worker.terminate();
			}
			
			// Reset needed attributes
			// Always provide name as default
			Sched_ProcessDef.attributes = {"name" : Sched_ProcessDef.preDefinedAttributes["name"]};
			
			// Push needed attributes from predefined pool
			Sched_ProcessDef.attributes["arrival"] = Sched_ProcessDef.preDefinedAttributes["arrival"];
			Sched_ProcessDef.attributes["cpuBurst"] = Sched_ProcessDef.preDefinedAttributes["cpuBurst"];
			Sched_ProcessDef.attributes["ioBurst"] = Sched_ProcessDef.preDefinedAttributes["ioBurst"];
		};
		
		// Create a scheduling instance to deal with in the doSchedule() function
		this.getSchedInstance = function (involvedProcessesList) {
			var schedInstance = {};
			
			schedInstance["allProcesses"] = involvedProcessesList;
			
			// Process states
			schedInstance["running"] = {
				"process" : undefined,
				"remaining" : 0,
				"timeSliceUsed" : 0
			};
			schedInstance["ready"] = new Array();
			schedInstance["blocked"] = new Array();
			
			schedInstance["arrivedThisTick"] = 0;
			schedInstance["changedSignal"] = false;
			
			
			// Also create drawInstance
			var drawInstance = {
				"states": {
					"NONE" : {
						"name" : "Not started",
						"visible" : false,
						"type" : "NONE"
					},
					"RUNNING" : {
						"name" : "Running",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#0ac40a",
						"stroke" : "#007700"
					},
					"READY" : {
						"name" : "Ready",
						"visible" : true,
						"type" : "LINE",
						"stroke" : "#007700"
					},
					"BLOCKED" : {
						"name" : "Blocked",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#ffd6b8",
						"stroke" : "#dd874a"
					}
				},
				"tCount" : 0,
				"t" : {}
			};
			
			schedInstance["drawInstance"] = drawInstance;
			
			return schedInstance;
		};
		
		// Before doSchedule
		this.beforeDoSchedule = function(schedInstance, t) {
			// Reset changed signal
			schedInstance["changedSignal"] = false;
			schedInstance["finishedRunning"] = false;
			
			// Notify running process finished or preempted
			if (schedInstance["running"]["process"] != undefined)
			{
				if (schedInstance["running"]["remaining"] == 0 || 
					schedInstance["running"]["timeSliceUsed"] == parseInt(self_.globalAttributes["timeSlice"]["value"]))
				{
					schedInstance["changedSignal"] = true;
				}
				
				if (schedInstance["running"]["remaining"] == 0)
				{
					schedInstance["finishedRunning"] = schedInstance["running"]["process"];
				}
			}
			
			// Notify blocked processes finished
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
				}
			}
			
			// This part handles process arrival
			schedInstance["arrivedThisTick"] = 0;
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				var p = schedInstance["allProcesses"][i];
				if (p.getAttribute("arrival") == t)
				{
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
				
					// Put arrived process in ready list
					schedInstance["ready"].push({
						"process" : p,
						"remaining" : cpuburst,
						"timeSliceUsed" : 0
					});
					
					schedInstance["arrivedThisTick"]++;
					
					// Signal change
					schedInstance["changedSignal"] = true;
				}
			}
		};
		
		// After doSchedule
		this.afterDoSchedule = function(schedInstance, t) {
			// Handle running process
			if (schedInstance["running"]["process"] != undefined)
			{
				schedInstance["running"]["remaining"]--;
				schedInstance["running"]["timeSliceUsed"]++;
			}
			
			// Handle blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				schedInstance["blocked"][i]["remaining"]--;
			}
			
			
			// Update drawInstance
			
			schedInstance["drawInstance"]["tCount"] = t+1;
			
			var tNow = {};
			
			// Map changed signal in drawInstance
			tNow["poi"] = schedInstance["changedSignal"];
			tNow["finishedRunning"] = schedInstance["finishedRunning"] == false ? false : schedInstance["finishedRunning"].getAttribute("name");
			tNow["states"] = {};
			
			
			// Not yet arrived processes
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				// Assume every process has not arrived,
				// because the operations below will override the states
				tNow["states"][schedInstance["allProcesses"][i].getAttribute("name")] = "NONE";
			}
			
			// Running process
			if (schedInstance["running"]["process"] != undefined)
				tNow["states"][schedInstance["running"]["process"].getAttribute("name")] = "RUNNING";
			
			// Ready processes
			for (var i = 0; i < schedInstance["ready"].length; i++)
				tNow["states"][schedInstance["ready"][i]["process"].getAttribute("name")] = "READY";
			
			// Blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
				tNow["states"][schedInstance["blocked"][i]["process"].getAttribute("name")] = "BLOCKED";
			
			
			schedInstance["drawInstance"]["t"][t] = tNow;
			
		};
		
		// Schedule implementation
		this.doSchedule = function(schedInstance, t) {
			// DoSchedule will do the following:
			// 1a. finished running? running -> blocked
			// 1b. pre-empted running? running -> store as preempted
			// 2. finished blocked? blocked -> ready
			// 3. Append pre-empted process as last process in ready list
			// 4. nothing is running? ready -> running
			
			
			// 1a. finished running? running -> blocked
			if (schedInstance["running"]["process"] != undefined && 
				schedInstance["running"]["remaining"] == 0)
			{
				// Put finished running process in blocked
				var p = schedInstance["running"]["process"];
				
				var ioburst = p.getAttribute("ioBurst");
				
				var rX = /^(([0-9]+)(-([0-9]+))?)$/;
				var match = rX.exec(ioburst);
				
				if (match[4])
				{ // Burst is a range
					ioburst = p.random(parseInt(match[2]), parseInt(match[4]));
				}
				else
				{
					ioburst = parseInt(ioburst);
				}
				
				schedInstance["blocked"].push({
					"process" : p,
					"remaining" : ioburst
				});
				
				// Remove it from running state
				schedInstance["running"]["process"] = undefined;
			}
			
			// 1b. pre-empted running? running -> store as preempted
			var preempted = undefined;
			if (schedInstance["running"]["process"] != undefined && 
				schedInstance["running"]["timeSliceUsed"] == parseInt(self_.globalAttributes["timeSlice"]["value"]))
			{
				// Preempt process
				
				preempted = {
					"process" : schedInstance["running"]["process"],
					"remaining" : schedInstance["running"]["remaining"],
					"timeSliceUsed" : 0
				};
				
				// Remove it from running state
				schedInstance["running"]["process"] = undefined;
			}
			
			// 2. finished blocked? blocked -> ready
			var readyWaiting = schedInstance["ready"].length - schedInstance["arrivedThisTick"];
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					// Put finished blocked process in ready
					var p = schedInstance["blocked"][i]["process"];
					
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
					
					schedInstance["ready"].push({
						"process" : p,
						"remaining" : cpuburst,
						"timeSliceUsed" : 0
					});
					
					// Rearrange ready list
					// All processes that got ready in this tick will be sorted by definition order
					var j = schedInstance["ready"].length - 1;
					
					while(j>readyWaiting && 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j]["process"]) < 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j-1]["process"]))
					{
						var tmp_P = schedInstance["ready"][j];
						schedInstance["ready"][j] = schedInstance["ready"][j-1];
						schedInstance["ready"][j-1] = tmp_P;
						j--;
					}
					
					// Mark remove index
					schedInstance["blocked"][i]["process"] = undefined;
				}
			}
			// Remove all marked as undefined
			for (var i = schedInstance["blocked"].length-1; i >= 0; i--)
			{
				if (schedInstance["blocked"][i]["process"] == undefined)
				{
					schedInstance["blocked"].splice(i, 1);
				}
			}
			
			// 3. Append pre-empted process as last process in ready list
			if (preempted != undefined)
			{
				schedInstance["ready"].push(preempted);
			}
			
			// 4. nothing is running? ready -> running
			if (schedInstance["running"]["process"] == undefined && schedInstance["ready"].length > 0) {
				var p = schedInstance["ready"].shift();
				
				schedInstance["running"] = p;
			}
		};
	};
	
	// Strategy: Virtual Round Robin
	var VRR = new function () {
		var self_ = this;
		this.name = "Virtual Round Robin";
		this.globalAttributes = {
			"timeSlice" : {
				"type" : "NUMBER+",
				"description" : "Time slice",
				"value" : "2",
				"readOnly" : false
			}
		};
		
		// This function needs to be called each time a strategy is selected
		this.setup = function() {
			// Stop current worker
			if (worker)
			{
				worker.terminate();
			}
			
			// Reset needed attributes
			// Always provide name as default
			Sched_ProcessDef.attributes = {"name" : Sched_ProcessDef.preDefinedAttributes["name"]};
			
			// Push needed attributes from predefined pool
			Sched_ProcessDef.attributes["arrival"] = Sched_ProcessDef.preDefinedAttributes["arrival"];
			Sched_ProcessDef.attributes["cpuBurst"] = Sched_ProcessDef.preDefinedAttributes["cpuBurst"];
			Sched_ProcessDef.attributes["ioBurst"] = Sched_ProcessDef.preDefinedAttributes["ioBurst"];
		};
		
		// Create a scheduling instance to deal with in the doSchedule() function
		this.getSchedInstance = function (involvedProcessesList) {
			var schedInstance = {};
			
			schedInstance["allProcesses"] = involvedProcessesList;
			
			// Process states
			schedInstance["running"] = {
				"process" : undefined,
				"remaining" : 0,
				"timeSliceUsed" : 0
			};
			schedInstance["ready"] = new Array();
			schedInstance["readyPrefer"] = new Array();
			schedInstance["blocked"] = new Array();
			
			schedInstance["arrivedThisTick"] = 0;
			schedInstance["changedSignal"] = false;
			
			
			// Also create drawInstance
			var drawInstance = {
				"states": {
					"NONE" : {
						"name" : "Not started",
						"visible" : false,
						"type" : "NONE"
					},
					"RUNNING" : {
						"name" : "Running",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#0ac40a",
						"stroke" : "#007700"
					},
					"READY" : {
						"name" : "Ready",
						"visible" : true,
						"type" : "LINE",
						"stroke" : "#007700"
					},
					"BLOCKED" : {
						"name" : "Blocked",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#ffd6b8",
						"stroke" : "#dd874a"
					}
				},
				"tCount" : 0,
				"t" : {}
			};
			
			schedInstance["drawInstance"] = drawInstance;
			
			return schedInstance;
		};
		
		// Before doSchedule
		this.beforeDoSchedule = function(schedInstance, t) {
			// Reset changed signal
			schedInstance["changedSignal"] = false;
			schedInstance["finishedRunning"] = false;
			
			// Notify running process finished or preempted
			if (schedInstance["running"]["process"] != undefined)
			{
				if (schedInstance["running"]["remaining"] == 0 || 
					schedInstance["running"]["timeSliceUsed"] == parseInt(self_.globalAttributes["timeSlice"]["value"]))
				{
					schedInstance["changedSignal"] = true;
				}
				
				if (schedInstance["running"]["remaining"] == 0)
				{
					schedInstance["finishedRunning"] = schedInstance["running"]["process"];
				}
			}
			
			// Notify blocked processes finished
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
				}
			}
			
			// This part handles process arrival
			schedInstance["arrivedThisTick"] = 0;
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				var p = schedInstance["allProcesses"][i];
				if (p.getAttribute("arrival") == t)
				{
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
				
					// Put arrived process in ready list
					schedInstance["ready"].push({
						"process" : p,
						"remaining" : cpuburst,
						"timeSliceUsed" : 0
					});
					
					schedInstance["arrivedThisTick"]++;
					
					// Signal change
					schedInstance["changedSignal"] = true;
				}
			}
		};
		
		// After doSchedule
		this.afterDoSchedule = function(schedInstance, t) {
			// Handle running process
			if (schedInstance["running"]["process"] != undefined)
			{
				schedInstance["running"]["remaining"]--;
				schedInstance["running"]["timeSliceUsed"]++;
			}
			
			// Handle blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				schedInstance["blocked"][i]["remaining"]--;
			}
			
			
			// Update drawInstance
			
			schedInstance["drawInstance"]["tCount"] = t+1;
			
			var tNow = {};
			
			// Map changed signal in drawInstance
			tNow["poi"] = schedInstance["changedSignal"];
			tNow["finishedRunning"] = schedInstance["finishedRunning"] == false ? false : schedInstance["finishedRunning"].getAttribute("name");
			tNow["states"] = {};
			
			
			// Not yet arrived processes
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				// Assume every process has not arrived,
				// because the operations below will override the states
				tNow["states"][schedInstance["allProcesses"][i].getAttribute("name")] = "NONE";
			}
			
			// Running process
			if (schedInstance["running"]["process"] != undefined)
				tNow["states"][schedInstance["running"]["process"].getAttribute("name")] = "RUNNING";
			
			// Ready preferred processes
			for (var i = 0; i < schedInstance["readyPrefer"].length; i++)
				tNow["states"][schedInstance["readyPrefer"][i]["process"].getAttribute("name")] = "READY";
			
			// Ready processes
			for (var i = 0; i < schedInstance["ready"].length; i++)
				tNow["states"][schedInstance["ready"][i]["process"].getAttribute("name")] = "READY";
			
			// Blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
				tNow["states"][schedInstance["blocked"][i]["process"].getAttribute("name")] = "BLOCKED";
			
			
			schedInstance["drawInstance"]["t"][t] = tNow;
			
		};
		
		// Schedule implementation
		this.doSchedule = function(schedInstance, t) {
			// DoSchedule will do the following:
			// 1a. finished running? running -> blocked (propagate timeSliceUsed)
			// 1b. pre-empted running? running -> store as preempted
			// 2a. finished blocked and no timeSliceUsed? blocked -> ready
			// 2b. finished blocked and timeSliceUsed? blocked -> readyPrefer
			// 3. Append pre-empted process as last process in ready list
			// 4a. nothing is running? readyPrefer -> running
			// 4b. nothing is running and no preferred? ready -> running
			
			
			// 1a. finished running? running -> blocked (propagate timeSliceUsed)
			if (schedInstance["running"]["process"] != undefined && 
				schedInstance["running"]["remaining"] == 0)
			{
				// Put finished running process in blocked
				var p = schedInstance["running"]["process"];
				
				var ioburst = p.getAttribute("ioBurst");
				
				var rX = /^(([0-9]+)(-([0-9]+))?)$/;
				var match = rX.exec(ioburst);
				
				if (match[4])
				{ // Burst is a range
					ioburst = p.random(parseInt(match[2]), parseInt(match[4]));
				}
				else
				{
					ioburst = parseInt(ioburst);
				}
				
				var tSU = 0;
				if (schedInstance["running"]["timeSliceUsed"] < parseInt(self_.globalAttributes["timeSlice"]["value"]))
					tSU = schedInstance["running"]["timeSliceUsed"];
				schedInstance["blocked"].push({
					"process" : p,
					"remaining" : ioburst,
					"timeSliceUsed" : tSU
				});
				
				// Remove it from running state
				schedInstance["running"]["process"] = undefined;
			}
			
			// 1b. pre-empted running? running -> store as preempted
			var preempted = undefined;
			if (schedInstance["running"]["process"] != undefined && 
				schedInstance["running"]["timeSliceUsed"] == parseInt(self_.globalAttributes["timeSlice"]["value"]))
			{
				// Preempt process
				
				preempted = {
					"process" : schedInstance["running"]["process"],
					"remaining" : schedInstance["running"]["remaining"],
					"timeSliceUsed" : 0
				};
				
				// Remove it from running state
				schedInstance["running"]["process"] = undefined;
			}
			
			// 2a. finished blocked and no timeSliceUsed? blocked -> ready
			var readyWaiting = schedInstance["ready"].length - schedInstance["arrivedThisTick"];
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					// Put finished blocked process in ready
					var p = schedInstance["blocked"][i]["process"];
					
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
					
					// 2b. finished blocked and timeSliceUsed? blocked -> readyPrefer
					if (schedInstance["blocked"][i]["timeSliceUsed"] > 0)
					{
						schedInstance["readyPrefer"].push({
							"process" : p,
							"remaining" : cpuburst,
							"timeSliceUsed" : schedInstance["blocked"][i]["timeSliceUsed"]
						});
					}
					else
					{
						schedInstance["ready"].push({
							"process" : p,
							"remaining" : cpuburst,
							"timeSliceUsed" : 0
						});
						
						// Rearrange ready list
						// All processes that got ready in this tick will be sorted by definition order
						var j = schedInstance["ready"].length - 1;
						
						while(j>readyWaiting && 
							schedInstance["allProcesses"].indexOf(schedInstance["ready"][j]["process"]) < 
							schedInstance["allProcesses"].indexOf(schedInstance["ready"][j-1]["process"]))
						{
							var tmp_P = schedInstance["ready"][j];
							schedInstance["ready"][j] = schedInstance["ready"][j-1];
							schedInstance["ready"][j-1] = tmp_P;
							j--;
						}

					}
					
					// Mark remove index
					schedInstance["blocked"][i]["process"] = undefined;
				}
			}
			// Remove all marked as undefined
			for (var i = schedInstance["blocked"].length-1; i >= 0; i--)
			{
				if (schedInstance["blocked"][i]["process"] == undefined)
				{
					schedInstance["blocked"].splice(i, 1);
				}
			}
			
			// 3. Append pre-empted process as last process in ready list
			if (preempted != undefined)
			{
				schedInstance["ready"].push(preempted);
			}
			
			// 4a. nothing is running? readyPrefer -> running
			if (schedInstance["running"]["process"] == undefined) {
				var p;
				
				if (schedInstance["readyPrefer"].length > 0)
				{
					p = schedInstance["readyPrefer"].shift();
				}
				// 4b. nothing is running and no preferred? ready -> running
				else if (schedInstance["ready"].length > 0)
				{
					p = schedInstance["ready"].shift();
				}
				
				if (p != undefined) schedInstance["running"] = p;
			}
		};
	};
	
	// Strategy: Shortest Process Next (Knowledge)
	var SPN_K = new function () {
		var self_ = this;
		this.name = "Shortest Process Next (Knowledge)";
		this.globalAttributes = {};
		
		// This function needs to be called each time a strategy is selected
		this.setup = function() {
			// Stop current worker
			if (worker)
			{
				worker.terminate();
			}
			
			// Reset needed attributes
			// Always provide name as default
			Sched_ProcessDef.attributes = {"name" : Sched_ProcessDef.preDefinedAttributes["name"]};
			
			// Push needed attributes from predefined pool
			Sched_ProcessDef.attributes["arrival"] = Sched_ProcessDef.preDefinedAttributes["arrival"];
			Sched_ProcessDef.attributes["cpuBurst"] = Sched_ProcessDef.preDefinedAttributes["cpuBurst"];
			Sched_ProcessDef.attributes["ioBurst"] = Sched_ProcessDef.preDefinedAttributes["ioBurst"];
		};
		
		// Create a scheduling instance to deal with in the doSchedule() function
		this.getSchedInstance = function (involvedProcessesList) {
			var schedInstance = {};
			
			schedInstance["allProcesses"] = involvedProcessesList;
			
			// Process states
			schedInstance["running"] = {
				"process" : undefined,
				"remaining" : 0
			};
			schedInstance["ready"] = new Array();
			schedInstance["blocked"] = new Array();
			
			schedInstance["arrivedThisTick"] = 0;
			schedInstance["changedSignal"] = false;
			
			
			// Also create drawInstance
			var drawInstance = {
				"states": {
					"NONE" : {
						"name" : "Not started",
						"visible" : false,
						"type" : "NONE"
					},
					"RUNNING" : {
						"name" : "Running",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#0ac40a",
						"stroke" : "#007700"
					},
					"READY" : {
						"name" : "Ready",
						"visible" : true,
						"type" : "LINE",
						"stroke" : "#007700"
					},
					"BLOCKED" : {
						"name" : "Blocked",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#ffd6b8",
						"stroke" : "#dd874a"
					}
				},
				"tCount" : 0,
				"t" : {}
			};
			
			schedInstance["drawInstance"] = drawInstance;
			
			return schedInstance;
		};
		
		// Before doSchedule
		this.beforeDoSchedule = function(schedInstance, t) {
			// Reset changed signal
			schedInstance["changedSignal"] = false;
			schedInstance["finishedRunning"] = false;
			
			// Notify running process finished
			if (schedInstance["running"]["process"] != undefined)
			{
				if (schedInstance["running"]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
					schedInstance["finishedRunning"] = schedInstance["running"]["process"];
				}
			}
			
			// Notify blocked processes finished
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
				}
			}
			
			// This part handles process arrival
			schedInstance["arrivedThisTick"] = 0;
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				if (schedInstance["allProcesses"][i].getAttribute("arrival") == t)
				{
					var p = schedInstance["allProcesses"][i];
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
					
					// Put arrived process in ready list
					schedInstance["ready"].push({
						"process" : p,
						"remaining" : cpuburst
					});
					
					schedInstance["arrivedThisTick"]++;
					
					// Signal change
					schedInstance["changedSignal"] = true;
				}
			}
		};
		
		// After doSchedule
		this.afterDoSchedule = function(schedInstance, t) {
			// Handle running process
			if (schedInstance["running"]["process"] != undefined)
			{
				schedInstance["running"]["remaining"]--;
			}
			
			// Handle blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				schedInstance["blocked"][i]["remaining"]--;
			}
			
			
			// Update drawInstance
			
			schedInstance["drawInstance"]["tCount"] = t+1;
			
			var tNow = {};
			
			// Map changed signal in drawInstance
			tNow["poi"] = schedInstance["changedSignal"];
			tNow["finishedRunning"] = schedInstance["finishedRunning"] == false ? false : schedInstance["finishedRunning"].getAttribute("name");
			tNow["states"] = {};
			
			
			// Not yet arrived processes
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				// Assume every process has not arrived,
				// because the operations below will override the states
				tNow["states"][schedInstance["allProcesses"][i].getAttribute("name")] = "NONE";
			}
			
			// Running process
			if (schedInstance["running"]["process"] != undefined)
				tNow["states"][schedInstance["running"]["process"].getAttribute("name")] = "RUNNING";
			
			// Ready processes
			for (var i = 0; i < schedInstance["ready"].length; i++)
				tNow["states"][schedInstance["ready"][i]["process"].getAttribute("name")] = "READY";
			
			// Blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
				tNow["states"][schedInstance["blocked"][i]["process"].getAttribute("name")] = "BLOCKED";
			
			
			schedInstance["drawInstance"]["t"][t] = tNow;
			
		};
		
		// Schedule implementation
		this.doSchedule = function(schedInstance, t) {
			// DoSchedule will do the following:
			// 1. finished running? running -> blocked
			// 2. finished blocked? blocked -> ready
			// 3. nothing is running? min(ready) -> running
			
			
			// 1. finished running? running -> blocked
			if (schedInstance["running"]["process"] != undefined && schedInstance["running"]["remaining"] == 0)
			{
				// Put finished running process in blocked
				var p = schedInstance["running"]["process"];
				
				var ioburst = p.getAttribute("ioBurst");
				
				var rX = /^(([0-9]+)(-([0-9]+))?)$/;
				var match = rX.exec(ioburst);
				
				if (match[4])
				{ // Burst is a range
					ioburst = p.random(parseInt(match[2]), parseInt(match[4]));
				}
				else
				{
					ioburst = parseInt(ioburst);
				}
				
				schedInstance["blocked"].push({
					"process" : p,
					"remaining" : ioburst
				});
				
				// Remove it from running state
				schedInstance["running"]["process"] = undefined;
			}
			
			// 2. finished blocked? blocked -> ready
			var readyWaiting = schedInstance["ready"].length - schedInstance["arrivedThisTick"];
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					var p = schedInstance["blocked"][i]["process"];
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
					
					// Put finished blocked process in ready
					schedInstance["ready"].push({
						"process" : p,
						"remaining" : cpuburst
					});
					
					// Rearrange ready list
					// All processes that got ready in this tick will be sorted by definition order
					var j = schedInstance["ready"].length - 1;
					
					while(j>readyWaiting && 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j]["process"]) < 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j-1]["process"]))
					{
						var tmp_P = schedInstance["ready"][j];
						schedInstance["ready"][j] = schedInstance["ready"][j-1];
						schedInstance["ready"][j-1] = tmp_P;
						j--;
					}
					
					// Mark remove index
					schedInstance["blocked"][i]["process"] = undefined;
				}
			}
			// Remove all marked as undefined
			for (var i = schedInstance["blocked"].length-1; i >= 0; i--)
			{
				if (schedInstance["blocked"][i]["process"] == undefined)
				{
					schedInstance["blocked"].splice(i, 1);
				}
			}
			
			// 3. nothing is running? min(ready) -> running
			if (schedInstance["running"]["process"] == undefined && schedInstance["ready"].length > 0) {
				var min = 0;
				
				// Find shortest process in ready list
				for (var j = 0; j < schedInstance["ready"].length; j++)
				{
					if (schedInstance["ready"][j]["remaining"] < schedInstance["ready"][min]["remaining"])
						min = j;
				}
				
				var p = schedInstance["ready"].splice(min, 1)[0];
				schedInstance["running"] = p;
			}
		};
	};
	
	// Strategy: Shortest Process Next (Prediction)
	var SPN_P = new function () {
		var self_ = this;
		this.name = "Shortest Process Next (Prediction)";
		this.globalAttributes = {
			"weighting" : {
				"type" : "DECIMAL_FRACTION",
				"description" : "Weighting &alpha;",
				"value" : "0.70",
				"readOnly" : false
			}
		};
		
		// This function needs to be called each time a strategy is selected
		this.setup = function() {
			// Stop current worker
			if (worker)
			{
				worker.terminate();
			}
			
			// Reset needed attributes
			// Always provide name as default
			Sched_ProcessDef.attributes = {"name" : Sched_ProcessDef.preDefinedAttributes["name"]};
			
			// Push needed attributes from predefined pool
			Sched_ProcessDef.attributes["arrival"] = Sched_ProcessDef.preDefinedAttributes["arrival"];
			Sched_ProcessDef.attributes["cpuBurst"] = Sched_ProcessDef.preDefinedAttributes["cpuBurst"];
			Sched_ProcessDef.attributes["ioBurst"] = Sched_ProcessDef.preDefinedAttributes["ioBurst"];
		};
		
		// Create a scheduling instance to deal with in the doSchedule() function
		this.getSchedInstance = function (involvedProcessesList) {
			var schedInstance = {};
			
			schedInstance["allProcesses"] = involvedProcessesList;
			
			// Process states
			schedInstance["running"] = {
				"process" : undefined,
				"remaining" : 0,
				"tn" : 0,
				"sn" : 0
			};
			schedInstance["ready"] = new Array();
			schedInstance["blocked"] = new Array();
			
			schedInstance["arrivedThisTick"] = 0;
			schedInstance["changedSignal"] = false;
			
			
			// Also create drawInstance
			var drawInstance = {
				"states": {
					"NONE" : {
						"name" : "Not started",
						"visible" : false,
						"type" : "NONE"
					},
					"RUNNING" : {
						"name" : "Running",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#0ac40a",
						"stroke" : "#007700"
					},
					"READY" : {
						"name" : "Ready",
						"visible" : true,
						"type" : "LINE",
						"stroke" : "#007700"
					},
					"BLOCKED" : {
						"name" : "Blocked",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#ffd6b8",
						"stroke" : "#dd874a"
					}
				},
				"tCount" : 0,
				"t" : {}
			};
			
			schedInstance["drawInstance"] = drawInstance;
			
			return schedInstance;
		};
		
		// Before doSchedule
		this.beforeDoSchedule = function(schedInstance, t) {
			// Reset changed signal
			schedInstance["changedSignal"] = false;
			schedInstance["finishedRunning"] = false;
			
			// Notify running process finished
			if (schedInstance["running"]["process"] != undefined)
			{
				if (schedInstance["running"]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
					schedInstance["finishedRunning"] = schedInstance["running"]["process"];
				}
			}
			
			// Notify blocked processes finished
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
				}
			}
			
			// This part handles process arrival
			schedInstance["arrivedThisTick"] = 0;
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				if (schedInstance["allProcesses"][i].getAttribute("arrival") == t)
				{
					var p = schedInstance["allProcesses"][i];
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
					
					// Put arrived process in ready list
					schedInstance["ready"].push({
						"process" : p,
						"remaining" : cpuburst,
						"tn" : 0,
						"sn" : 0
					});
					
					schedInstance["arrivedThisTick"]++;
					
					// Signal change
					schedInstance["changedSignal"] = true;
				}
			}
		};
		
		// After doSchedule
		this.afterDoSchedule = function(schedInstance, t) {
			// Handle running process
			if (schedInstance["running"]["process"] != undefined)
			{
				schedInstance["running"]["remaining"]--;
			}
			
			// Handle blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				schedInstance["blocked"][i]["remaining"]--;
			}
			
			
			// Update drawInstance
			
			schedInstance["drawInstance"]["tCount"] = t+1;
			
			var tNow = {};
			
			// Map changed signal in drawInstance
			tNow["poi"] = schedInstance["changedSignal"];
			tNow["finishedRunning"] = schedInstance["finishedRunning"] == false ? false : schedInstance["finishedRunning"].getAttribute("name");
			tNow["states"] = {};
			
			
			// Not yet arrived processes
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				// Assume every process has not arrived,
				// because the operations below will override the states
				tNow["states"][schedInstance["allProcesses"][i].getAttribute("name")] = "NONE";
			}
			
			// Running process
			if (schedInstance["running"]["process"] != undefined)
				tNow["states"][schedInstance["running"]["process"].getAttribute("name")] = "RUNNING";
			
			// Ready processes
			for (var i = 0; i < schedInstance["ready"].length; i++)
				tNow["states"][schedInstance["ready"][i]["process"].getAttribute("name")] = "READY";
			
			// Blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
				tNow["states"][schedInstance["blocked"][i]["process"].getAttribute("name")] = "BLOCKED";
			
			
			schedInstance["drawInstance"]["t"][t] = tNow;
			
		};
		
		// Schedule implementation
		this.doSchedule = function(schedInstance, t) {
			// DoSchedule will do the following:
			// 1. finished running? running -> blocked
			// 2. finished blocked? blocked -> ready
			// 3. nothing is running? min(ready) -> running
			
			
			// 1. finished running? running -> blocked
			if (schedInstance["running"]["process"] != undefined && schedInstance["running"]["remaining"] == 0)
			{
				// Put finished running process in blocked
				var p = schedInstance["running"]["process"];
				
				var ioburst = p.getAttribute("ioBurst");
				
				var rX = /^(([0-9]+)(-([0-9]+))?)$/;
				var match = rX.exec(ioburst);
				
				if (match[4])
				{ // Burst is a range
					ioburst = p.random(parseInt(match[2]), parseInt(match[4]));
				}
				else
				{
					ioburst = parseInt(ioburst);
				}
				
				schedInstance["blocked"].push({
					"process" : p,
					"remaining" : ioburst,
					"tn" : schedInstance["running"]["tn"],
					"sn" : schedInstance["running"]["sn"]
				});
				
				// Remove it from running state
				schedInstance["running"]["process"] = undefined;
			}
			
			// 2. finished blocked? blocked -> ready
			var readyWaiting = schedInstance["ready"].length - schedInstance["arrivedThisTick"];
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					var p = schedInstance["blocked"][i]["process"];
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
					
					// Put finished blocked process in ready
					schedInstance["ready"].push({
						"process" : p,
						"remaining" : cpuburst,
						"tn" : schedInstance["blocked"][i]["tn"],
						"sn" : schedInstance["blocked"][i]["sn"]
					});
					
					// Rearrange ready list
					// All processes that got ready in this tick will be sorted by definition order
					var j = schedInstance["ready"].length - 1;
					
					while(j>readyWaiting && 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j]["process"]) < 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j-1]["process"]))
					{
						var tmp_P = schedInstance["ready"][j];
						schedInstance["ready"][j] = schedInstance["ready"][j-1];
						schedInstance["ready"][j-1] = tmp_P;
						j--;
					}
					
					// Mark remove index
					schedInstance["blocked"][i]["process"] = undefined;
				}
			}
			// Remove all marked as undefined
			for (var i = schedInstance["blocked"].length-1; i >= 0; i--)
			{
				if (schedInstance["blocked"][i]["process"] == undefined)
				{
					schedInstance["blocked"].splice(i, 1);
				}
			}
			
			// 3. nothing is running? min(ready) -> running
			// S_{n+1} = \alpha * T_n + (1 - \alpha) * S_n
			if (schedInstance["running"]["process"] == undefined && schedInstance["ready"].length > 0) {
				var alpha = parseFloat(self_.globalAttributes["weighting"]["value"]);
				
				var min = 0;
				
				// Find shortest process in ready list
				for (var j = 0; j < schedInstance["ready"].length; j++)
				{
					if (alpha * schedInstance["ready"][j]["tn"] + (1 - alpha) * schedInstance["ready"][j]["sn"]
						<
						alpha * schedInstance["ready"][min]["tn"] + (1 - alpha) * schedInstance["ready"][min]["sn"])
						min = j;
				}
				
				var p = schedInstance["ready"].splice(min, 1)[0];
				schedInstance["running"] = p;
				schedInstance["running"]["tn"] = schedInstance["running"]["remaining"];
				schedInstance["running"]["sn"] = alpha * schedInstance["running"]["remaining"] + (1 - alpha) * schedInstance["running"]["sn"];
			}
		};
	};
	
	// Strategy: Shortest Remaining Time (Knowledge)
	var SRT_K = new function () {
		var self_ = this;
		this.name = "Shortest Remaining Time (Knowledge)";
		this.globalAttributes = {};
		
		// This function needs to be called each time a strategy is selected
		this.setup = function() {
			// Stop current worker
			if (worker)
			{
				worker.terminate();
			}
			
			// Reset needed attributes
			// Always provide name as default
			Sched_ProcessDef.attributes = {"name" : Sched_ProcessDef.preDefinedAttributes["name"]};
			
			// Push needed attributes from predefined pool
			Sched_ProcessDef.attributes["arrival"] = Sched_ProcessDef.preDefinedAttributes["arrival"];
			Sched_ProcessDef.attributes["cpuBurst"] = Sched_ProcessDef.preDefinedAttributes["cpuBurst"];
			Sched_ProcessDef.attributes["ioBurst"] = Sched_ProcessDef.preDefinedAttributes["ioBurst"];
		};
		
		// Create a scheduling instance to deal with in the doSchedule() function
		this.getSchedInstance = function (involvedProcessesList) {
			var schedInstance = {};
			
			schedInstance["allProcesses"] = involvedProcessesList;
			
			// Process states
			schedInstance["running"] = {
				"process" : undefined,
				"remaining" : 0
			};
			schedInstance["ready"] = new Array();
			schedInstance["blocked"] = new Array();
			
			schedInstance["arrivedThisTick"] = 0;
			schedInstance["changedSignal"] = false;
			
			
			// Also create drawInstance
			var drawInstance = {
				"states": {
					"NONE" : {
						"name" : "Not started",
						"visible" : false,
						"type" : "NONE"
					},
					"RUNNING" : {
						"name" : "Running",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#0ac40a",
						"stroke" : "#007700"
					},
					"READY" : {
						"name" : "Ready",
						"visible" : true,
						"type" : "LINE",
						"stroke" : "#007700"
					},
					"BLOCKED" : {
						"name" : "Blocked",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#ffd6b8",
						"stroke" : "#dd874a"
					}
				},
				"tCount" : 0,
				"t" : {}
			};
			
			schedInstance["drawInstance"] = drawInstance;
			
			return schedInstance;
		};
		
		// Before doSchedule
		this.beforeDoSchedule = function(schedInstance, t) {
			// Reset changed signal
			schedInstance["changedSignal"] = false;
			schedInstance["finishedRunning"] = false;
			
			// Notify running process finished
			if (schedInstance["running"]["process"] != undefined)
			{
				if (schedInstance["running"]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
					schedInstance["finishedRunning"] = schedInstance["running"]["process"];
				}
			}
			
			// Notify blocked processes finished
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
				}
			}
			
			// This part handles process arrival
			schedInstance["arrivedThisTick"] = 0;
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				if (schedInstance["allProcesses"][i].getAttribute("arrival") == t)
				{
					var p = schedInstance["allProcesses"][i];
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
					
					// Put arrived process in ready list
					schedInstance["ready"].push({
						"process" : p,
						"remaining" : cpuburst
					});
					
					schedInstance["arrivedThisTick"]++;
					
					// Signal change
					schedInstance["changedSignal"] = true;
				}
			}
		};
		
		// After doSchedule
		this.afterDoSchedule = function(schedInstance, t) {
			// Handle running process
			if (schedInstance["running"]["process"] != undefined)
			{
				schedInstance["running"]["remaining"]--;
			}
			
			// Handle blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				schedInstance["blocked"][i]["remaining"]--;
			}
			
			
			// Update drawInstance
			
			schedInstance["drawInstance"]["tCount"] = t+1;
			
			var tNow = {};
			
			// Map changed signal in drawInstance
			tNow["poi"] = schedInstance["changedSignal"];
			tNow["finishedRunning"] = schedInstance["finishedRunning"] == false ? false : schedInstance["finishedRunning"].getAttribute("name");
			tNow["states"] = {};
			
			
			// Not yet arrived processes
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				// Assume every process has not arrived,
				// because the operations below will override the states
				tNow["states"][schedInstance["allProcesses"][i].getAttribute("name")] = "NONE";
			}
			
			// Running process
			if (schedInstance["running"]["process"] != undefined)
				tNow["states"][schedInstance["running"]["process"].getAttribute("name")] = "RUNNING";
			
			// Ready processes
			for (var i = 0; i < schedInstance["ready"].length; i++)
				tNow["states"][schedInstance["ready"][i]["process"].getAttribute("name")] = "READY";
			
			// Blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
				tNow["states"][schedInstance["blocked"][i]["process"].getAttribute("name")] = "BLOCKED";
			
			
			schedInstance["drawInstance"]["t"][t] = tNow;
			
		};
		
		// Schedule implementation
		this.doSchedule = function(schedInstance, t) {
			// DoSchedule will do the following:
			// 1. if processes arrived, set pre-empt flag
			// 2. finished running? running -> blocked
			// 3. finished blocked? blocked -> ready (set flag pre-empt is possible)
			// 4a. nothing is running? min(ready) -> running
			// 4b. if pre-empt flag set, lookout for shorter process
			
			
			// 1. if processes arrived, set pre-empt flag
			var preemptEnabled = false;
			if (schedInstance["arrivedThisTick"] > 0) preemptEnabled = true;
			
			// 2. finished running? running -> blocked
			if (schedInstance["running"]["process"] != undefined && schedInstance["running"]["remaining"] == 0)
			{
				// Put finished running process in blocked
				var p = schedInstance["running"]["process"];
				
				var ioburst = p.getAttribute("ioBurst");
				
				var rX = /^(([0-9]+)(-([0-9]+))?)$/;
				var match = rX.exec(ioburst);
				
				if (match[4])
				{ // Burst is a range
					ioburst = p.random(parseInt(match[2]), parseInt(match[4]));
				}
				else
				{
					ioburst = parseInt(ioburst);
				}
				
				schedInstance["blocked"].push({
					"process" : p,
					"remaining" : ioburst
				});
				
				// Remove it from running state
				schedInstance["running"]["process"] = undefined;
			}
			
			// 3. finished blocked? blocked -> ready (set flag pre-empt is possible)
			var readyWaiting = schedInstance["ready"].length - schedInstance["arrivedThisTick"];
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					preemptEnabled = true;
					
					var p = schedInstance["blocked"][i]["process"];
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
					
					// Put finished blocked process in ready
					schedInstance["ready"].push({
						"process" : p,
						"remaining" : cpuburst
					});
					
					// Rearrange ready list
					// All processes that got ready in this tick will be sorted by definition order
					var j = schedInstance["ready"].length - 1;
					
					while(j>readyWaiting && 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j]["process"]) < 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j-1]["process"]))
					{
						var tmp_P = schedInstance["ready"][j];
						schedInstance["ready"][j] = schedInstance["ready"][j-1];
						schedInstance["ready"][j-1] = tmp_P;
						j--;
					}
					
					// Mark remove index
					schedInstance["blocked"][i]["process"] = undefined;
				}
			}
			// Remove all marked as undefined
			for (var i = schedInstance["blocked"].length-1; i >= 0; i--)
			{
				if (schedInstance["blocked"][i]["process"] == undefined)
				{
					schedInstance["blocked"].splice(i, 1);
				}
			}
			
			// 4a. nothing is running? min(ready) -> running
			if (schedInstance["running"]["process"] == undefined && schedInstance["ready"].length > 0) {
				var min = 0;
				
				// Find shortest process in ready list
				for (var j = 0; j < schedInstance["ready"].length; j++)
				{
					if (schedInstance["ready"][j]["remaining"] < schedInstance["ready"][min]["remaining"])
						min = j;
				}
				
				var p = schedInstance["ready"].splice(min, 1)[0];
				schedInstance["running"] = p;
			}
			// 4b. if pre-empt flag set, lookout for shorter process
			else if (preemptEnabled)
			{
				var min = 0;
				
				// Find shortest process in ready list
				for (var j = 0; j < schedInstance["ready"].length; j++)
				{
					if (schedInstance["ready"][j]["remaining"] < schedInstance["ready"][min]["remaining"])
						min = j;
				}
				
				if (schedInstance["ready"][min]["remaining"] < schedInstance["running"]["remaining"])
				{
					var p = schedInstance["ready"].splice(min, 1)[0];
					
					// pre-empt this guy
					schedInstance["ready"].push(schedInstance["running"]);
					
					schedInstance["running"] = p;
				}
			}
		};
	};
	
	// Strategy: Shortest Remaining Time (Prediction)
	var SRT_P = new function () {
		var self_ = this;
		this.name = "Shortest Remaining Time (Prediction)";
		this.globalAttributes = {
			"weighting" : {
				"type" : "DECIMAL_FRACTION",
				"description" : "Weighting &alpha;",
				"value" : "0.70",
				"readOnly" : false
			}
		};
		
		// This function needs to be called each time a strategy is selected
		this.setup = function() {
			// Stop current worker
			if (worker)
			{
				worker.terminate();
			}
			
			// Reset needed attributes
			// Always provide name as default
			Sched_ProcessDef.attributes = {"name" : Sched_ProcessDef.preDefinedAttributes["name"]};
			
			// Push needed attributes from predefined pool
			Sched_ProcessDef.attributes["arrival"] = Sched_ProcessDef.preDefinedAttributes["arrival"];
			Sched_ProcessDef.attributes["cpuBurst"] = Sched_ProcessDef.preDefinedAttributes["cpuBurst"];
			Sched_ProcessDef.attributes["ioBurst"] = Sched_ProcessDef.preDefinedAttributes["ioBurst"];
		};
		
		// Create a scheduling instance to deal with in the doSchedule() function
		this.getSchedInstance = function (involvedProcessesList) {
			var schedInstance = {};
			
			schedInstance["allProcesses"] = involvedProcessesList;
			
			// Process states
			schedInstance["running"] = {
				"process" : undefined,
				"remaining" : 0,
				"tn" : 0,
				"sn" : 0,
				"n" : 0
			};
			schedInstance["ready"] = new Array();
			schedInstance["blocked"] = new Array();
			
			schedInstance["arrivedThisTick"] = 0;
			schedInstance["changedSignal"] = false;
			
			
			// Also create drawInstance
			var drawInstance = {
				"states": {
					"NONE" : {
						"name" : "Not started",
						"visible" : false,
						"type" : "NONE"
					},
					"RUNNING" : {
						"name" : "Running",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#0ac40a",
						"stroke" : "#007700"
					},
					"READY" : {
						"name" : "Ready",
						"visible" : true,
						"type" : "LINE",
						"stroke" : "#007700"
					},
					"BLOCKED" : {
						"name" : "Blocked",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#ffd6b8",
						"stroke" : "#dd874a"
					}
				},
				"tCount" : 0,
				"t" : {}
			};
			
			schedInstance["drawInstance"] = drawInstance;
			
			return schedInstance;
		};
		
		// Before doSchedule
		this.beforeDoSchedule = function(schedInstance, t) {
			// Reset changed signal
			schedInstance["changedSignal"] = false;
			schedInstance["finishedRunning"] = false;
			
			// Notify running process finished
			if (schedInstance["running"]["process"] != undefined)
			{
				if (schedInstance["running"]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
					schedInstance["finishedRunning"] = schedInstance["running"]["process"];
				}
			}
			
			// Notify blocked processes finished
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
				}
			}
			
			// This part handles process arrival
			schedInstance["arrivedThisTick"] = 0;
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				if (schedInstance["allProcesses"][i].getAttribute("arrival") == t)
				{
					var p = schedInstance["allProcesses"][i];
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
					
					// Put arrived process in ready list
					schedInstance["ready"].push({
						"process" : p,
						"remaining" : cpuburst,
						"tn" : 0,
						"sn" : 0,
						"n" : 0,
						"pre-empted" : false
					});
					
					schedInstance["arrivedThisTick"]++;
					
					// Signal change
					schedInstance["changedSignal"] = true;
				}
			}
		};
		
		// After doSchedule
		this.afterDoSchedule = function(schedInstance, t) {
			// Handle running process
			if (schedInstance["running"]["process"] != undefined)
			{
				schedInstance["running"]["remaining"]--;
			}
			
			// Handle blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				schedInstance["blocked"][i]["remaining"]--;
			}
			
			
			// Update drawInstance
			
			schedInstance["drawInstance"]["tCount"] = t+1;
			
			var tNow = {};
			
			// Map changed signal in drawInstance
			tNow["poi"] = schedInstance["changedSignal"];
			tNow["finishedRunning"] = schedInstance["finishedRunning"] == false ? false : schedInstance["finishedRunning"].getAttribute("name");
			tNow["states"] = {};
			
			
			// Not yet arrived processes
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				// Assume every process has not arrived,
				// because the operations below will override the states
				tNow["states"][schedInstance["allProcesses"][i].getAttribute("name")] = "NONE";
			}
			
			// Running process
			if (schedInstance["running"]["process"] != undefined)
				tNow["states"][schedInstance["running"]["process"].getAttribute("name")] = "RUNNING";
			
			// Ready processes
			for (var i = 0; i < schedInstance["ready"].length; i++)
				tNow["states"][schedInstance["ready"][i]["process"].getAttribute("name")] = "READY";
			
			// Blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
				tNow["states"][schedInstance["blocked"][i]["process"].getAttribute("name")] = "BLOCKED";
			
			
			schedInstance["drawInstance"]["t"][t] = tNow;
			
		};
		
		// Schedule implementation
		this.doSchedule = function(schedInstance, t) {
			// DoSchedule will do the following:
			// 1. if processes arrived, set pre-empt flag
			// 2. finished running? running -> blocked
			// 3. finished blocked? blocked -> ready (set flag pre-empt is possible)
			// 4a. nothing is running? min(ready) -> running
			// 4b. if pre-empt flag set, lookout for shorter process
			// 5. A process can only be pre-empted if both were running at least 1 complete cpu burst
			
			
			// 1. if processes arrived, set pre-empt flag
			var preemptEnabled = false;
			if (schedInstance["arrivedThisTick"] > 0) preemptEnabled = true;
			
			// 2. finished running? running -> blocked
			if (schedInstance["running"]["process"] != undefined && schedInstance["running"]["remaining"] == 0)
			{
				// Put finished running process in blocked
				var p = schedInstance["running"]["process"];
				
				var ioburst = p.getAttribute("ioBurst");
				
				var rX = /^(([0-9]+)(-([0-9]+))?)$/;
				var match = rX.exec(ioburst);
				
				if (match[4])
				{ // Burst is a range
					ioburst = p.random(parseInt(match[2]), parseInt(match[4]));
				}
				else
				{
					ioburst = parseInt(ioburst);
				}
				
				schedInstance["blocked"].push({
					"process" : p,
					"remaining" : ioburst,
					"tn" : schedInstance["running"]["tn"],
					"sn" : schedInstance["running"]["sn"],
					"n" : schedInstance["running"]["n"]+1,
					"pre-empted" : false
				});
				
				// Remove it from running state
				schedInstance["running"]["process"] = undefined;
			}
			
			// 3. finished blocked? blocked -> ready (set flag pre-empt is possible)
			var readyWaiting = schedInstance["ready"].length - schedInstance["arrivedThisTick"];
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					preemptEnabled = true;
					
					var p = schedInstance["blocked"][i]["process"];
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
					
					// Put finished blocked process in ready
					schedInstance["ready"].push({
						"process" : p,
						"remaining" : cpuburst,
						"tn" : schedInstance["blocked"][i]["tn"],
						"sn" : schedInstance["blocked"][i]["sn"],
						"n" : schedInstance["blocked"][i]["n"],
						"pre-empted" : schedInstance["blocked"][i]["pre-empted"]
					});
					
					// Rearrange ready list
					// All processes that got ready in this tick will be sorted by definition order
					var j = schedInstance["ready"].length - 1;
					
					while(j>readyWaiting && 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j]["process"]) < 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j-1]["process"]))
					{
						var tmp_P = schedInstance["ready"][j];
						schedInstance["ready"][j] = schedInstance["ready"][j-1];
						schedInstance["ready"][j-1] = tmp_P;
						j--;
					}
					
					// Mark remove index
					schedInstance["blocked"][i]["process"] = undefined;
				}
			}
			// Remove all marked as undefined
			for (var i = schedInstance["blocked"].length-1; i >= 0; i--)
			{
				if (schedInstance["blocked"][i]["process"] == undefined)
				{
					schedInstance["blocked"].splice(i, 1);
				}
			}
			
			// 4a. nothing is running? min(ready) -> running
			// S_{n+1} = \alpha * T_n + (1 - \alpha) * S_n
			if (schedInstance["running"]["process"] == undefined && schedInstance["ready"].length > 0) {
				var alpha = parseFloat(self_.globalAttributes["weighting"]["value"]);
				
				var min = 0;
				
				// Find shortest process in ready list
				for (var j = 0; j < schedInstance["ready"].length; j++)
				{
					if (alpha * schedInstance["ready"][j]["tn"] + (1 - alpha) * schedInstance["ready"][j]["sn"]
						<
						alpha * schedInstance["ready"][min]["tn"] + (1 - alpha) * schedInstance["ready"][min]["sn"])
						min = j;
				}
				
				var p = schedInstance["ready"].splice(min, 1)[0];
				schedInstance["running"] = p;
				if (!schedInstance["running"]["pre-empted"])
				{
					schedInstance["running"]["tn"] = schedInstance["running"]["remaining"];
					schedInstance["running"]["sn"] = alpha * schedInstance["running"]["remaining"] + (1 - alpha) * schedInstance["running"]["sn"];
				}
			}
			// 4b. if pre-empt flag set, lookout for shorter process
			else if (preemptEnabled && schedInstance["running"]["n"] > 0)
			{
				var alpha = parseFloat(self_.globalAttributes["weighting"]["value"]);
				
				var min = 0;
				
				// Find shortest process in ready list
				for (var j = 0; j < schedInstance["ready"].length; j++)
				{
					if (alpha * schedInstance["ready"][j]["tn"] + (1 - alpha) * schedInstance["ready"][j]["sn"]
						<
						alpha * schedInstance["ready"][min]["tn"] + (1 - alpha) * schedInstance["ready"][min]["sn"]
						&& schedInstance["ready"][j]["n"] > 0)
						min = j;
				}
				
				// Shortest predicted remaining time of min(ready) shorter then
				// predicted remaining time of running process - time it is already running?
				// 5. A process can only be pre-empted if both were running at least 1 complete cpu burst
				if (alpha * schedInstance["ready"][min]["tn"] + (1 - alpha) * schedInstance["ready"][min]["sn"]
					<
					schedInstance["running"]["sn"] - (schedInstance["running"]["tn"]-schedInstance["running"]["remaining"])
					&& schedInstance["ready"][min]["n"] > 0)
				{
					var p = schedInstance["ready"].splice(min, 1)[0];
					
					// pre-empt this guy
					var toPreempt = schedInstance["running"];
					// Correct its prediction vars to boost him next cycle
					toPreempt["tn"] = toPreempt["tn"] - (schedInstance["running"]["tn"]-schedInstance["running"]["remaining"]);
					toPreempt["sn"] = toPreempt["sn"] - alpha * (schedInstance["running"]["tn"]-schedInstance["running"]["remaining"]);
					toPreempt["pre-empted"] = true;
					schedInstance["ready"].push(toPreempt);
					
					schedInstance["running"] = p;
					schedInstance["running"]["tn"] = schedInstance["running"]["remaining"];
					schedInstance["running"]["sn"] = alpha * schedInstance["running"]["remaining"] + (1 - alpha) * schedInstance["running"]["sn"];
				}
			}
		};
	};
	
	// Strategy: Highest Response Ratio Next (Knowledge)
	var HRRN_K = new function () {
		var self_ = this;
		this.name = "Highest Response Ratio Next (Knowledge)";
		this.globalAttributes = {
			"preemption" : {
				"type" : "BOOL",
				"description" : "Preemption on process status change",
				"value" : "false",
				"readOnly" : false
			}
		};
		
		// This function needs to be called each time a strategy is selected
		this.setup = function() {
			// Stop current worker
			if (worker)
			{
				worker.terminate();
			}
			
			// Reset needed attributes
			// Always provide name as default
			Sched_ProcessDef.attributes = {"name" : Sched_ProcessDef.preDefinedAttributes["name"]};
			
			// Push needed attributes from predefined pool
			Sched_ProcessDef.attributes["arrival"] = Sched_ProcessDef.preDefinedAttributes["arrival"];
			Sched_ProcessDef.attributes["cpuBurst"] = Sched_ProcessDef.preDefinedAttributes["cpuBurst"];
			Sched_ProcessDef.attributes["ioBurst"] = Sched_ProcessDef.preDefinedAttributes["ioBurst"];
		};
		
		// Create a scheduling instance to deal with in the doSchedule() function
		this.getSchedInstance = function (involvedProcessesList) {
			var schedInstance = {};
			
			schedInstance["allProcesses"] = involvedProcessesList;
			
			// Process states
			schedInstance["running"] = {
				"process" : undefined,
				"remaining" : 0
			};
			schedInstance["ready"] = new Array();
			schedInstance["blocked"] = new Array();
			
			schedInstance["arrivedThisTick"] = 0;
			schedInstance["changedSignal"] = false;
			
			
			// Also create drawInstance
			var drawInstance = {
				"states": {
					"NONE" : {
						"name" : "Not started",
						"visible" : false,
						"type" : "NONE"
					},
					"RUNNING" : {
						"name" : "Running",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#0ac40a",
						"stroke" : "#007700"
					},
					"READY" : {
						"name" : "Ready",
						"visible" : true,
						"type" : "LINE",
						"stroke" : "#007700"
					},
					"BLOCKED" : {
						"name" : "Blocked",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#ffd6b8",
						"stroke" : "#dd874a"
					}
				},
				"tCount" : 0,
				"t" : {}
			};
			
			schedInstance["drawInstance"] = drawInstance;
			
			return schedInstance;
		};
		
		// Before doSchedule
		this.beforeDoSchedule = function(schedInstance, t) {
			// Reset changed signal
			schedInstance["changedSignal"] = false;
			schedInstance["finishedRunning"] = false;
			
			// Notify running process finished
			if (schedInstance["running"]["process"] != undefined)
			{
				if (schedInstance["running"]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
					schedInstance["finishedRunning"] = schedInstance["running"]["process"];
				}
			}
			
			// Notify blocked processes finished
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
				}
			}
			
			// This part handles process arrival
			schedInstance["arrivedThisTick"] = 0;
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				if (schedInstance["allProcesses"][i].getAttribute("arrival") == t)
				{
					var p = schedInstance["allProcesses"][i];
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
					
					// Put arrived process in ready list
					schedInstance["ready"].push({
						"process" : p,
						"remaining" : cpuburst,
						"waiting" : 0
					});
					
					schedInstance["arrivedThisTick"]++;
					
					// Signal change
					schedInstance["changedSignal"] = true;
				}
			}
		};
		
		// After doSchedule
		this.afterDoSchedule = function(schedInstance, t) {
			// Handle running process
			if (schedInstance["running"]["process"] != undefined)
			{
				schedInstance["running"]["remaining"]--;
			}
			
			// Handle blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				schedInstance["blocked"][i]["remaining"]--;
			}
			
			// Handle ready provesses
			for (var i = 0; i < schedInstance["ready"].length; i++)
			{
				schedInstance["ready"][i]["waiting"]++;
			}
			
			
			// Update drawInstance
			
			schedInstance["drawInstance"]["tCount"] = t+1;
			
			var tNow = {};
			
			// Map changed signal in drawInstance
			tNow["poi"] = schedInstance["changedSignal"];
			tNow["finishedRunning"] = schedInstance["finishedRunning"] == false ? false : schedInstance["finishedRunning"].getAttribute("name");
			tNow["states"] = {};
			
			
			// Not yet arrived processes
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				// Assume every process has not arrived,
				// because the operations below will override the states
				tNow["states"][schedInstance["allProcesses"][i].getAttribute("name")] = "NONE";
			}
			
			// Running process
			if (schedInstance["running"]["process"] != undefined)
				tNow["states"][schedInstance["running"]["process"].getAttribute("name")] = "RUNNING";
			
			// Ready processes
			for (var i = 0; i < schedInstance["ready"].length; i++)
				tNow["states"][schedInstance["ready"][i]["process"].getAttribute("name")] = "READY";
			
			// Blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
				tNow["states"][schedInstance["blocked"][i]["process"].getAttribute("name")] = "BLOCKED";
			
			
			schedInstance["drawInstance"]["t"][t] = tNow;
			
		};
		
		// Schedule implementation
		this.doSchedule = function(schedInstance, t) {
			// DoSchedule will do the following:
			// 1. if processes arrived, set pre-empt flag
			// 2. finished running? running -> blocked
			// 3. finished blocked? blocked -> ready (set flag pre-empt is possible)
			// 4a. nothing is running? max_r(ready) -> running
			// 4b. if pre-empt flag set, lookout for higher response process
			
			
			// 1. if processes arrived, set pre-empt flag
			var preemptEnabled = false;
			if (schedInstance["arrivedThisTick"] > 0 && self_.globalAttributes["preemption"]["value"] == "true") preemptEnabled = true;
			
			// 2. finished running? running -> blocked
			if (schedInstance["running"]["process"] != undefined && schedInstance["running"]["remaining"] == 0)
			{
				// Put finished running process in blocked
				var p = schedInstance["running"]["process"];
				
				var ioburst = p.getAttribute("ioBurst");
				
				var rX = /^(([0-9]+)(-([0-9]+))?)$/;
				var match = rX.exec(ioburst);
				
				if (match[4])
				{ // Burst is a range
					ioburst = p.random(parseInt(match[2]), parseInt(match[4]));
				}
				else
				{
					ioburst = parseInt(ioburst);
				}
				
				schedInstance["blocked"].push({
					"process" : p,
					"remaining" : ioburst
				});
				
				// Remove it from running state
				schedInstance["running"]["process"] = undefined;
			}
			
			// 3. finished blocked? blocked -> ready (set flag pre-empt is possible)
			var readyWaiting = schedInstance["ready"].length - schedInstance["arrivedThisTick"];
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					if (self_.globalAttributes["preemption"]["value"] == "true") preemptEnabled = true;
					
					var p = schedInstance["blocked"][i]["process"];
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
					
					// Put finished blocked process in ready
					schedInstance["ready"].push({
						"process" : p,
						"remaining" : cpuburst,
						"waiting" : 0
					});
					
					// Rearrange ready list
					// All processes that got ready in this tick will be sorted by definition order
					var j = schedInstance["ready"].length - 1;
					
					while(j>readyWaiting && 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j]["process"]) < 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j-1]["process"]))
					{
						var tmp_P = schedInstance["ready"][j];
						schedInstance["ready"][j] = schedInstance["ready"][j-1];
						schedInstance["ready"][j-1] = tmp_P;
						j--;
					}
					
					// Mark remove index
					schedInstance["blocked"][i]["process"] = undefined;
				}
			}
			// Remove all marked as undefined
			for (var i = schedInstance["blocked"].length-1; i >= 0; i--)
			{
				if (schedInstance["blocked"][i]["process"] == undefined)
				{
					schedInstance["blocked"].splice(i, 1);
				}
			}
			
			// Response formula (w+s)/s
			var r = function(w,s) {
				return (w+s)/s;
			};
			
			// 4a. nothing is running? max_r(ready) -> running
			if (schedInstance["running"]["process"] == undefined && schedInstance["ready"].length > 0) {
				var max = 0;
				
				// Find highest responding process in ready list
				for (var j = 0; j < schedInstance["ready"].length; j++)
				{
					if (r(schedInstance["ready"][j]["waiting"], schedInstance["ready"][j]["remaining"])
						>
						r(schedInstance["ready"][max]["waiting"], schedInstance["ready"][max]["remaining"])
						)
						max = j;
				}
				
				var p = schedInstance["ready"].splice(max, 1)[0];
				schedInstance["running"] = p;
			}
			// 4b. if pre-empt flag set, lookout for higher response process
			else if (preemptEnabled)
			{
				var max = 0;
				
				// Find highest responding process in ready list
				for (var j = 0; j < schedInstance["ready"].length; j++)
				{
					if (r(schedInstance["ready"][j]["waiting"], schedInstance["ready"][j]["remaining"])
						>
						r(schedInstance["ready"][max]["waiting"], schedInstance["ready"][max]["remaining"])
						)
						max = j;
				}
				
				if (r(schedInstance["ready"][max]["waiting"], schedInstance["ready"][max]["remaining"])
					>
					r(0, schedInstance["running"]["remaining"])
					)
				{
					var p = schedInstance["ready"].splice(max, 1)[0];
					
					// pre-empt this guy
					schedInstance["ready"].push(schedInstance["running"]);
					
					schedInstance["running"] = p;
				}
			}
		};
	};
	
	// Strategy: Highest Response Ratio Next (Prediction)
	var HRRN_P = new function () {
		var self_ = this;
		this.name = "Highest Response Ratio Next (Prediction)";
		this.globalAttributes = {
			"weighting" : {
				"type" : "DECIMAL_FRACTION",
				"description" : "Weighting &alpha;",
				"value" : "0.70",
				"readOnly" : false
			},
			"preemption" : {
				"type" : "BOOL",
				"description" : "Preemption on process status change",
				"value" : "false",
				"readOnly" : false
			}
		};
		
		// This function needs to be called each time a strategy is selected
		this.setup = function() {
			// Stop current worker
			if (worker)
			{
				worker.terminate();
			}
			
			// Reset needed attributes
			// Always provide name as default
			Sched_ProcessDef.attributes = {"name" : Sched_ProcessDef.preDefinedAttributes["name"]};
			
			// Push needed attributes from predefined pool
			Sched_ProcessDef.attributes["arrival"] = Sched_ProcessDef.preDefinedAttributes["arrival"];
			Sched_ProcessDef.attributes["cpuBurst"] = Sched_ProcessDef.preDefinedAttributes["cpuBurst"];
			Sched_ProcessDef.attributes["ioBurst"] = Sched_ProcessDef.preDefinedAttributes["ioBurst"];
		};
		
		// Create a scheduling instance to deal with in the doSchedule() function
		this.getSchedInstance = function (involvedProcessesList) {
			var schedInstance = {};
			
			schedInstance["allProcesses"] = involvedProcessesList;
			
			// Process states
			schedInstance["running"] = {
				"process" : undefined,
				"remaining" : 0,
				"tn" : 0,
				"sn" : 0,
				"n" : 0
			};
			schedInstance["ready"] = new Array();
			schedInstance["blocked"] = new Array();
			
			schedInstance["arrivedThisTick"] = 0;
			schedInstance["changedSignal"] = false;
			
			
			// Also create drawInstance
			var drawInstance = {
				"states": {
					"NONE" : {
						"name" : "Not started",
						"visible" : false,
						"type" : "NONE"
					},
					"RUNNING" : {
						"name" : "Running",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#0ac40a",
						"stroke" : "#007700"
					},
					"READY" : {
						"name" : "Ready",
						"visible" : true,
						"type" : "LINE",
						"stroke" : "#007700"
					},
					"BLOCKED" : {
						"name" : "Blocked",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#ffd6b8",
						"stroke" : "#dd874a"
					}
				},
				"tCount" : 0,
				"t" : {}
			};
			
			schedInstance["drawInstance"] = drawInstance;
			
			return schedInstance;
		};
		
		// Before doSchedule
		this.beforeDoSchedule = function(schedInstance, t) {
			// Reset changed signal
			schedInstance["changedSignal"] = false;
			schedInstance["finishedRunning"] = false;
			
			// Notify running process finished
			if (schedInstance["running"]["process"] != undefined)
			{
				if (schedInstance["running"]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
					schedInstance["finishedRunning"] = schedInstance["running"]["process"];
				}
			}
			
			// Notify blocked processes finished
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
				}
			}
			
			// This part handles process arrival
			schedInstance["arrivedThisTick"] = 0;
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				if (schedInstance["allProcesses"][i].getAttribute("arrival") == t)
				{
					var p = schedInstance["allProcesses"][i];
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
					
					// Put arrived process in ready list
					schedInstance["ready"].push({
						"process" : p,
						"remaining" : cpuburst,
						"tn" : 0,
						"sn" : 0,
						"n" : 0,
						"pre-empted" : false,
						"waiting" : 0
					});
					
					schedInstance["arrivedThisTick"]++;
					
					// Signal change
					schedInstance["changedSignal"] = true;
				}
			}
		};
		
		// After doSchedule
		this.afterDoSchedule = function(schedInstance, t) {
			// Handle running process
			if (schedInstance["running"]["process"] != undefined)
			{
				schedInstance["running"]["remaining"]--;
			}
			
			// Handle blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				schedInstance["blocked"][i]["remaining"]--;
			}
			
			// Handle ready provesses
			for (var i = 0; i < schedInstance["ready"].length; i++)
			{
				schedInstance["ready"][i]["waiting"]++;
			}
			
			
			// Update drawInstance
			
			schedInstance["drawInstance"]["tCount"] = t+1;
			
			var tNow = {};
			
			// Map changed signal in drawInstance
			tNow["poi"] = schedInstance["changedSignal"];
			tNow["finishedRunning"] = schedInstance["finishedRunning"] == false ? false : schedInstance["finishedRunning"].getAttribute("name");
			tNow["states"] = {};
			
			
			// Not yet arrived processes
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				// Assume every process has not arrived,
				// because the operations below will override the states
				tNow["states"][schedInstance["allProcesses"][i].getAttribute("name")] = "NONE";
			}
			
			// Running process
			if (schedInstance["running"]["process"] != undefined)
				tNow["states"][schedInstance["running"]["process"].getAttribute("name")] = "RUNNING";
			
			// Ready processes
			for (var i = 0; i < schedInstance["ready"].length; i++)
				tNow["states"][schedInstance["ready"][i]["process"].getAttribute("name")] = "READY";
			
			// Blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
				tNow["states"][schedInstance["blocked"][i]["process"].getAttribute("name")] = "BLOCKED";
			
			
			schedInstance["drawInstance"]["t"][t] = tNow;
			
		};
		
		// Schedule implementation
		this.doSchedule = function(schedInstance, t) {
			// DoSchedule will do the following:
			// 1. if processes arrived, set pre-empt flag
			// 2. finished running? running -> blocked
			// 3. finished blocked? blocked -> ready (set flag pre-empt is possible)
			// 4a. nothing is running? max_r(ready) -> running
			// 4b. if pre-empt flag set, lookout for higher response process
			// 5. A process can only be pre-empted if both were running at least 1 complete cpu burst
			
			
			// 1. if processes arrived, set pre-empt flag
			var preemptEnabled = false;
			if (schedInstance["arrivedThisTick"] > 0 && self_.globalAttributes["preemption"]["value"] == "true") preemptEnabled = true;
			
			// 2. finished running? running -> blocked
			if (schedInstance["running"]["process"] != undefined && schedInstance["running"]["remaining"] == 0)
			{
				// Put finished running process in blocked
				var p = schedInstance["running"]["process"];
				
				var ioburst = p.getAttribute("ioBurst");
				
				var rX = /^(([0-9]+)(-([0-9]+))?)$/;
				var match = rX.exec(ioburst);
				
				if (match[4])
				{ // Burst is a range
					ioburst = p.random(parseInt(match[2]), parseInt(match[4]));
				}
				else
				{
					ioburst = parseInt(ioburst);
				}
				
				schedInstance["blocked"].push({
					"process" : p,
					"remaining" : ioburst,
					"tn" : schedInstance["running"]["tn"],
					"sn" : schedInstance["running"]["sn"],
					"n" : schedInstance["running"]["n"]+1,
					"pre-empted" : false,
					"waiting" : 0
				});
				
				// Remove it from running state
				schedInstance["running"]["process"] = undefined;
			}
			
			// 3. finished blocked? blocked -> ready (set flag pre-empt is possible)
			var readyWaiting = schedInstance["ready"].length - schedInstance["arrivedThisTick"];
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					if (self_.globalAttributes["preemption"]["value"] == "true") preemptEnabled = true;
					
					var p = schedInstance["blocked"][i]["process"];
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
					
					// Put finished blocked process in ready
					schedInstance["ready"].push({
						"process" : p,
						"remaining" : cpuburst,
						"tn" : schedInstance["blocked"][i]["tn"],
						"sn" : schedInstance["blocked"][i]["sn"],
						"n" : schedInstance["blocked"][i]["n"],
						"pre-empted" : schedInstance["blocked"][i]["pre-empted"],
						"waiting": schedInstance["blocked"][i]["waiting"]
					});
					
					// Rearrange ready list
					// All processes that got ready in this tick will be sorted by definition order
					var j = schedInstance["ready"].length - 1;
					
					while(j>readyWaiting && 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j]["process"]) < 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j-1]["process"]))
					{
						var tmp_P = schedInstance["ready"][j];
						schedInstance["ready"][j] = schedInstance["ready"][j-1];
						schedInstance["ready"][j-1] = tmp_P;
						j--;
					}
					
					// Mark remove index
					schedInstance["blocked"][i]["process"] = undefined;
				}
			}
			// Remove all marked as undefined
			for (var i = schedInstance["blocked"].length-1; i >= 0; i--)
			{
				if (schedInstance["blocked"][i]["process"] == undefined)
				{
					schedInstance["blocked"].splice(i, 1);
				}
			}
			
			// Response formula (w+s)/s
			var r = function(w,s) {
				if (s==0) return 65535;
				return (w+s)/s;
			};
			
			// 4a. nothing is running? max_r(ready) -> running
			// S_{n+1} = \alpha * T_n + (1 - \alpha) * S_n
			if (schedInstance["running"]["process"] == undefined && schedInstance["ready"].length > 0) {
				var alpha = parseFloat(self_.globalAttributes["weighting"]["value"]);
				
				var max = 0;
				
				// Find highest responding process in ready list
				for (var j = 0; j < schedInstance["ready"].length; j++)
				{
					if (r(schedInstance["ready"][j]["waiting"], alpha * schedInstance["ready"][j]["tn"] + (1 - alpha) * schedInstance["ready"][j]["sn"])
						>
						r(schedInstance["ready"][max]["waiting"], alpha * schedInstance["ready"][max]["tn"] + (1 - alpha) * schedInstance["ready"][max]["sn"]))
						max = j;
				}
				
				var p = schedInstance["ready"].splice(max, 1)[0];
				schedInstance["running"] = p;
				if (!schedInstance["running"]["pre-empted"])
				{
					schedInstance["running"]["tn"] = schedInstance["running"]["remaining"];
					schedInstance["running"]["sn"] = alpha * schedInstance["running"]["remaining"] + (1 - alpha) * schedInstance["running"]["sn"];
				}
			}
			// 4b. if pre-empt flag set, lookout for higher response process
			else if (preemptEnabled && schedInstance["running"]["n"] > 0)
			{
				var alpha = parseFloat(self_.globalAttributes["weighting"]["value"]);
				
				var max = 0;
				
				// Find highest responding process in ready list
				for (var j = 0; j < schedInstance["ready"].length; j++)
				{
					if (r(schedInstance["ready"][j]["waiting"], alpha * schedInstance["ready"][j]["tn"] + (1 - alpha) * schedInstance["ready"][j]["sn"])
						>
						r(schedInstance["ready"][max]["waiting"], alpha * schedInstance["ready"][max]["tn"] + (1 - alpha) * schedInstance["ready"][max]["sn"])
						&& schedInstance["ready"][j]["n"] > 0)
						max = j;
				}
				
				// Response ratio of max_r(ready) higher then
				// response ratio of running process?
				// 5. A process can only be pre-empted if both were running at least 1 complete cpu burst
				if (r(schedInstance["ready"][max]["waiting"], alpha * schedInstance["ready"][max]["tn"] + (1 - alpha) * schedInstance["ready"][max]["sn"])
					>
					r(0, alpha * schedInstance["running"]["tn"] + (1 - alpha) * schedInstance["running"]["sn"])
					&& schedInstance["ready"][max]["n"] > 0)
				{
					var p = schedInstance["ready"].splice(max, 1)[0];
					
					// pre-empt this guy
					var toPreempt = schedInstance["running"];
					// Correct its prediction vars to boost him next cycle
					toPreempt["tn"] = toPreempt["tn"] - (schedInstance["running"]["tn"]-schedInstance["running"]["remaining"]);
					toPreempt["sn"] = toPreempt["sn"] - alpha * (schedInstance["running"]["tn"]-schedInstance["running"]["remaining"]);
					toPreempt["pre-empted"] = true;
					toPreempt["waiting"] = 0;
					schedInstance["ready"].push(toPreempt);
					
					schedInstance["running"] = p;
					schedInstance["running"]["tn"] = schedInstance["running"]["remaining"];
					schedInstance["running"]["sn"] = alpha * schedInstance["running"]["remaining"] + (1 - alpha) * schedInstance["running"]["sn"];
				}
			}
		};
	};
	
	// Strategy: Feedback
	var FB = new function () {
		var self_ = this;
		this.name = "Feedback";
		this.globalAttributes = {
			"levels" : {
				"type" : "NUMBER1TO10",
				"description" : "Level count",
				"value" : "5",
				"readOnly" : false
			},
			"anti-aging" : {
				"type" : "NUMBER+",
				"description" : "Anti-aging",
				"value" : "8",
				"readOnly" : false
			}
		};
		
		// This function needs to be called each time a strategy is selected
		this.setup = function() {
			// Stop current worker
			if (worker)
			{
				worker.terminate();
			}
			
			// Reset needed attributes
			// Always provide name as default
			Sched_ProcessDef.attributes = {"name" : Sched_ProcessDef.preDefinedAttributes["name"]};
			
			// Push needed attributes from predefined pool
			Sched_ProcessDef.attributes["arrival"] = Sched_ProcessDef.preDefinedAttributes["arrival"];
			Sched_ProcessDef.attributes["cpuBurst"] = Sched_ProcessDef.preDefinedAttributes["cpuBurst"];
			Sched_ProcessDef.attributes["ioBurst"] = Sched_ProcessDef.preDefinedAttributes["ioBurst"];
		};
		
		// Create a scheduling instance to deal with in the doSchedule() function
		this.getSchedInstance = function (involvedProcessesList) {
			var schedInstance = {};
			
			schedInstance["allProcesses"] = involvedProcessesList;
			
			// Process states
			schedInstance["running"] = {
				"process" : undefined,
				"remaining" : 0,
				"readyList" : 0,
				"timeSliceUsed" : 0
			};
			// Create n ready lists from 0 to n-1
			// with time slices 2^0 to 2^(n-1)
			schedInstance["ready"] = new Array();
			for (var i=0; i < parseInt(self_.globalAttributes["levels"]["value"]); i++)
			{
				schedInstance["ready"][i] = new Array();
			}
			schedInstance["blocked"] = new Array();
			
			schedInstance["arrivedThisTick"] = 0;
			schedInstance["changedSignal"] = false;
			
			
			// Also create drawInstance
			var drawInstance = {
				"states": {
					"NONE" : {
						"name" : "Not started",
						"visible" : false,
						"type" : "NONE"
					},
					"RUNNING" : {
						"name" : "Running",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#0ac40a",
						"stroke" : "#007700"
					},
					"READY" : {
						"name" : "Ready",
						"visible" : true,
						"type" : "LINE",
						"stroke" : "#007700"
					},
					"BLOCKED" : {
						"name" : "Blocked",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#ffd6b8",
						"stroke" : "#dd874a"
					}
				},
				"tCount" : 0,
				"t" : {}
			};
			
			schedInstance["drawInstance"] = drawInstance;
			
			return schedInstance;
		};
		
		// Before doSchedule
		this.beforeDoSchedule = function(schedInstance, t) {
			// Reset changed signal
			schedInstance["changedSignal"] = false;
			schedInstance["finishedRunning"] = false;
			
			// Notify running process finished or preempted
			if (schedInstance["running"]["process"] != undefined)
			{
				if (schedInstance["running"]["remaining"] == 0 || 
					schedInstance["running"]["timeSliceUsed"] == Math.pow(2,schedInstance["running"]["readyList"]))
				{
					schedInstance["changedSignal"] = true;
				}
				
				if (schedInstance["running"]["remaining"] == 0)
				{
					schedInstance["finishedRunning"] = schedInstance["running"]["process"];
				}
			}
			
			// Notify blocked processes finished
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
				}
			}
			
			// This part handles process arrival
			schedInstance["arrivedThisTick"] = 0;
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				if (schedInstance["allProcesses"][i].getAttribute("arrival") == t)
				{
					var p = schedInstance["allProcesses"][i];
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
					
					// Put arrived process in ready list
					schedInstance["ready"][0].push({
						"process" : p,
						"remaining" : cpuburst,
						"timeSliceUsed" : 0,
						"readyList" : 0,
						"waiting" : 0
					});
					
					schedInstance["arrivedThisTick"]++;
					
					// Signal change
					schedInstance["changedSignal"] = true;
				}
			}
		};
		
		// After doSchedule
		this.afterDoSchedule = function(schedInstance, t) {
			// Handle running process
			if (schedInstance["running"]["process"] != undefined)
			{
				schedInstance["running"]["remaining"]--;
				schedInstance["running"]["timeSliceUsed"]++;
			}
			
			// Handle blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				schedInstance["blocked"][i]["remaining"]--;
			}
			
			// Handle ready provesses
			for (var j = 0; j < schedInstance["ready"].length; j++)
			{
				for (var i = 0; i < schedInstance["ready"][j].length; i++)
				{
					schedInstance["ready"][j][i]["waiting"]++;
				}
			}
			
			
			// Update drawInstance
			
			schedInstance["drawInstance"]["tCount"] = t+1;
			
			var tNow = {};
			
			// Map changed signal in drawInstance
			tNow["poi"] = schedInstance["changedSignal"];
			tNow["finishedRunning"] = schedInstance["finishedRunning"] == false ? false : schedInstance["finishedRunning"].getAttribute("name");
			tNow["states"] = {};
			
			
			// Not yet arrived processes
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				// Assume every process has not arrived,
				// because the operations below will override the states
				tNow["states"][schedInstance["allProcesses"][i].getAttribute("name")] = "NONE";
			}
			
			// Running process
			if (schedInstance["running"]["process"] != undefined)
				tNow["states"][schedInstance["running"]["process"].getAttribute("name")] = "RUNNING";
			
			// Ready processes
			for (var j = 0; j < schedInstance["ready"].length; j++)
				for (var i = 0; i < schedInstance["ready"][j].length; i++)
					tNow["states"][schedInstance["ready"][j][i]["process"].getAttribute("name")] = "READY";
			
			// Blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
				tNow["states"][schedInstance["blocked"][i]["process"].getAttribute("name")] = "BLOCKED";
			
			
			schedInstance["drawInstance"]["t"][t] = tNow;
			
		};
		
		// Schedule implementation
		this.doSchedule = function(schedInstance, t) {
			// DoSchedule will do the following:
			// 1a. finished running? running -> blocked (store ready list)
			// 1b. pre-empted running? running -> store as preempted
			// 2. finished blocked? blocked -> ready (same list), time slice used 0
			// 3. Anti-aging? Look in every ready list and elevate the one, who waited > option, reset waiting
			// 4. Append pre-empted process as last process in ready list + 1, time slice used 0
			// 5. nothing is running? Traverse ready lists top down -> running (store listnumber)
			
			
			// 1a. finished running? running -> blocked (store ready list)
			if (schedInstance["running"]["process"] != undefined && schedInstance["running"]["remaining"] == 0)
			{
				// Put finished running process in blocked
				var p = schedInstance["running"]["process"];
				
				var ioburst = p.getAttribute("ioBurst");
				
				var rX = /^(([0-9]+)(-([0-9]+))?)$/;
				var match = rX.exec(ioburst);
				
				if (match[4])
				{ // Burst is a range
					ioburst = p.random(parseInt(match[2]), parseInt(match[4]));
				}
				else
				{
					ioburst = parseInt(ioburst);
				}
				
				schedInstance["blocked"].push({
					"process" : p,
					"remaining" : ioburst,
					"readyList" : schedInstance["running"]["readyList"]
				});
				
				// Remove it from running state
				schedInstance["running"]["process"] = undefined;
			}
			
			// 1b. pre-empted running? running -> store as preempted
			var preempted = undefined;
			if (schedInstance["running"]["process"] != undefined && 
				schedInstance["running"]["timeSliceUsed"] == Math.pow(2,schedInstance["running"]["readyList"]))
			{
				// Pre-empt process
				
				// New ready list is:
				var rL = schedInstance["running"]["readyList"];
				if (rL + 1 < parseInt(self_.globalAttributes["levels"]["value"]))
					rL++;
				
				preempted = {
					"process" : schedInstance["running"]["process"],
					"remaining" : schedInstance["running"]["remaining"],
					"timeSliceUsed" : 0,
					"readyList" : rL,
					"waiting" : 0
				};
				
				// Remove it from running state
				schedInstance["running"]["process"] = undefined;
			}
			
			// 2. finished blocked? blocked -> ready (same list), time slice used 0
			var readyWaiting = schedInstance["ready"][0].length - schedInstance["arrivedThisTick"];
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					// Put finished blocked process in ready
					var p = schedInstance["blocked"][i]["process"];
					
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
					
					schedInstance["ready"][schedInstance["blocked"][i]["readyList"]].push({
						"process" : p,
						"remaining" : cpuburst,
						"timeSliceUsed" : 0,
						"readyList" : schedInstance["blocked"][i]["readyList"],
						"waiting" : 0
					});
					
					// Rearrange ready list
					// All processes that got ready in this tick will be sorted by definition order
					var j = schedInstance["ready"][0].length - 1;
					
					while(j>readyWaiting && 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][0][j]["process"]) < 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][0][j-1]["process"]))
					{
						var tmp_P = schedInstance["ready"][0][j];
						schedInstance["ready"][0][j] = schedInstance["ready"][0][j-1];
						schedInstance["ready"][0][j-1] = tmp_P;
						j--;
					}
					
					// Mark remove index
					schedInstance["blocked"][i]["process"] = undefined;
				}
			}
			// Remove all marked as undefined
			for (var i = schedInstance["blocked"].length-1; i >= 0; i--)
			{
				if (schedInstance["blocked"][i]["process"] == undefined)
				{
					schedInstance["blocked"].splice(i, 1);
				}
			}
			
			// 3. Anti-aging? Look in every ready list and elevate the one, who waited > option, reset waiting
			for (var j = 1; j < schedInstance["ready"].length; j++)
			{
				var thisList = new Array();
				for (var i = 0; i < schedInstance["ready"][j].length; i++)
				{
					if (schedInstance["ready"][j][i]["waiting"] == parseInt(self_.globalAttributes["anti-aging"]["value"]))
					{
						schedInstance["ready"][j-1].push(schedInstance["ready"][j][i]);
						schedInstance["ready"][j][i]["waiting"] = 0;
						schedInstance["ready"][j][i]["readyList"]--;
					}
					else
					{
						thisList.push(schedInstance["ready"][j][i]);
					}
				}
				schedInstance["ready"][j] = thisList;
			}
			
			// 4. Append pre-empted process as last process in ready list + 1, time slice used 0
			if (preempted != undefined)
			{
				schedInstance["ready"][preempted["readyList"]].push(preempted);
			}
			
			// 5. nothing is running? Traverse ready lists top down -> running (store listnumber)
			if (schedInstance["running"]["process"] == undefined) {
				for (var j = 0; j < schedInstance["ready"].length; j++)
				{
					if (schedInstance["ready"][j].length > 0)
					{
						var p = schedInstance["ready"][j].shift();
						schedInstance["running"] = p;
						
						break;
					}
				}
			}
		};
	};
	
	// Strategy: Fixed Priority (Non-preemptive)
	var FP_NP = new function () {
		var self_ = this;
		this.name = "Fixed Priority (Non-preemptive)";
		this.globalAttributes = {};
		
		// This function needs to be called each time a strategy is selected
		this.setup = function() {
			// Stop current worker
			if (worker)
			{
				worker.terminate();
			}
			
			// Reset needed attributes
			// Always provide name as default
			Sched_ProcessDef.attributes = {"name" : Sched_ProcessDef.preDefinedAttributes["name"]};
			
			// Push needed attributes from predefined pool
			Sched_ProcessDef.attributes["arrival"] = Sched_ProcessDef.preDefinedAttributes["arrival"];
			Sched_ProcessDef.attributes["cpuBurst"] = Sched_ProcessDef.preDefinedAttributes["cpuBurst"];
			Sched_ProcessDef.attributes["ioBurst"] = Sched_ProcessDef.preDefinedAttributes["ioBurst"];
			Sched_ProcessDef.attributes["priority"] = Sched_ProcessDef.preDefinedAttributes["priority"];
		};
		
		// Create a scheduling instance to deal with in the doSchedule() function
		this.getSchedInstance = function (involvedProcessesList) {
			var schedInstance = {};
			
			schedInstance["allProcesses"] = involvedProcessesList;
			
			// Process states
			schedInstance["running"] = {
				"process" : undefined,
				"remaining" : 0
			};
			schedInstance["ready"] = new Array();
			schedInstance["blocked"] = new Array();
			
			schedInstance["arrivedThisTick"] = 0;
			schedInstance["changedSignal"] = false;
			
			
			// Also create drawInstance
			var drawInstance = {
				"states": {
					"NONE" : {
						"name" : "Not started",
						"visible" : false,
						"type" : "NONE"
					},
					"RUNNING" : {
						"name" : "Running",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#0ac40a",
						"stroke" : "#007700"
					},
					"READY" : {
						"name" : "Ready",
						"visible" : true,
						"type" : "LINE",
						"stroke" : "#007700"
					},
					"BLOCKED" : {
						"name" : "Blocked",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#ffd6b8",
						"stroke" : "#dd874a"
					}
				},
				"tCount" : 0,
				"t" : {}
			};
			
			schedInstance["drawInstance"] = drawInstance;
			
			return schedInstance;
		};
		
		// Before doSchedule
		this.beforeDoSchedule = function(schedInstance, t) {
			// Reset changed signal
			schedInstance["changedSignal"] = false;
			schedInstance["finishedRunning"] = false;
			
			// Notify running process finished
			if (schedInstance["running"]["process"] != undefined)
			{
				if (schedInstance["running"]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
					schedInstance["finishedRunning"] = schedInstance["running"]["process"];
				}
			}
			
			// Notify blocked processes finished
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
				}
			}
			
			// This part handles process arrival
			schedInstance["arrivedThisTick"] = 0;
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				if (schedInstance["allProcesses"][i].getAttribute("arrival") == t)
				{
					// Put arrived process in ready list
					schedInstance["ready"].push(schedInstance["allProcesses"][i]);
					
					schedInstance["arrivedThisTick"]++;
					
					// Signal change
					schedInstance["changedSignal"] = true;
				}
			}
		};
		
		// After doSchedule
		this.afterDoSchedule = function(schedInstance, t) {
			// Handle running process
			if (schedInstance["running"]["process"] != undefined)
			{
				schedInstance["running"]["remaining"]--;
			}
			
			// Handle blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				schedInstance["blocked"][i]["remaining"]--;
			}
			
			
			// Update drawInstance
			
			schedInstance["drawInstance"]["tCount"] = t+1;
			
			var tNow = {};
			
			// Map changed signal in drawInstance
			tNow["poi"] = schedInstance["changedSignal"];
			tNow["finishedRunning"] = schedInstance["finishedRunning"] == false ? false : schedInstance["finishedRunning"].getAttribute("name");
			tNow["states"] = {};
			
			
			// Not yet arrived processes
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				// Assume every process has not arrived,
				// because the operations below will override the states
				tNow["states"][schedInstance["allProcesses"][i].getAttribute("name")] = "NONE";
			}
			
			// Running process
			if (schedInstance["running"]["process"] != undefined)
				tNow["states"][schedInstance["running"]["process"].getAttribute("name")] = "RUNNING";
			
			// Ready processes
			for (var i = 0; i < schedInstance["ready"].length; i++)
				tNow["states"][schedInstance["ready"][i].getAttribute("name")] = "READY";
			
			// Blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
				tNow["states"][schedInstance["blocked"][i]["process"].getAttribute("name")] = "BLOCKED";
			
			
			schedInstance["drawInstance"]["t"][t] = tNow;
			
		};
		
		// Schedule implementation
		this.doSchedule = function(schedInstance, t) {
			// DoSchedule will do the following:
			// 1. finished running? running -> blocked
			// 2. finished blocked? blocked -> ready
			// 3. nothing is running? ready -> running (run process with highest priority)
			
			
			// 1. finished running? running -> blocked
			if (schedInstance["running"]["process"] != undefined && schedInstance["running"]["remaining"] == 0)
			{
				// Put finished running process in blocked
				var p = schedInstance["running"]["process"];
				
				var ioburst = p.getAttribute("ioBurst");
				
				var rX = /^(([0-9]+)(-([0-9]+))?)$/;
				var match = rX.exec(ioburst);
				
				if (match[4])
				{ // Burst is a range
					ioburst = p.random(parseInt(match[2]), parseInt(match[4]));
				}
				else
				{
					ioburst = parseInt(ioburst);
				}
				
				schedInstance["blocked"].push({
					"process" : p,
					"remaining" : ioburst
				});
				
				// Remove it from running state
				schedInstance["running"]["process"] = undefined;
			}
			
			// 2. finished blocked? blocked -> ready
			var readyWaiting = schedInstance["ready"].length - schedInstance["arrivedThisTick"];
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					// Put finished blocked process in ready
					schedInstance["ready"].push(schedInstance["blocked"][i]["process"]);
					
					// Rearrange ready list
					// All processes that got ready in this tick will be sorted by definition order
					var j = schedInstance["ready"].length - 1;
					
					while(j>readyWaiting && 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j]) < 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j-1]))
					{
						var tmp_P = schedInstance["ready"][j];
						schedInstance["ready"][j] = schedInstance["ready"][j-1];
						schedInstance["ready"][j-1] = tmp_P;
						j--;
					}
					
					// Mark remove index
					schedInstance["blocked"][i]["process"] = undefined;
				}
			}
			// Remove all marked as undefined
			for (var i = schedInstance["blocked"].length-1; i >= 0; i--)
			{
				if (schedInstance["blocked"][i]["process"] == undefined)
				{
					schedInstance["blocked"].splice(i, 1);
				}
			}
			
			// 3. nothing is running? ready -> running (run process with highest priority)
			if (schedInstance["running"]["process"] == undefined && schedInstance["ready"].length > 0) {
				var minPrio = 0;
				
				for (var j = 1; j < schedInstance["ready"].length; j++)
				{
					if (parseInt(schedInstance["ready"][j].getAttribute("priority")) < parseInt(schedInstance["ready"][minPrio].getAttribute("priority")))
						minPrio = j;
				}
				
				var p = schedInstance["ready"].splice(minPrio, 1)[0];
				
				var cpuburst = p.getAttribute("cpuBurst");
				
				var rX = /^(([0-9]+)(-([0-9]+))?)$/;
				var match = rX.exec(cpuburst);
				
				if (match[4])
				{ // Burst is a range
					cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
				}
				else
				{
					cpuburst = parseInt(cpuburst);
				}
				
				schedInstance["running"]["process"] = p;
				schedInstance["running"]["remaining"] = cpuburst;
			}
		};
	};
	
	// Strategy: CUSTOM (User defined)
	var CUSTOM = new function () {
		var self_ = this;
		var s_Pos;
		var nextTick_;
		var schedInstance_;
		var state;
		var noResponseTimeout;
		this.name = "CUSTOM (User defined)";
		this.globalAttributes = {};
		
		// This is the user defined doSchedule
		this.userCode = "/* -------------------------------------------------------\r\n * User scripting 1.0b\r\n * -------------------------------------------------------\r\n * Here you can define your own scheduling strategy,\r\n * or try to implement an existing one on your own.\r\n * \r\n * You can use the writeConsole(msg) function to write\r\n * a message into the console.\r\n * \r\n * If you find any bugs, don't forget to report them!\r\n * You can define your own global variables and functions!\r\n * \r\n * Happy coding!\r\n * -------------------------------------------------------\r\n*/\r\n\r\n/* -------------------------------------------------------\r\n * doSchedule()\r\n * -------------------------------------------------------\r\n * This is the main function, which is called every tick.\r\n * \r\n * Parameters:\r\n * \r\n * t: The tick (int)\r\n * priorityOrder: Array containing all processes in defined order\r\n * ready: Array containing all processes, which are ready in this tick\r\n * running: undefined if none is running or containing the running process\r\n * \r\n * For any process you have access to the following members:\r\n *   name, arrival, cpuBurst, ioBurst, remaining\r\n * Keep in mind, that everything is a string and has to be casted\r\n * using parseInt() for instance before use.\r\n * The burst values can be intervals as specified in the process definition.\r\n * \r\n * Return value:\r\n * \r\n * Index in ready for next process to run or -1 to keep it as is.\r\n * Also you can make the cpu idle by returning -2.\r\n * \r\n * On preemption or idleing the currently running process will be pushed\r\n * to the end of the ready list with its remaining time.\r\n * -------------------------------------------------------\r\n*/\r\nfunction doSchedule(t, priorityOrder, ready, running) {\r\n    // Run First-Come First-Served for the first 100 ticks, then switch\r\n    if (t<100)\r\n        return firstComeFirstServed(t, priorityOrder, ready, running);\r\n    else\r\n        return roundRobin(t, priorityOrder, ready, running);\r\n}\r\n\r\n// Helper function to implement First-Come First-Served\r\nfunction firstComeFirstServed(t, priorityOrder, ready, running) {\r\n    /*\r\n     * If none is running or the running process has finished\r\n     * and there is at least one process ready,\r\n     * run the first process from ready list.\r\n    */\r\n    if ((running == undefined || parseInt(running.remaining) == 0)\r\n        && ready.length >= 1)\r\n        return 0;\r\n    \r\n    // Running process has not finished yet or no process is ready.\r\n    return -1;\r\n}\r\n\r\n// Helper variables for Round Robin\r\nvar timeSlice = 2;\r\nvar timeSliceUsed = 1;\r\n// Helper function to implement Round Robin\r\nfunction roundRobin(t, priorityOrder, ready, running) {\r\n    /*\r\n     * If none is running or the running process has finished\r\n     * or used his time slice and there is at least one process ready,\r\n     * run the first process from ready list.\r\n    */\r\n    if ((running == undefined || parseInt(running.remaining) == 0 \r\n        || timeSliceUsed == timeSlice)\r\n        && ready.length >= 1)\r\n    {\r\n        // Run the next process and reset his time slice\r\n        timeSliceUsed = 1;\r\n        return 0;\r\n    }\r\n    else if (timeSliceUsed == timeSlice && ready.length == 0)\r\n    {\r\n        // No other process is ready, get a new time slice\r\n        timeSliceUsed = 1;\r\n    }\r\n    else if (timeSliceUsed < timeSlice)\r\n    {\r\n        // Time slice not fully used; continue\r\n        timeSliceUsed++;\r\n    }\r\n    \r\n    // Running process has not finished or used its time slice yet,\r\n    // or no process is ready.\r\n    return -1;\r\n}";
		
		var workerCode = function() {
			"USER_CODE_REPLACE"
			
			// Helper functions to get something out into console
			var writeConsoleHandler = new function() {
				var sentMessages = 0;
				
				this.writeInConsole = function(text)
				{
					if (text == undefined) text = "undefined";
					if (sentMessages < 200)
					{
						postMessage({"ret" : "writeConsole", "text" : text.toString()});
						sentMessages++;
					}
					else if (sentMessages == 200)
					{
						postMessage({"ret" : "writeConsole", "text" : "You have reached the limit number of messages!"});
						sentMessages++;
					}
				};
			};
			
			// User call this function to write out into console
			function writeConsole(text) {
				writeConsoleHandler.writeInConsole(text);
			}
			
			// Got Message to schedule stuff
			onmessage = function(e) {
				// Helper function to check, if an object is empty
				var isEmpty = function(obj) {
					for (var prop in obj) {
						if (obj.hasOwnProperty(prop))
							return false;
					}
					return true;
				};
				
				if (e.data["cmd"] == "doSchedule")
				{
					// Simplify the handling with objects
					var t = parseInt(e.data["t"]);
					
					var priorityOrder = JSON.parse(e.data["priorityOrder"]);
					
					var ready = JSON.parse(e.data["ready"]);
					
					var running = JSON.parse(e.data["running"]);
					if (isEmpty(running))
					{
						running = undefined;
					}
					
					// Call doSchedule
					// nextProcess is an index value for the process in ready list which will be scheduled next or -1 for staying unchanged
					var nextProcess = doSchedule(e.data["t"], priorityOrder, ready, running);
					
					postMessage({"ret" : "doSchedule", "t" : t, "scheduleNext" : parseInt(nextProcess)});
				}
			};
		};
		
		var messageHandler = function (event) {
			if (state == "doSchedule" && event.data["ret"] == "doSchedule" && event.data["t"] == s_Pos)
			{
				clearTimeout(noResponseTimeout);
				
				// 3. Get new process to run from user custom implementation (nothing running or act as preemted when time not fully used)
				var nextProcess = parseInt(event.data["scheduleNext"])
				if (nextProcess != -1 && nextProcess >= 0 && nextProcess < schedInstance_["ready"].length)
				{
					// nothing is running? ready -> running (run process with index provided)
					if (schedInstance_["running"]["process"] != undefined)
					{
						schedInstance_["ready"].push(schedInstance_["running"]);
					}
					
					schedInstance_["running"] = schedInstance_["ready"][nextProcess];
					schedInstance_["ready"].splice(nextProcess, 1);
					
					// Signal change
					schedInstance_["changedSignal"] = true;
				}
				else if (nextProcess == -2 && schedInstance_["running"]["process"] != undefined)
				{
					// Idle the cpu
					schedInstance_["ready"].push(schedInstance_["running"]);
					schedInstance_["running"] = {
						"process" : undefined,
						"remaining" : schedInstance_["running"]["remaining"]
					};
					
					// Signal change
					schedInstance_["changedSignal"] = true;
				}
				
				self_.afterDoSchedule(schedInstance_, s_Pos);
				
				// Finished tick, look if another tick needs to be performed
				if (nextTick_())
				{
					s_Pos++;
					self_.beforeDoSchedule(schedInstance_, s_Pos);
					self_.doSchedule(schedInstance_, s_Pos);
				}
				else
				{
					worker.terminate();
					state = "end";
				}
			}
			else if (event.data["ret"] == "writeConsole")
			{
				Console.log("CUSTOM-MESSAGE: " + event.data["text"].toString().replace(/</g, "&lt;").replace(/>/g, "&gt;"));
			}
		};
		
		var codeNotResponding = function() {
			Tooltip.warn("Your custom code is not responding on position " + s_Pos + " in simulation!", 7);
			if (worker)
			{
				worker.terminate();
			}
		};
		
		// This function needs to be called each time a strategy is selected
		this.setup = function() {
			// Position in simulation
			s_Pos = 0;
			state = "doSchedule";
			
			// check if Worker API is available in this browser
			if(typeof(Worker)==="undefined") {
				Tooltip.warn("No browser support for background processes!", 10);
			}
			else
			{
				// Stop current worker
				if (worker)
				{
					worker.terminate();
				}
				
				// The code in the form of a string
				var cleanedCode = self_.userCode;
				var cleanWasPossible = true;
				while(cleanWasPossible)
				{
					var beforeClean = cleanedCode;
					cleanedCode = cleanedCode.replace('.__proto__', '');
					cleanedCode = cleanedCode.replace('onmessage', '');
					cleanedCode = cleanedCode.replace('postMessage', '');
					cleanedCode = cleanedCode.replace('console.log', 'writeConsole');
					cleanedCode = cleanedCode.replace('console', '');
					if (beforeClean == cleanedCode)
						cleanWasPossible = false;
				}
				
				cleanedCode = (workerCode.toString()).replace('"USER_CODE_REPLACE"', '\n' + cleanedCode + '\n');
				
				var code = '(function(){"use strict";' + clearEnv + '('
					+ cleanedCode
					+ ')();' + '})();';
				
				// Obtain a blob URL reference to our virtual worker 'file'.
				var blob = new Blob([code]);
				var blobURL = window.URL.createObjectURL(blob);
				worker = new Worker(blobURL);
				
				worker.onmessage = messageHandler;
			}
			
			// Reset needed attributes
			// Always provide name as default
			Sched_ProcessDef.attributes = {"name" : Sched_ProcessDef.preDefinedAttributes["name"]};
			
			// Push needed attributes from predefined pool
			Sched_ProcessDef.attributes["arrival"] = Sched_ProcessDef.preDefinedAttributes["arrival"];
			Sched_ProcessDef.attributes["cpuBurst"] = Sched_ProcessDef.preDefinedAttributes["cpuBurst"];
			Sched_ProcessDef.attributes["ioBurst"] = Sched_ProcessDef.preDefinedAttributes["ioBurst"];
		};
		
		// Create a scheduling instance to deal with in the doSchedule() function
		this.getSchedInstance = function (involvedProcessesList) {
			var schedInstance = {};
			
			schedInstance["allProcesses"] = involvedProcessesList;
			
			// Process states
			schedInstance["running"] = {
				"process" : undefined,
				"remaining" : 0
			};
			schedInstance["ready"] = new Array();
			schedInstance["blocked"] = new Array();
			
			schedInstance["arrivedThisTick"] = 0;
			schedInstance["changedSignal"] = false;
			
			
			// Also create drawInstance
			var drawInstance = {
				"states": {
					"NONE" : {
						"name" : "Not started",
						"visible" : false,
						"type" : "NONE"
					},
					"RUNNING" : {
						"name" : "Running",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#0ac40a",
						"stroke" : "#007700"
					},
					"READY" : {
						"name" : "Ready",
						"visible" : true,
						"type" : "LINE",
						"stroke" : "#007700"
					},
					"BLOCKED" : {
						"name" : "Blocked",
						"visible" : true,
						"type" : "BLOCK",
						"fill" : "#ffd6b8",
						"stroke" : "#dd874a"
					}
				},
				"tCount" : 0,
				"t" : {}
			};
			
			schedInstance["drawInstance"] = drawInstance;
			
			return schedInstance;
		};
		
		// Before doSchedule
		this.beforeDoSchedule = function(schedInstance, t) {
			// Reset changed signal
			schedInstance["changedSignal"] = false;
			schedInstance["finishedRunning"] = false;
			
			// Notify running process finished
			if (schedInstance["running"]["process"] != undefined)
			{
				if (schedInstance["running"]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
					schedInstance["finishedRunning"] = schedInstance["running"]["process"];
				}
			}
			
			// Notify blocked processes finished
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					schedInstance["changedSignal"] = true;
				}
			}
			
			// This part handles process arrival
			schedInstance["arrivedThisTick"] = 0;
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				if (schedInstance["allProcesses"][i].getAttribute("arrival") == t)
				{
					// Put arrived process in ready list
					var p = schedInstance["allProcesses"][i];
					
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
					
					schedInstance["ready"].push({
						"process" : p,
						"remaining" : cpuburst
					});
					
					schedInstance["arrivedThisTick"]++;
					
					// Signal change
					schedInstance["changedSignal"] = true;
				}
			}
		};
		
		// After doSchedule
		this.afterDoSchedule = function(schedInstance, t) {
			// Handle running process
			if (schedInstance["running"]["process"] != undefined)
			{
				schedInstance["running"]["remaining"]--;
			}
			
			// Handle blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				schedInstance["blocked"][i]["remaining"]--;
			}
			
			
			// Update drawInstance
			
			schedInstance["drawInstance"]["tCount"] = t+1;
			
			var tNow = {};
			
			// Map changed signal in drawInstance
			tNow["poi"] = schedInstance["changedSignal"];
			tNow["finishedRunning"] = schedInstance["finishedRunning"] == false ? false : schedInstance["finishedRunning"].getAttribute("name");
			tNow["states"] = {};
			
			
			// Not yet arrived processes
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
			{
				// Assume every process has not arrived,
				// because the operations below will override the states
				tNow["states"][schedInstance["allProcesses"][i].getAttribute("name")] = "NONE";
			}
			
			// Running process
			if (schedInstance["running"]["process"] != undefined)
				tNow["states"][schedInstance["running"]["process"].getAttribute("name")] = "RUNNING";
			
			// Ready processes
			for (var i = 0; i < schedInstance["ready"].length; i++)
				tNow["states"][schedInstance["ready"][i]["process"].getAttribute("name")] = "READY";
			
			// Blocked processes
			for (var i = 0; i < schedInstance["blocked"].length; i++)
				tNow["states"][schedInstance["blocked"][i]["process"].getAttribute("name")] = "BLOCKED";
			
			
			schedInstance["drawInstance"]["t"][t] = tNow;
			
		};
		
		// Schedule implementation
		this.doSchedule = function(schedInstance, t) {
			// 1. finished running? running -> blocked
			if (schedInstance["running"]["process"] != undefined && schedInstance["running"]["remaining"] == 0)
			{
				// Put finished running process in blocked
				var p = schedInstance["running"]["process"];
				
				var ioburst = p.getAttribute("ioBurst");
				
				var rX = /^(([0-9]+)(-([0-9]+))?)$/;
				var match = rX.exec(ioburst);
				
				if (match[4])
				{ // Burst is a range
					ioburst = p.random(parseInt(match[2]), parseInt(match[4]));
				}
				else
				{
					ioburst = parseInt(ioburst);
				}
				
				schedInstance["blocked"].push({
					"process" : p,
					"remaining" : ioburst
				});
				
				// Remove it from running state
				schedInstance["running"]["process"] = undefined;
			}
		
			// 2. finished blocked? blocked -> ready
			var readyWaiting = schedInstance["ready"].length - schedInstance["arrivedThisTick"];
			for (var i = 0; i < schedInstance["blocked"].length; i++)
			{
				if (schedInstance["blocked"][i]["remaining"] == 0)
				{
					// Put finished blocked process in ready
					var p = schedInstance["blocked"][i]["process"];
					
					var cpuburst = p.getAttribute("cpuBurst");
					
					var rX = /^(([0-9]+)(-([0-9]+))?)$/;
					var match = rX.exec(cpuburst);
					
					if (match[4])
					{ // Burst is a range
						cpuburst = p.random(parseInt(match[2]), parseInt(match[4]));
					}
					else
					{
						cpuburst = parseInt(cpuburst);
					}
					
					schedInstance["ready"].push({
						"process" : p,
						"remaining" : cpuburst
					});
					
					// Rearrange ready list
					// All processes that got ready in this tick will be sorted by definition order
					var j = schedInstance["ready"].length - 1;
					
					while(j>readyWaiting && 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j]["process"]) < 
						schedInstance["allProcesses"].indexOf(schedInstance["ready"][j-1]["process"]))
					{
						var tmp_P = schedInstance["ready"][j];
						schedInstance["ready"][j] = schedInstance["ready"][j-1];
						schedInstance["ready"][j-1] = tmp_P;
						j--;
					}
					
					// Mark remove index
					schedInstance["blocked"][i]["process"] = undefined;
				}
			}
			// Remove all marked as undefined
			for (var i = schedInstance["blocked"].length-1; i >= 0; i--)
			{
				if (schedInstance["blocked"][i]["process"] == undefined)
				{
					schedInstance["blocked"].splice(i, 1);
				}
			}
			
			var priorityOrder = new Array();
			for (var i = 0; i < schedInstance["allProcesses"].length; i++)
				priorityOrder.push({
					"name" : schedInstance["allProcesses"][i].getAttribute("name"),
					"arrival" : schedInstance["allProcesses"][i].getAttribute("arrival"),
					"cpuBurst" : schedInstance["allProcesses"][i].getAttribute("cpuBurst"),
					"ioBurst" : schedInstance["allProcesses"][i].getAttribute("ioBurst")
				});
			
			var readyPass = new Array();
			for (var i = 0; i < schedInstance["ready"].length; i++)
				readyPass.push({
					"name" : schedInstance["ready"][i]["process"].getAttribute("name"),
					"arrival" : schedInstance["ready"][i]["process"].getAttribute("arrival"),
					"cpuBurst" : schedInstance["ready"][i]["process"].getAttribute("cpuBurst"),
					"ioBurst" : schedInstance["ready"][i]["process"].getAttribute("ioBurst"),
					"remaining" : schedInstance["ready"][i]["remaining"]
				});
			
			var runningPass = {};
			if (schedInstance["running"]["process"] != undefined)
			{
				runningPass = {
					"name" : schedInstance["running"]["process"].getAttribute("name"),
					"arrival" : schedInstance["running"]["process"].getAttribute("arrival"),
					"cpuBurst" : schedInstance["running"]["process"].getAttribute("cpuBurst"),
					"ioBurst" : schedInstance["running"]["process"].getAttribute("ioBurst"),
					"remaining" : schedInstance["running"]["remaining"]
				};
			}
			
			if (worker)
			{
				worker.postMessage({"cmd" : "doSchedule", "t" : t,
					"priorityOrder" : JSON.stringify(priorityOrder),
					"ready" : JSON.stringify(readyPass),
					"running" : JSON.stringify(runningPass)
				});
				noResponseTimeout = window.setTimeout(function(){codeNotResponding();}, 2000);
			}
		};
		
		// Run the simulation
		this.schedAsync = function(schedInstance, nextTick) {
			schedInstance_ = schedInstance;
			nextTick_ = nextTick;
			
			self_.beforeDoSchedule(schedInstance_, s_Pos);
			self_.doSchedule(schedInstance_, s_Pos);
		};
	};
	
	// Strategy: Minimalistic Skeleton Strategy
	// This is a minimalistic skeleton
	var SKEL = new function () {
		var self_ = this;
		this.name = "Minimalistic Skeleton Strategy";
		this.globalAttributes = {
			"globalAttr" : {
				"type" : "NUMBER",
				"description" : "Global attribute",
				"value" : "5",
				"readOnly" : false
			},
			"globalAttr2" : {
				"type" : "NUMBER",
				"description" : "Read only",
				"value" : "5",
				"readOnly" : true
			},
			"anotherOne" : {
				"type" : "RANGE",
				"description" : "Another 1",
				"value" : "70-100",
				"readOnly" : false
			}
		};
		// This function needs to be called each time a strategy is selected
		this.setup = function() {
			// Stop current worker
			if (worker)
			{
				worker.terminate();
			}
			
			// Reset needed attributes
			// Always provide name as default
			Sched_ProcessDef.attributes = {"name" : Sched_ProcessDef.preDefinedAttributes["name"]};
			
			// Push needed attributes from predefined pool
			Sched_ProcessDef.attributes["arrival"] = Sched_ProcessDef.preDefinedAttributes["arrival"];
			Sched_ProcessDef.attributes["cpuBurst"] = Sched_ProcessDef.preDefinedAttributes["cpuBurst"];
		};
		
		// Create a scheduling instance to deal with in the doSchedule() function
		this.getSchedInstance = function (involvedProcessesList) {
			var schedInstance = {};
			
			// Also create drawInstance
			// Syntax example for drawInstance is as follows:
			
			// "schedInstance" must contain "drawInstance" : Object
			// "poi" (point of interest, signals a state, where something changed)
			// Possible "type" values:
			//     "NONE", "LINE", "BLOCK"
			//
			// var drawInstance = {
			//     "states": {
			//         "STATE" : {
			//             "name" : "representative name",
			//             "visible" : true,
			//             "type" : "TYPE",
			//             "fill" : "COLOR",
			//             "stroke" : "COLOR"
			//         },
			//         ...
			//     },
			//     "tCount" : "NUMBER",
			//     "t" : {
			//         0 : {
			//             "poi" : true,
			//             "states" : {
			//                 "processName" : "STATE",
			//                 ...
			//             }
			//         },
			//         1 : ...,
			//         ...
			//     }
			// };
			
			return schedInstance;
		};
		
		// Before doSchedule
		this.beforeDoSchedule = function(schedInstance, t) {
			// Signal change for doSchedule
		};
		
		// After doSchedule
		this.afterDoSchedule = function(schedInstance, t) {
			// Update drawInstance in schedInstance
			
		};
		
		// Schedule implementation
		this.doSchedule = function(schedInstance, t) {
			
		};
	};
	
	// Available strategies are in array
	this.strategies = new Array(
		FCFS, RR, VRR, SPN_K, SPN_P, SRT_K, SRT_P, HRRN_K, HRRN_P, FB, FP_NP, CUSTOM
	);
	
	this.getStrategyByName = function(name) {
		for (var i = 0; i < self.strategies.length; i++)
		{
			if (self.strategies[i].name == name) return self.strategies[i];
		}
		return null;
	};
	
	// Constructor
	(function(){self.strategies[self.activeStrategy].setup();})();
};

// The scheduler
var Sched_Scheduler = new function() {
	var self = this;
	
	this.allProcessList = new Array();
	
	// Add a process to scheduler list; deny if singularity broken
	this.addProcess = function(p) {
		var exists = false;
		
		$.each(Sched_ProcessDef.attributes, function(i, val) {
			if (exists)
			{
				return false;
			}
			
			if (val["isUnique"])
			{
				if (p.getAttribute(i) == "")
				{
					exists = true;
					return false;
				}
				
				for (var p_ind = 0; p_ind < self.allProcessList.length; p_ind++)
				{
					if (self.allProcessList[p_ind].getAttribute(i) == p.getAttribute(i))
					{
						exists = true;
						return false;
					}
				}
			}
		});
		
		if (!exists)
		{
			self.allProcessList.push(p);
			return true;
		}
		
		return false;
	};
	
	// Check if process can run and meets all requirements
	this.validateProcesses = function() {
		// Enable processes, that meet requirements,
		// disable ones, that don't
		
		// Unique attributes could change
		// Undefined attributes could reveal
		for (var p_ind = self.allProcessList.length-1; p_ind >= 0; p_ind--)
		{
			self.allProcessList[p_ind].isValid = true;
			
			$.each(Sched_ProcessDef.attributes, function(i, val) {
				if (!self.allProcessList[p_ind].isValid) return;
				
				// Function to check, if attributes are still correct and accepted
				var acceptFunction = Types.pub[Sched_ProcessDef.attributes[i]["type"]]["accept"];
				
				// An attribute is not set or mismatches type, so disable process
				if (self.allProcessList[p_ind].getAttribute(i) == undefined ||
					!acceptFunction(self.allProcessList[p_ind].getAttribute(i)))
				{
					self.allProcessList[p_ind].isActive = false;
					self.allProcessList[p_ind].isValid = false;
					
					return;
				}
				
				// Keep care, that unique attributes stay unique
				if (val["isUnique"])
				{
					for (var p2_ind = 0; p2_ind < p_ind; p2_ind++)
					{
						if (self.allProcessList[p2_ind].getAttribute(i) == self.allProcessList[p_ind].getAttribute(i))
						{
							self.allProcessList[p_ind].isActive = false;
							self.allProcessList[p_ind].isValid = false;
							
							return;
						}
					}
				}
			});
		}
	};
	
	// Get a simulation Object with provided next() function
	this.simulateSchedule = function() {
		// All processes to simulate
		var s_Processes = new Array();
		
		// Position in simulation
		var s_Pos = 0;
		
		// Position in visualization
		var v_Pos = 0;
		var drawnTo = 0;
		
		for (var p_ind = 0; p_ind < self.allProcessList.length; p_ind++)
		{
			if (self.allProcessList[p_ind].isValid && self.allProcessList[p_ind].isActive)
			{
				// Reset process simulation random generator
				self.allProcessList[p_ind].resetRandom();
				
				// Add process to simulation
				s_Processes.push(self.allProcessList[p_ind]);
			}
		}
		
		// Get simulation schedInstance
		var schedInstance = Sched_Strategies.strategies[Sched_Strategies.activeStrategy].getSchedInstance(s_Processes);
		
		// Return process count
		this.getProcessCount = function() {
			return s_Processes.length;
		};
		
		// Write process names in simulation
		this.drawProcessNames = function() {
			for (var p_ind = 0; p_ind < s_Processes.length; p_ind++)
			{
				Sched_Gantt.writeText(5, 20+30*p_ind, s_Processes[p_ind].getAttribute("name"), {
					"fill" : "darkgreen",
					"font-size": "10",
					"text-anchor" : "start"
				});
			}
		};
		
		// Draw the process grid
		this.drawGrid = function()
		{
			// Horizontal grid
			for (var p_ind = 0; p_ind < s_Processes.length; p_ind++)
			{
				Sched_Gantt.drawLine(1, 
					35.5+30*p_ind, 
					Sched_Gantt.processWidth+Sched_Gantt.getVerticalParts()*Sched_Gantt.verticalPartWidth, 
					35.5+30 * p_ind, {
						"stroke" : "#aaaaaa"
				});
			}
			
			// Vertical grid
			for (var i = 0; i < Sched_Gantt.getVerticalParts(); i++)
			{
				Sched_Gantt.drawLine(100.5+i*Sched_Gantt.verticalPartWidth, 
					1, 
					Sched_Gantt.processWidth+0.5+i*Sched_Gantt.verticalPartWidth, 
					Sched_Gantt.getPaperHeight(), {
						"stroke" : (i%5==0?"#aaaaaa":"#cccccc")
				});
				
				// Numbering for t
				Sched_Gantt.writeText(Sched_Gantt.processWidth+Sched_Gantt.verticalPartWidth/2+i*Sched_Gantt.verticalPartWidth, 
					12+30*s_Processes.length, 
					i, {
						"fill" : "darkgreen",
						"font-size": "8"
				});
			}
		};
		
		// Draw the simulation from - to (remember not to draw a tick twice)
		// start=-1, stop=-1 draws everything indrawn
		var drawSimulation = function(startAt, stopAt) {
			var drawInstance = schedInstance["drawInstance"];
			if (drawInstance == undefined) return;
			
			if (startAt > drawInstance["tCount"]) startAt = drawInstance["tCount"]-1;
			if (stopAt < startAt || stopAt >= drawInstance["tCount"]) stopAt = drawInstance["tCount"]-1;
			
			for (var tPos = (startAt>0?startAt:0); tPos <= stopAt; tPos++)
			{
				for (var p_ind = 0; p_ind < schedInstance["allProcesses"].length; p_ind++)
				{
					var name = schedInstance["allProcesses"][p_ind].getAttribute("name");
					var stateName = drawInstance["t"][tPos]["states"][name];
					var state = drawInstance["states"][stateName];
					
					if (state["type"] == "BLOCK")
					{
						Sched_Gantt.drawRect(Sched_Gantt.processWidth+0.5+tPos*Sched_Gantt.verticalPartWidth, 
							20+30*p_ind-5.5, 
							Sched_Gantt.verticalPartWidth, 
							10, {
								"fill" : state["fill"],
								"stroke" : state["stroke"]
						});
					}
					else if (state["type"] == "LINE")
					{
						Sched_Gantt.drawLine(Sched_Gantt.processWidth+tPos*Sched_Gantt.verticalPartWidth, 
							20+30*p_ind, 
							Sched_Gantt.processWidth+(tPos+1)*Sched_Gantt.verticalPartWidth, 
							20+30*p_ind, {
								"stroke" : state["stroke"]
						});
					}
				}
			}
		};
		
		// Step forward in simulation
		this.nextS = function() {
			var drawInstance = schedInstance["drawInstance"];
			if (drawInstance == undefined) return;
			
			nextS(drawInstance, true);
		};
		var nextS = function(drawInstance, doPoint) {
			if (v_Pos < drawInstance["tCount"]-1)
			{
				v_Pos++;
				if (v_Pos > drawnTo){
					drawSimulation(drawnTo, v_Pos);
					drawnTo = v_Pos;
				}
				if (doPoint) point(v_Pos);
			}
		};
		
		// Step backward in simulation
		this.previousS = function() {
			var drawInstance = schedInstance["drawInstance"];
			if (drawInstance == undefined) return;
			
			previousS(drawInstance, true);
		};
		var previousS = function(drawInstance, doPoint) {
			if (v_Pos > 0)
			{
				v_Pos--;
				if (doPoint) point(v_Pos);
			}
		};
		
		// Find next poi by stepping forward in simulation
		this.futureS = function() {
			var drawInstance = schedInstance["drawInstance"];
			if (drawInstance == undefined) return;
			
			var poiFound = false
			while (v_Pos < drawInstance["tCount"]-1 && !poiFound)
			{
				nextS(drawInstance, true);
				if (drawInstance["t"][v_Pos]["poi"]) poiFound=true;
			}
		};
		
		// Find previous poi by stepping backward in simulation
		this.pastS = function() {
			var drawInstance = schedInstance["drawInstance"];
			if (drawInstance == undefined) return;
			
			var poiFound = false
			while (v_Pos > 0 && !poiFound)
			{
				previousS(drawInstance, true);
				if (drawInstance["t"][v_Pos]["poi"]) poiFound=true;
			}
		};
		
		// Go to end of simulation by stepping forward
		this.endS = function() {
			var drawInstance = schedInstance["drawInstance"];
			if (drawInstance == undefined) return;
			
			while (v_Pos < drawInstance["tCount"]-1)
			{
				nextS(drawInstance, true);
			}
		};
		
		// Go to start of simulation by stepping backward
		this.startS = function() {
			var drawInstance = schedInstance["drawInstance"];
			if (drawInstance == undefined) return;
			
			while (v_Pos > 0)
			{
				previousS(drawInstance, true);
			}
		};
		
		// Go to desired point in simulation by stepping forward or backward
		this.gotoS = function(pointer) {
			var drawInstance = schedInstance["drawInstance"];
			if (drawInstance == undefined) return;
			
			if (pointer < 0)pointer=0;
			if (pointer > drawInstance["tCount"]-1)pointer=drawInstance["tCount"]-1;
			
			// Save escape
			if (drawInstance["tCount"] == 0)
			{
				Tooltip.warn("Strategy error!", 3);
				return;
			}
			
			while (v_Pos < pointer)
			{
				nextS(drawInstance, false);
			}
			while (v_Pos > pointer)
			{
				previousS(drawInstance, false);
			}
			point(v_Pos);
		};
		
		// Set point to start and draw first tick
		this.prepareFSM = function() {
			drawSimulation(0, 0);
			point(0);
		};
		
		// Set the highlighting on index tick
		var point = function(index) {
			Sched_Gantt.highlightCellLine(Sched_Gantt.processWidth+0.5+Sched_Gantt.verticalPartWidth/2+index*Sched_Gantt.verticalPartWidth, 
				0, 
				Sched_Gantt.processWidth+0.5+Sched_Gantt.verticalPartWidth/2+index*Sched_Gantt.verticalPartWidth, 
				Sched_Gantt.getPaperHeight(), {
					"stroke" : "#ffff55",
					"stroke-width" : Sched_Gantt.verticalPartWidth,
					"stroke-opacity" : 0.3
			});
		};
		
		// Retrieve statistics from here
		this.Statistics = new function(){
			var drawInstance = schedInstance["drawInstance"];
			var calcPerformed = false;
			
			var busyCount = 0;
			var processorLoad = 0;
			var fairness = true;
			var turnaroundTimeMean = 0;
			var turnaroundTimeStandardDeviation = 0;
			var waitingTimeMean = 0;
			var waitingTimeStandardDeviation = 0;
			var responseTimeMean = 0;
			var responseTimeStandardDeviation = 0;
			
			var processCPU = new Array();
			var processTurnaroundTimes = new Array();
			var processTurnaroundTimeMean = new Array();
			var processTurnaroundTimeStandardDeviation = new Array();
			var processTurnaroundTimeCurrent = new Array();
			var processWaitingTimes = new Array();
			var processWaitingTimeMean = new Array();
			var processWaitingTimeStandardDeviation = new Array();
			var processWaitingTimeCurrent = new Array();
			var processResponseTimes = new Array();
			var processResponseTimeMean = new Array();
			var processResponseTimeStandardDeviation = new Array();
			var processResponseTimeCurrent = new Array();
			
			$(s_Processes).each(function(){
				processCPU[this.getAttribute("name")] = 0;
				processTurnaroundTimes[this.getAttribute("name")] = new Array();
				processTurnaroundTimeMean[this.getAttribute("name")] = 0;
				processTurnaroundTimeStandardDeviation[this.getAttribute("name")] = 0;
				processTurnaroundTimeCurrent[this.getAttribute("name")] = {
					"active" : false,
					"time" : 0
				};
				processWaitingTimes[this.getAttribute("name")] = new Array();
				processWaitingTimeMean[this.getAttribute("name")] = 0;
				processWaitingTimeStandardDeviation[this.getAttribute("name")] = 0;
				processWaitingTimeCurrent[this.getAttribute("name")] = {
					"active" : false,
					"time" : 0
				};
				processResponseTimes[this.getAttribute("name")] = new Array();
				processResponseTimeMean[this.getAttribute("name")] = 0;
				processResponseTimeStandardDeviation[this.getAttribute("name")] = 0;
				processResponseTimeCurrent[this.getAttribute("name")] = {
					"active" : false,
					"time" : 0
				};
			});
			
			var calcAll = function() {
				for (var i = 0; i < drawInstance["tCount"]; i++)
				{
					var cpuFree = true;
					
					// Got turnaround time and waiting time (a process finished)
					if (drawInstance["t"][i]["finishedRunning"] != false)
					{
						processTurnaroundTimes[drawInstance["t"][i]["finishedRunning"]].push(
							processTurnaroundTimeCurrent[drawInstance["t"][i]["finishedRunning"]]["time"]
						);
						processTurnaroundTimeCurrent[drawInstance["t"][i]["finishedRunning"]]["active"] = false;
						processTurnaroundTimeCurrent[drawInstance["t"][i]["finishedRunning"]]["time"] = 0;
						
						processWaitingTimes[drawInstance["t"][i]["finishedRunning"]].push(
							processWaitingTimeCurrent[drawInstance["t"][i]["finishedRunning"]]["time"]
						);
						processWaitingTimeCurrent[drawInstance["t"][i]["finishedRunning"]]["active"] = false;
						processWaitingTimeCurrent[drawInstance["t"][i]["finishedRunning"]]["time"] = 0;
					}
					
					$(s_Processes).each(function(){
						if (cpuFree && drawInstance["t"][i]["states"][this.getAttribute("name")] == "RUNNING")
						{
							cpuFree = false;
							
							processCPU[this.getAttribute("name")]++;
						}						
						
						// Needed for turnaround time and waiting time
						if (drawInstance["t"][i]["states"][this.getAttribute("name")] == "READY" || 
							drawInstance["t"][i]["states"][this.getAttribute("name")] == "RUNNING")
						{
							processTurnaroundTimeCurrent[this.getAttribute("name")]["active"] = true;
							processWaitingTimeCurrent[this.getAttribute("name")]["active"] = true;
						}
						
						// Needed for turnaround time
						if (processTurnaroundTimeCurrent[this.getAttribute("name")]["active"] == true)
						{
							processTurnaroundTimeCurrent[this.getAttribute("name")]["time"]++;
						}
						
						// Needed for waiting time
						if (processWaitingTimeCurrent[this.getAttribute("name")]["active"] == true &&
							drawInstance["t"][i]["states"][this.getAttribute("name")] == "READY")
						{
							processWaitingTimeCurrent[this.getAttribute("name")]["time"]++;
						}
						
						// Needed for response time
						if (drawInstance["t"][i]["states"][this.getAttribute("name")] == "READY")
						{
							processResponseTimeCurrent[this.getAttribute("name")]["active"] = true;
						}
						else if (drawInstance["t"][i]["states"][this.getAttribute("name")] == "RUNNING" && 
							processResponseTimeCurrent[this.getAttribute("name")]["active"] == false)
						{
							if (i==0)
							{
								processResponseTimes[this.getAttribute("name")].push(0);
							}
							else if (i>0 && (drawInstance["t"][i-1]["states"][this.getAttribute("name")] != "RUNNING" ||
								this.getAttribute("name") == drawInstance["t"][i]["finishedRunning"]))
							{
								processResponseTimes[this.getAttribute("name")].push(0);
							}
						}
						
						if (processResponseTimeCurrent[this.getAttribute("name")]["active"] == true)
						{
							if (drawInstance["t"][i]["states"][this.getAttribute("name")] == "READY")
								processResponseTimeCurrent[this.getAttribute("name")]["time"]++;
							if (drawInstance["t"][i]["states"][this.getAttribute("name")] == "RUNNING")
							{
								processResponseTimes[this.getAttribute("name")].push(
									processResponseTimeCurrent[this.getAttribute("name")]["time"]
								);
								processResponseTimeCurrent[this.getAttribute("name")]["active"] = false;
								processResponseTimeCurrent[this.getAttribute("name")]["time"] = 0;
							}
						}
						
					});
					
					if (!cpuFree) busyCount++;
				}
				// Normalize value
				processorLoad = Math.round(busyCount * 10000 / drawInstance["tCount"])/100;
				
				var fairValue = 1 / s_Processes.length;
				var fairDeviation = 0.68;
				
				// CPU percentage and normalization
				$(s_Processes).each(function(){
					if (processCPU[this.getAttribute("name")]/busyCount < fairValue - fairValue*fairDeviation ||
						processCPU[this.getAttribute("name")]/busyCount > fairValue + fairValue*fairDeviation)
						fairness = false;
					
					processCPU[this.getAttribute("name")] = Math.round(processCPU[this.getAttribute("name")] * 10000 / busyCount)/100;
				});
				
				// Calculate turnaround time mean and standard deviation
				// Calculate waiting time mean and standard deviation
				$(s_Processes).each(function(){
					// Turnaround time mean
					var outstring = 'Turnaround times of process "' + this.getAttribute("name") + '": ';
					var sum = 0;
					var arithmeticMean = 0;
					
					for (var i = 0; i < processTurnaroundTimes[this.getAttribute("name")].length; i++)
					{
						outstring += processTurnaroundTimes[this.getAttribute("name")][i] + ", ";
						sum += processTurnaroundTimes[this.getAttribute("name")][i];
					}
					outstring = outstring.substring(0,outstring.length -2);
					Console.log(outstring);
					
					arithmeticMean = sum / processTurnaroundTimes[this.getAttribute("name")].length;
					
					// Normalize value
					processTurnaroundTimeMean[this.getAttribute("name")] = Math.round(arithmeticMean*100)/100;
					
					// Turnaround time standard deviation
					var variance = 0;
					var standardDeviation = 0;
					for (var i = 0; i < processTurnaroundTimes[this.getAttribute("name")].length; i++)
					{
						variance += Math.pow(processTurnaroundTimes[this.getAttribute("name")][i] - arithmeticMean, 2);
					}
					variance /= processTurnaroundTimes[this.getAttribute("name")].length;
					standardDeviation = Math.sqrt(variance);
					
					// Normalize value				
					processTurnaroundTimeStandardDeviation[this.getAttribute("name")] = Math.round(standardDeviation*100)/100;
					
					
					// Waiting time mean
					outstring = 'Waiting times of process "' + this.getAttribute("name") + '": ';
					sum = 0;
					arithmeticMean = 0;
					
					for (var i = 0; i < processWaitingTimes[this.getAttribute("name")].length; i++)
					{
						outstring += processWaitingTimes[this.getAttribute("name")][i] + ", ";
						sum += processWaitingTimes[this.getAttribute("name")][i];
					}
					outstring = outstring.substring(0,outstring.length -2);
					Console.log(outstring);
					
					arithmeticMean = sum / processWaitingTimes[this.getAttribute("name")].length;
					
					// Normalize value
					processWaitingTimeMean[this.getAttribute("name")] = Math.round(arithmeticMean*100)/100;
					
					// Waiting time standard deviation
					variance = 0;
					standardDeviation = 0;
					for (var i = 0; i < processWaitingTimes[this.getAttribute("name")].length; i++)
					{
						variance += Math.pow(processWaitingTimes[this.getAttribute("name")][i] - arithmeticMean, 2);
					}
					variance /= processWaitingTimes[this.getAttribute("name")].length;
					standardDeviation = Math.sqrt(variance);
					
					// Normalize value				
					processWaitingTimeStandardDeviation[this.getAttribute("name")] = Math.round(standardDeviation*100)/100;
					
					
					// Response time mean
					outstring = 'Response times of process "' + this.getAttribute("name") + '": ';
					sum = 0;
					arithmeticMean = 0;
					
					for (var i = 0; i < processResponseTimes[this.getAttribute("name")].length; i++)
					{
						outstring += processResponseTimes[this.getAttribute("name")][i] + ", ";
						sum += processResponseTimes[this.getAttribute("name")][i];
					}
					outstring = outstring.substring(0,outstring.length -2);
					Console.log(outstring);
					
					arithmeticMean = sum / processResponseTimes[this.getAttribute("name")].length;
					
					// Normalize value
					processResponseTimeMean[this.getAttribute("name")] = Math.round(arithmeticMean*100)/100;
					
					// Response time standard deviation
					variance = 0;
					standardDeviation = 0;
					for (var i = 0; i < processResponseTimes[this.getAttribute("name")].length; i++)
					{
						variance += Math.pow(processResponseTimes[this.getAttribute("name")][i] - arithmeticMean, 2);
					}
					variance /= processResponseTimes[this.getAttribute("name")].length;
					standardDeviation = Math.sqrt(variance);
					
					// Normalize value				
					processResponseTimeStandardDeviation[this.getAttribute("name")] = Math.round(standardDeviation*100)/100;
					
				});
				
				// Global turnaround time mean
				$(s_Processes).each(function(){
					turnaroundTimeMean += processTurnaroundTimeMean[this.getAttribute("name")];
				});
				turnaroundTimeMean /= s_Processes.length;
				
				// Global turnaround time standard deviation
				$(s_Processes).each(function(){
					turnaroundTimeStandardDeviation += Math.pow(processTurnaroundTimeMean[this.getAttribute("name")] - turnaroundTimeMean, 2);
				});
				turnaroundTimeStandardDeviation /= s_Processes.length;
				turnaroundTimeStandardDeviation = Math.sqrt(turnaroundTimeStandardDeviation);
				
				// Normalize values
				turnaroundTimeMean = Math.round(turnaroundTimeMean*100)/100;
				turnaroundTimeStandardDeviation = Math.round(turnaroundTimeStandardDeviation*100)/100;
				
				
				// Global waiting time mean
				$(s_Processes).each(function(){
					waitingTimeMean += processWaitingTimeMean[this.getAttribute("name")];
				});
				waitingTimeMean /= s_Processes.length;
				
				// Global waiting time standard deviation
				$(s_Processes).each(function(){
					waitingTimeStandardDeviation += Math.pow(processWaitingTimeMean[this.getAttribute("name")] - waitingTimeMean, 2);
				});
				waitingTimeStandardDeviation /= s_Processes.length;
				waitingTimeStandardDeviation = Math.sqrt(waitingTimeStandardDeviation);
				
				// Normalize values
				waitingTimeMean = Math.round(waitingTimeMean*100)/100;
				waitingTimeStandardDeviation = Math.round(waitingTimeStandardDeviation*100)/100;
				
				
				// Global response time mean
				$(s_Processes).each(function(){
					responseTimeMean += processResponseTimeMean[this.getAttribute("name")];
				});
				responseTimeMean /= s_Processes.length;
				
				// Global response time standard deviation
				$(s_Processes).each(function(){
					responseTimeStandardDeviation += Math.pow(processResponseTimeMean[this.getAttribute("name")] - responseTimeMean, 2);
				});
				responseTimeStandardDeviation /= s_Processes.length;
				responseTimeStandardDeviation = Math.sqrt(responseTimeStandardDeviation);
				
				// Normalize values
				responseTimeMean = Math.round(responseTimeMean*100)/100;
				responseTimeStandardDeviation = Math.round(responseTimeStandardDeviation*100)/100;
				
				
				calcPerformed = true;
			};
			
			// Return busy CPU time
			this.getBusyCPUTime = function() {
				if (!calcPerformed) calcAll();
				return busyCount;
			};
			
			// Return idle CPU time
			this.getIdleCPUTime = function() {
				if (!calcPerformed) calcAll();
				return drawInstance["tCount"] - busyCount;
			};
			
			// Return overall processor load
			this.getProcessorLoad = function() {
				if (!calcPerformed) calcAll();
				return processorLoad + " %";
			};
			
			// Return turnaround time mean
			this.getTurnaroundTimeMean = function() {
				if (!calcPerformed) calcAll();
				return turnaroundTimeMean;
			};
			
			// Return turnaround time standard deviation
			this.getTurnaroundTimeStandardDeviation = function() {
				if (!calcPerformed) calcAll();
				return turnaroundTimeStandardDeviation;
			};
			
			// Return waiting time mean
			this.getWaitingTimeMean = function() {
				if (!calcPerformed) calcAll();
				return waitingTimeMean;
			};
			
			// Return waiting time standard deviation
			this.getWaitingTimeStandardDeviation = function() {
				if (!calcPerformed) calcAll();
				return waitingTimeStandardDeviation;
			};
			
			// Return response time mean
			this.getResponseTimeMean = function() {
				if (!calcPerformed) calcAll();
				return responseTimeMean;
			};
			
			// Return response time standard deviation
			this.getResponseTimeStandardDeviation = function() {
				if (!calcPerformed) calcAll();
				return responseTimeStandardDeviation;
			};
			
			// Return fairness
			this.getFairness = function() {
				if (!calcPerformed) calcAll();
				return fairness;
			};
			
			// Return CPU percentage of a process
			this.getProcessCPUPercentage = function(name) {
				if (!calcPerformed) calcAll();
				return processCPU[name] + " %";
			};
			
			// Return process turnaround time mean
			this.getProcessTurnaroundTimeMean = function(name) {
				if (!calcPerformed) calcAll();
				return processTurnaroundTimeMean[name];
			};
			
			// Return process turnaround time standard deviation
			this.getProcessTurnaroundTimeStandardDeviation = function(name) {
				if (!calcPerformed) calcAll();
				return processTurnaroundTimeStandardDeviation[name];
			};
			
			// Return process waiting time mean
			this.getProcessWaitingTimeMean = function(name) {
				if (!calcPerformed) calcAll();
				return processWaitingTimeMean[name];
			};
			
			// Return process waiting time standard deviation
			this.getProcessWaitingTimeStandardDeviation = function(name) {
				if (!calcPerformed) calcAll();
				return processWaitingTimeStandardDeviation[name];
			};
			
			// Return process response time mean
			this.getProcessResponseTimeMean = function(name) {
				if (!calcPerformed) calcAll();
				return processResponseTimeMean[name];
			};
			
			// Return process waiting time standard deviation
			this.getProcessResponseTimeStandardDeviation = function(name) {
				if (!calcPerformed) calcAll();
				return processResponseTimeStandardDeviation[name];
			};
		};
		
		// Perform a simulation step
		this.tick = function() {
			// Before doSchedule()
			Sched_Strategies.strategies[Sched_Strategies.activeStrategy].beforeDoSchedule(schedInstance, s_Pos);
			
			// Call doSchedule() on current simulation instance
			Sched_Strategies.strategies[Sched_Strategies.activeStrategy].doSchedule(schedInstance, s_Pos);
			
			// After doSchedule()
			Sched_Strategies.strategies[Sched_Strategies.activeStrategy].afterDoSchedule(schedInstance, s_Pos);
			
			// Do time tick
			s_Pos++;
		};
		
		// Perform a simulation step asynchronously
		this.tickAsync = function(nextTick) {
			Sched_Strategies.strategies[Sched_Strategies.activeStrategy].schedAsync(schedInstance, nextTick);
		};
	};
	
};
