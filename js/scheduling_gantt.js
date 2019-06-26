
var Sched_Gantt = new function() {
	var self = this;
	var _sched_navi = "#sched_navi";

	var canvas;
	var paper;
	
	var paperWidth = 4100;
	var paperHeight;
	
	var highlight;
	var highlightGlow;
	var playingTimer;
	var pauseBlinkTimer;
	var playState = false;
	var simulationSpeed = 502;

	this.processWidth = 100;
	this.verticalPartWidth = 20;
	
	
	// Create Raphael canvas
	this.initCanvas = function(h) {
		paperHeight = h;
				
		if (canvas == undefined)
		{
			canvas = "sched_canvas";
			$("#" + canvas).attr('unselectable', 'on')
				.css('user-select', 'none')
				.on('selectstart', false)
				.click(function(e){
					clearInterval(playingTimer);
					clearInterval(pauseBlinkTimer);
					playState=false;
					
					var mX = e.clientX + $("#" + canvas).scrollLeft() - $("#" + canvas).offset().left;
					var pointer = parseInt((mX - self.processWidth) / self.verticalPartWidth);
					Sched_UI.Simulator.gotoS(pointer);
				})
				.scroll(function(){paper.renderfix();});
		}
		
		$("#" + canvas).scrollLeft(0);
		$("#" + canvas).html("");
		
		paper = Raphael(canvas, paperWidth, paperHeight);
	};
	
	// Return max number of ticks that can be drawn
	this.getVerticalParts = function() {
		return Math.floor((paperWidth-self.processWidth) / self.verticalPartWidth);
	}
	
	// Return paper width
	this.getPaperWidth = function() {
		return paperWidth;
	};
	
	// Return paper height
	this.getPaperHeight = function() {
		return paperHeight;
	};
	
	// Draw custom text with attributes f
	this.writeText = function(x, y, text, f) {
		paper.text(x, y, text).attr(f);
	};
	
	// Draw a custom rectangle with attributes f
	this.drawRect = function(x, y, w, h, f) {
		var block = paper.rect(x, y, w, h);
		block.attr(f);
	};
	
	// Draw a custom line with attributes f
	this.drawLine = function(x, y, x2, y2, f) {
		var line = paper.path("M"+x+" "+y+" L"+x2+" "+y2);
		line.attr(f);
	};
	
	// Draw the highlighting line
	this.highlightCellLine = function(x, y, x2, y2, f) {
		if (highlight != undefined) highlight.remove();
		if (highlightGlow != undefined) highlightGlow.remove();
		highlight = paper.path("M"+x+" "+y+" L"+x2+" "+y2);
		highlight.attr(f);
		highlightGlow = highlight.glow({"color" : "#ddff55", "opacity" : 0.3});
		
		if (x > $("#" + canvas).width()+$("#" + canvas).scrollLeft()-self.verticalPartWidth)
		{
			$("#" + canvas).scrollLeft(x-$("#" + canvas).width()+self.verticalPartWidth);
		}
		else if (x < $("#" + canvas).scrollLeft()+self.verticalPartWidth)
		{
			$("#" + canvas).scrollLeft(x-self.verticalPartWidth);
		}
	};
	
	// Create navigation buttons for gantt diagram
	this.createNaviButtons = function() {
		$(_sched_navi).html("");
		
		var naviSet = $('<div style="float:left;"></div>');
		
		$(naviSet).append(
			$('<button title="Reset simulation">Reset simulation</button>')
				.click(function(){
					// Reset simulation
					Sched_Strategies.strategies[Sched_Strategies.activeStrategy].setup();
					Sched_UI.simulate();
				})
				.button({
					icons: {
						primary: "ui-icon-refresh"
					},
					text: false
				})
		);
		$(naviSet).append(
			$('<button title="Jump to the beginning">Jump to the beginning</button>')
				.click(function(){
					// Go to start
					clearInterval(playingTimer);
					clearInterval(pauseBlinkTimer);
					playState=false;
					Sched_UI.Simulator.startS();
				})
				.button({
					icons: {
						primary: "ui-icon-seek-first"
					},
					text: false
				})
		);
		$(naviSet).append(
			$('<button title="Find previous point of interest">Find previous point of interest</button>')
				.click(function(){
					// Find previous point of interest
					clearInterval(playingTimer);
					clearInterval(pauseBlinkTimer);
					playState=false;
					Sched_UI.Simulator.pastS();
				})
				.button({
					icons: {
						primary: "ui-icon-seek-prev"
					},
					text: false
				})
		);
		$(naviSet).append(
			$('<button title="Move a single step backward">Move a single step backward</button>')
				.click(function(){
					// Step back
					clearInterval(playingTimer);
					clearInterval(pauseBlinkTimer);
					playState=false;
					Sched_UI.Simulator.previousS();
				})
				.button({
					icons: {
						primary: "ui-icon-triangle-1-w"
					},
					text: false
				})
		);
		var startPauseButton = $('<button title="Start or pause the simulation animation">Start or pause the simulation animation</button>')
			.click(function(){
				// Auto step forward or pause
				if (playState)
				{
					clearInterval(playingTimer);
					clearInterval(pauseBlinkTimer);
				}
				else
				{
					clearInterval(playingTimer);
					clearInterval(pauseBlinkTimer);
					playingTimer = window.setInterval(function(){Sched_UI.Simulator.nextS();}, simulationSpeed);
					pauseBlinkTimer = window.setInterval(function(){startPauseButton.effect("highlight", {easing:"easeInOutSine"}, 3000);}, 7000);
				}
				playState=!playState;
				
			})
			.button({
				icons: {
					primary: "ui-icon-play",
					secondary: "ui-icon-pause"
				},
				text: false
			});
		$(naviSet).append(startPauseButton);
		$(naviSet).append(
			$('<button title="Move a single step forward">Move a single step forward</button>')
				.click(function(){
					// Step forward
					clearInterval(playingTimer);
					clearInterval(pauseBlinkTimer);
					playState=false;
					Sched_UI.Simulator.nextS();
				})
				.button({
					icons: {
						primary: "ui-icon-triangle-1-e"
					},
					text: false
				})
		);
		$(naviSet).append(
			$('<button title="Find next point of interest">Find next point of interest</button>')
				.click(function(){
					// Find next point of interest
					clearInterval(playingTimer);
					clearInterval(pauseBlinkTimer);
					playState=false;
					Sched_UI.Simulator.futureS();
				})
				.button({
					icons: {
						primary: "ui-icon-seek-next"
					},
					text: false
				})
		);
		$(naviSet).append(
			$('<button title="Jump to the end">Jump to the end</button>')
				.click(function(){
					// Go to end
					clearInterval(playingTimer);
					clearInterval(pauseBlinkTimer);
					playState=false;
					Sched_UI.Simulator.endS();
				})
				.button({
					icons: {
						primary: "ui-icon-seek-end"
					},
					text: false
				})
		);
		
		naviSet.buttonset();
		$(_sched_navi).append(naviSet);
		
		$(_sched_navi).append(
			$('<div style="display:inline-block;margin-left:8px;margin-top:10px;width:100px;" title="Animation speed"></div>').slider({
			range: "max",
			min: 0,
			max: 100,
			step: 10,
			value: 60,
			slide: function( event, ui ) {
					// Position will be between 0 and 100
					var minp = 0;
					var maxp = 100;

					// The result should be between 200 an 2000
					var minv = Math.log(200);
					var maxv = Math.log(2000);

					// Calculate adjustment factor
					var scale = (maxv-minv) / (maxp-minp);
					
					simulationSpeed = Math.round(Math.exp(maxv - scale*(ui.value-minp)));
					if (playState)
					{
						clearInterval(playingTimer);
						playingTimer = window.setInterval(function(){Sched_UI.Simulator.nextS();}, simulationSpeed);
					}
				}
			})
		);
	};
};
