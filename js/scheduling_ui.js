
var Sched_UI = new function() {
	var self = this;
	var _table_head = "#sched_th";
	var _table_body = "#sched_tb";
	var _table_foot = "#sched_tf";
	
	var _sched_select_container = "#sched_s";
	var _sched_combo = "#sched_s_cmb";

	var _sched_ops_table = "#sched_ops_t";
	var _sched_ops_table_body = "#sched_ops_tb";
	var _sched_ops_table_foot = "#sched_ops_tf";
	
	var _sched_custom = "#sched_custom"
	
	// Allow to edit only one field per time
	var editing = false;
	
	// Changed by holding ctrl + click on delete
	var noConfirmationDeletion = false;
	
	// Return a helper with preserved width of cells
	var fixRowWidthHelper = function(e, tr)
	{
		var $originals = tr.children();
		var $helper = tr.clone();
		$helper.children().each(function(index)
		{
			// Set helper cell sizes to match the original sizes
			$(this).width($originals.eq(index).width());
		});
		return $helper;
	};
	
	// Keep track of the original position
	var beforeChangedProcessTable = function(event, ui) {
		ui.item.data('originIndex', ui.item.index());
	}
	
	// Process table has been changed
	var changedProcessTable = function(event, ui) {
		var beforeIndex = ui.item.data('originIndex');
		var afterIndex = ui.item.index();
		
		// Also change order in scheduler process list
		if (beforeIndex != afterIndex)
		{
			var direction = beforeIndex < afterIndex ? 1 : -1;
			
			var tmpProcess = Sched_Scheduler.allProcessList[beforeIndex];
			for (var i = beforeIndex; i != afterIndex; i += direction)
			{
				Sched_Scheduler.allProcessList[i] = Sched_Scheduler.allProcessList[i+direction];
			}
			Sched_Scheduler.allProcessList[afterIndex] = tmpProcess;
			
			// Call simulation
			Sched_Strategies.strategies[Sched_Strategies.activeStrategy].setup();
			self.simulate();
		}
		
		return ui;
	};
	
	// Add a process view controller
	var addProcess = function() {
		// Creating a process and setting all attributes
		var newP = new Sched_Process();
	
		// Check if all needed attribute values are provided
		var validInput = true;
		
		$(_table_foot + " tr").children("td").each(function() {
			var field = $(this).children("input");
			if (field.length > 0)
			{
				var acceptFunction = Types.pub[Sched_ProcessDef.attributes[field.prop("id")]["type"]]["accept"];
				var userInput = field.val();
				
				// Attribute check passed
				if(acceptFunction(userInput)) 
				{
					newP.setAttribute(field.prop("id"), userInput);
				}
				else
				{
					validInput = false;
					Tooltip.warn('Error:<br /><br />Input "' 
						+ Sched_ProcessDef.attributes[field.prop("id")]["description"] 
						+ '" mismatched type "' + Sched_ProcessDef.attributes[field.prop("id")]["type"] + '"!', 3);
						
					// Set focus on input field
					field.focus();
				}
			}
		});
		
		// Adding a new process
		if (validInput)
		{
			if(Sched_Scheduler.addProcess(newP))
			{
				newP.isActive = true;
				newP.isValid = true;
				Tooltip.show('Success:<br /><br />Process "' + newP.getAttribute("name") + '" has been added!', 3);
				
				// Create new table
				self.createProcessDefinitionTable(true);
				
				// Call simulation
				Sched_Strategies.strategies[Sched_Strategies.activeStrategy].setup();
				self.simulate();
				
				// Set focus on first input field
				$(_table_foot + " tr td input")[0].focus();
			}
			else
			{
				Tooltip.warn("Error:<br /><br />The process can't be inserted, " 
					+ "because of duplicates in unique attributes!<br />" 
					+ "Unique attributes have a dark green colour!", 7);
			}
		}
	}
	
	// Update a process view controller
	var updateProcess = function(process, attributeName, value) {
		return process.setAttribute(attributeName, value);
	};
	
	// Check types and call update in model (Recalculate the simulation)
	var delegateUpdate = function(e, inpF) {
		var retVal = true;
		
		var acceptFunction = Types.pub[Sched_ProcessDef.attributes[$(e).data("attributeName")]["type"]]["accept"];
		var userInput = $(inpF).val();
		
		if (acceptFunction(userInput) == true)
		{
			// Update process
			if (updateProcess($(e).data("process"), $(e).data("attributeName"), $(inpF).val()))
			{
				$(e).html($(inpF).val());
			}
			else
			{
				Tooltip.warn('Error:<br /><br />Input "' + Sched_ProcessDef.attributes[$(e).data("attributeName")]["description"]
					+ '" failed on update!', 3);
				retVal = false;
			}
			
			// Call simulation
			Sched_Strategies.strategies[Sched_Strategies.activeStrategy].setup();
			self.simulate();
			
			// Make field editable again
			editing = false;
		}
		else
		{
			Tooltip.warn('Error:<br /><br />Input "' + Sched_ProcessDef.attributes[$(e).data("attributeName")]["description"]
				+ '" mismatched type "' + Sched_ProcessDef.attributes[$(e).data("attributeName")]["type"] + '"!', 3);
			retVal = false;
		}
		
		return retVal;
	};
	
	// Create a input field for double clicked attribute
	this.createUpdateField = function(e) {
		// Return if already editable
		if (editing) return;
		editing = true;
		
		var aField = $('<input value="'+$(e).html()+'" >')
			.keydown(function( event ) {
				if (event.which == 9 || event.which == 13 || event.which == 38 || event.which == 40)
					event.preventDefault();
			})
			.keyup(function( event ) {
				if ( event.which == 13 ) {
					event.preventDefault();
					
					// Update
					if (delegateUpdate(e, this))
					{
						// Validation call for processes
						Sched_Scheduler.validateProcesses();
						
						// Table order could be outdated
						// Create new table
						self.createProcessDefinitionTable(false);
					}
					else $(this).wait(0).focus();
				}
				else if (event.which == 9)
				{
					event.preventDefault();
					
					// Update
					if (delegateUpdate(e, this))
					{
						if (event.shiftKey)
						{
							// Goto previous field
							var nextF = $(e).prevAll("td[ondblclick]").first();
							if (nextF.length == 1)
								Sched_UI.createUpdateField(nextF.get(0));
							else
							{
								// Try previous row
								nextF = $(e).parent().prev().find('td[ondblclick]').last();
								if (nextF.length == 1)
									Sched_UI.createUpdateField(nextF.get(0));
								else Sched_UI.createUpdateField(e);
							}
						}
						else
						{
							// Goto next field
							var nextF = $(e).nextAll("td[ondblclick]").first();
							if (nextF.length == 1)
								Sched_UI.createUpdateField(nextF.get(0));
							else
							{
								// Try next row
								nextF = $(e).parent().next().find('td[ondblclick]').first();
								if (nextF.length == 1)
									Sched_UI.createUpdateField(nextF.get(0));
								else Sched_UI.createUpdateField(e);
							}
						}
					}
					else $(this).wait(0).focus();
				}
				else if (event.which == 38)
				{
					event.preventDefault();
					
					if (delegateUpdate(e, this))
					{
						// Row up
						var nextF = $(e).parent().prev().find('td').eq($(e).index());
							if (nextF.length == 1)
								Sched_UI.createUpdateField(nextF.get(0));
							else Sched_UI.createUpdateField(e);
					}
					else $(this).wait(0).focus();
				}
				else if (event.which == 40)
				{
					event.preventDefault();
					
					if (delegateUpdate(e, this))
					{
						// Row down
						var nextF = $(e).parent().next().find('td').eq($(e).index());
							if (nextF.length == 1)
								Sched_UI.createUpdateField(nextF.get(0));
							else Sched_UI.createUpdateField(e);
					}
					else $(this).wait(0).focus();
				}
			})
			.focusout(function() {
				// Update
				if (delegateUpdate(e, this))
				{
					// Validation call for processes
					Sched_Scheduler.validateProcesses();
					
					// Table order could be outdated
					// Create new table
					self.createProcessDefinitionTable(false);
				}
				else $(this).wait(0).focus();
			});
		$(e).html(aField);
		aField.wait(0).focus();
		aField.select();
	};
	
	// Create combo box of scheduling strategies and simulate default
	this.initSchedStrategies = function() {
		$(Sched_Strategies.strategies).each(function(i, v) {
			$(_sched_combo).append('<option ' + (v.name=="CUSTOM (User defined)"?'class="italicEntry"':'') + '>' + v.name + '</option>');
		});
		
		$(_sched_combo).change(function(){
			var selected = Sched_Strategies.getStrategyByName($(_sched_combo).val());
			selected.setup();
			
			Sched_Strategies.activeStrategy = $(_sched_combo).children("option:selected").index();
			
			// Validation call after strategy setup
			Sched_Scheduler.validateProcesses();
			
			self.createProcessDefinitionTable(false);
			self.createSchedulerOptions(selected);
			
			// Call simulation
			self.simulate();
		})
		.click(function(){
			$(this).find("option:contains('CUSTOM (User defined)')").effect("highlight", 2000);
			$(this).off("click");
		});
		
		var selected = Sched_Strategies.getStrategyByName($(_sched_combo).val())
		selected.setup();
		self.createSchedulerOptions(selected);
	};
	
	// Create Table with default header, footer and functionality
	this.createProcessDefinitionTable = function(fadeInLast) {
		// Disable blocked editing state
		editing = false;
		
		// Table head
		var table_head = $("<tr></tr>");
		table_head.append("<td>Fn</td>");
		
		$.each(Sched_ProcessDef.attributes, function(i, val) {
			table_head.append((val["isUnique"] ? "<td style='color: #4b8100'>" : "<td>") + val["description"] + "</td>");
		});
		
		$(_table_head).html("");
		$(_table_head).append(table_head);
		
		
		// Table foot
		var table_foot = $("<tr></tr>");
		
		var b_addProcess = $('<button title="Add process">Add</button>')
			.click(function(){
				// Adding a new process
				addProcess();
			})
			.button({
				icons: {
					primary: "ui-icon-plusthick"
				},
				text: true
			});
		
		$(table_foot).append($("<td></td>").append(b_addProcess));
		
		$.each(Sched_ProcessDef.attributes, function(i, val) {
			var tmp_input = $('<input type="text" style="width:' + val["width"] + '" placeholder="' + val["description"] 
				+ '" name="' + i + '" id="' + i + '" >')
				.keyup(function( event ) {
					if ( event.which == 13 ) {
						event.preventDefault();
						
						var acceptFunction = Types.pub[Sched_ProcessDef.attributes[i]["type"]]["accept"];
						var userInput = $("#" + i).val();
						
						if (acceptFunction(userInput) == true)
						{
							var nextInputCell = $("#" + i).parent().next("td").children("input");
							
							if(nextInputCell.length == 0)
							{
								// Adding a new process
								addProcess();
							}
							else
							{
								// Set focus on next cell
								nextInputCell.focus();
							}
						}
						else
						{
							Tooltip.warn('Error:<br /><br />Input "' + val["description"] 
								+ '" mismatched type "' + Sched_ProcessDef.attributes[i]["type"] + '"!', 3);
						}
					}
				})
				.focusout(function() {
					var allowFunction = Types.pub[Sched_ProcessDef.attributes[i]["type"]]["allow"];
					var userInput = $("#" + i).val();
					
					if (allowFunction(userInput) == false)
					{
						Tooltip.warn('Error:<br /><br />Input "' + val["description"] 
							+ '" mismatched type "' + Sched_ProcessDef.attributes[i]["type"] + '"!', 3);
						$("#" + i).wait(0).focus();
					}
				});
			
			table_foot.append($("<td></td>").append(tmp_input));
		});
		
		$(_table_foot).html("");
		$(_table_foot).append(table_foot);
		
		
		// Table body
		
		// Iterate through defined processes and add them
		$(_table_body).html("");
		for (var itP = 0; itP < Sched_Scheduler.allProcessList.length; itP++)
		{
			var newTableRow = $("<tr></tr>");
			newTableRow.append('<td></td>');
			$.each(Sched_ProcessDef.attributes, function(i, val) {
				var cellText = Sched_Scheduler.allProcessList[itP].getAttribute(i);
				var cell = $('<td' + (Sched_ProcessDef.attributes[i]["isUnique"]?'':' ondblclick="Sched_UI.createUpdateField(this);" title="Double click to edit"') + '>' + cellText + '</td>');
				cell.data("attributeName", i);
				cell.data("process", Sched_Scheduler.allProcessList[itP]);
				newTableRow.append(cell);
			});
			$(_table_body).append(newTableRow);
		}
		
		// Functionality bottons for each process in table body
		var firstCell = $(_table_body + " tr").children("td:first-child").each(function() {
			var buttonset = $('<div></div>');
			
			// Delete process
			buttonset.append($('<button title="Delete process">Delete process</button>')
				.click(function() {
					var tableRow = $(this).parent().parent().parent();
					
					var performDeletion = function() {
						// Also delete from scheduler process list
						var p = Sched_Scheduler.allProcessList.splice(tableRow.index(),1)[0];
						
						tableRow.fadeOut(function(){$(this).remove();});
						Tooltip.show('Success:<br /><br />Process "' + p.getAttribute("name") + '" has been deleted!', 3);
						
						// Call simulation
						Sched_Strategies.strategies[Sched_Strategies.activeStrategy].setup();
						self.simulate();
						
						// Set focus on first input field
						$(_table_foot + " tr td input")[0].focus();
					}
					
					if (noConfirmationDeletion)
						performDeletion();
					else
						Dialog.yesCancel('Process deletion', '<p>This process will be permanently deleted and cannot be recovered.<br />' +
							'Are you sure?</p><p><span style="font-size:10px;">* To prevent this dialog from appearing, hold down <span class="textKey ui-corner-all">CTRL</span> key while clicking on the <span class="textSymbol ui-state-default ui-corner-all"><span class="ui-icon ui-icon-trash"></span></span> button!</span></p>', performDeletion);
				})
				.button({
					icons: {
						primary: "ui-icon-trash"
					},
					text: false
				})
			);
			
			// Toggle active button
			var tableRowNext = $(this).next();
			var thisActiveID = "active_" + tableRowNext.data("process").getAttribute("name");
			
			var activeButton = $('<input id="' + thisActiveID + '" type="checkbox" title="Activate or deactivate process" ' 
				+ (Sched_Scheduler.allProcessList[$(this).parent().index()].isActive ? 'checked' : '') 
				+ ' ' 
				+ (Sched_Scheduler.allProcessList[$(this).parent().index()].isValid ? '' : 'disabled') 
				+ ' >');
			
			var activeLabel = $('<label for="' + thisActiveID + '">Toggle process active</label>');
			
			buttonset.append(activeButton);
			buttonset.append(activeLabel);
			
			activeButton
				.click(function() {
					Sched_Scheduler.allProcessList[$(this).parent().parent().parent().index()].isActive = $(this).prop("checked");
					
					// Call simulation
					Sched_Strategies.strategies[Sched_Strategies.activeStrategy].setup();
					self.simulate();
				})
				.change(function() {
					$(this).button("option", { 
						icons: { primary: this.checked ? 'ui-icon-check' : 'ui-icon-power' }
					});
				})
				.button({
					icons: {
						primary: Sched_Scheduler.allProcessList[$(this).parent().index()].isActive ? 'ui-icon-check' : 'ui-icon-power'
					},
					text: false
				});
			
			buttonset.buttonset();
			$(this).append(buttonset);
		});
		
		$(_table_body).sortable({
			helper: fixRowWidthHelper,
			containment: $(_table_body).parent(),
			start: beforeChangedProcessTable,
			stop: changedProcessTable
		});
		
		if (fadeInLast)
		{
			$(_table_body).children("tr:last-child").children("td").hide().fadeIn("slow");
		}
	};
	
	// Create strategy options
	this.createSchedulerOptions = function(strategy) {
		// Clear previous strategy options
		$(_sched_ops_table_body).html("");
		$(_sched_ops_table_foot).html("");
		
		$(_sched_custom).html("");
		
		// Create strategy options
		$.each(strategy.globalAttributes, function(i, val) {
			var sched_ops_table_body = $("<tr></tr>");
			if (val["readOnly"])
			{
				sched_ops_table_body.append("<td>" + val["description"] + "</td><td>" + val["value"] + "</td>");
			}
			else
			{
				var tmp_input = $('<input type="text" placeholder="' + val["description"] 
					+ '" name="' + i + '" id="' + i + '" value="' + val["value"] + '" >');
				
				sched_ops_table_body.append("<td>" + val["description"] + "</td>");
				sched_ops_table_body.append($("<td></td>").append(tmp_input));
			}
			$(_sched_ops_table_body).append(sched_ops_table_body);
		});
		
		// Strategy options save
		$(_sched_ops_table_foot).append($("<tr></tr>").append($("<td colspan=2></td>").append(
			$('<button title="Save strategy options">Save and apply</button>')
				.click(function(){
					$(_sched_ops_table_body).find("input").each(function() {
						var acceptFunction = Types.pub[strategy.globalAttributes[$(this).prop("name")]["type"]]["accept"];
						var userInput = $(this).val();
						
						if (acceptFunction(userInput) == false)
						{
							Tooltip.warn('Error:<br /><br />Input "' + strategy.globalAttributes[$(this).prop("name")]["description"] 
								+ '" mismatched type "' + strategy.globalAttributes[$(this).prop("name")]["type"] + '"!', 3);
							$(this).wait(0).focus();
						}
						else
						{
							strategy.globalAttributes[$(this).prop("name")]["value"] = $(this).val();
						}
					});
					
					// Update simulation after a strategy option changed
					
					// Call simulation
					Sched_Strategies.strategies[Sched_Strategies.activeStrategy].setup();
					self.simulate();
				})
				.button({
					icons: {
						primary: "ui-icon-disk"
					},
					text: true
				})
		)));
		
		// Show strategy options if any, hide else
		if (Object.keys(strategy.globalAttributes).length>0){
			$(_sched_ops_table).show();
		}
		else
		{
			$(_sched_ops_table).hide();
		}
		
		// CUSTOM strategy?
		if (strategy.name == "CUSTOM (User defined)")
		{
			var editButton = $('<button title="Edit scheduling code">Edit source</button>')
				.click(function(){
					var editor;
					
					$('<div id="customCode"><div id="customCodeEditor"></div></div>').dialog({
						'modal': true,
						'resizable': false,
						'width': 'auto',
						'show': 'fade',
						'hide': 'fade',
						'title': 'Adjust custom strategy code',
						'buttons': {
							'Apply' : function() {
								if ($('#customCodeEditor').html()!='')
								{
									strategy.userCode = editor.getValue();
									strategy.setup();
									self.simulate();
									$(this).dialog('close');
								}
							},
							'Cancel': function() {
								$(this).dialog('close');
							}
						},
						'close': function(){$(this).remove();}
					});
					editor = ace.edit("customCodeEditor");
					editor.setTheme("ace/theme/chrome");
					editor.getSession().setMode("ace/mode/javascript");
					editor.getSession().setUseWrapMode(true);
					
					editor.setValue(strategy.userCode, 1);
					
				})
				.button({
					icons: {
						primary: "ui-icon-pencil"
					},
					text: true
				});
			
			$(_sched_custom).append('<br /><br /><span class="header">Strategy source:</span><br /><br />');
			$(_sched_custom).append(editButton);
		}
	};
	
	// Create button for statistics for active schedule
	this.createStatsButton = function() {
		$("#sched_add_stats").button({
			icons: {
				primary: "ui-icon-document"
			},
			text: true
		})
		.click(function(){
			Table.appendStats();
		});
	};
	
	this.Simulator;
	this.simulate = function() {
		self.Simulator = new Sched_Scheduler.simulateSchedule();
		var activeCount = self.Simulator.getProcessCount();
		
		// Rescale canvas
		Sched_Gantt.initCanvas(activeCount * 30 + 20);
		
		self.Simulator.drawGrid();
		self.Simulator.drawProcessNames();
		
		var selected = Sched_Strategies.getStrategyByName($(_sched_combo).val());
		if (selected.name == "CUSTOM (User defined)")
		{
			// Asynchronous
			var i = 1;
			var nextTick = function()
			{
				if (i < Sched_Gantt.getVerticalParts())
				{
					i++;
					return true;
				}
				else
				{
					self.Simulator.prepareFSM();
					return false;
				}
			};
			
			self.Simulator.tickAsync(nextTick);
		}
		else
		{
			// Synchronous
			for (var i = 0; i < Sched_Gantt.getVerticalParts(); i++)
			{
				self.Simulator.tick();
			}
			
			self.Simulator.prepareFSM();
		}
	};
	
	$(document).ready(function(){
		$("body").keydown(function(e){
			if (e.ctrlKey) noConfirmationDeletion = true;
		});
		$("body").keyup(function(e){
			if (!e.ctrlKey) noConfirmationDeletion = false;
		});
	});
};
