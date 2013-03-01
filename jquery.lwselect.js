(function($){
	$.fn.lwSelect = function(opts){
		opts = $.extend({}, $.fn.lwSelect.defaults, opts);
		return this.each(function(){
			var lws = new LWSelect(this, opts)
			//$.fn.lwSelect.controller.add(newMS); //每新建一个多选列表，则将其添加到多选的控制器中
			return lws;
		});
	};
	
	// counter to dynamically generate label/option IDs if they don't exist
	var lwSelectID = 0;
	
	var LWSelect = function(select,o){
		var $select = $original = $(select), 
			$container,$options, $header, $labels,$lsContainer,
			$data=[],
			$level=[],
			html = [], 
			optgroups = [], 
			openedNodes=[],
			openedOptionContainer=[], /*OptionContainer s*/
			openedParentOption=[],
			isDisabled = $select.is(':disabled'), 
			id = select.id || 'ui-lwSelect-'+lwSelectID++; // unique ID for the label & option tags
		
		//定义常量
		var _constant = {
			clazz: {
				root:"ui-lwSelect",
				header:"ui-lwSelect-header",
				icon:"ui-lwSelect-icon",
				icon_down :"ui-lwSelect-icon-pulldown",
				icon_up:"ui-lwSelect-icon-up",
				checkbox:"ui-lwSelect-checkbox",
				level:["","ui-lwSelect-level2","ui-lwSelect-level3","ui-lwSelect-level4","ui-lwSelect-level5"],
				nodeContainer:"ui-lwSelect-nodeContainer",
				node:"ui-lwSelect-node"
			}
		}
		var _init = function(){
			initContainer();
			$select.after($container);
			covertOptionsToData();
			buildLevelContainer().appendTo($container);
			
		};
		//初始化多选的容器HTML
		var initContainer = function (){
			$container = $("<div></div>").addClass(_constant.clazz.root)
						.css("left","20px")
						.css("top","20px");
			$header = $("<div></div>").addClass(_constant.clazz.header).appendTo($container);
		};
		
		//将select元素的options内容转换为相应的json data
		var covertOptionsToData = function(){
			$options=$original.find("option");
			$data.push('[');
			$options.each(function(i){
				var $this_option=$(this),
					text = $this_option.html(), 
					value = $this_option.val();
					vArray = value.split(o.splitStr);
					level  = vArray.length;
					parentId = vArray[vArray.length-2];
					value = vArray[vArray.length-1];
					$data.push('{');
					$data.push('"id":"'+value+'",');
					$data.push('"name":"'+text+'",');
					$data.push('"parentId":"'+parentId+'",');
					$data.push('"level":"'+level+'"');
					$data.push('}');
					$data.push(',');
			});
			$data.pop();
			$data.push(']');
			$data = $.parseJSON($data.join(''));
		};
		
		var buildLevelContainer = function(){
			$lsContainer = $("<div/>");
			//build NodeContainers
			var nodeContainers =[];
			var nodes=[];
			$.each($data,function(i,obj){
				var level = obj.level;
				//如果没有找到Level，则建立一个新的Level
				if(!nodeContainers[obj.level-1]){
					var nc = new NodeContainerClass(obj.level);
					if(obj.level > 1) {
						//nc.hide();
					}
					nodeContainers[obj.level-1]= nc;
				}
				
				//创建Node
				var node = new NodeClass(obj);
				if(obj.level > 1) {
					node.hide();
				}
				if(!nodes[obj.level-1]){
					nodes[obj.level-1]=[];
				}
				nodes[obj.level-1].push(node);
				
				//创建父子关系
				if(obj.level-2 >=0 && nodes[obj.level-2]) {
					$.each(nodes[obj.level-2],function(j,pObj){
						if(obj.parentId && pObj.data.id == obj.parentId){
								pObj.childOptions.push(node);
								node.parentOption=pObj;
						}
					});
				}
			});
			
			//add nodes to view
			$.each(nodes,function(i,node_s){
				$.each(node_s,function(j,node){
					nodeContainers[i].append(node);
				});
			});
			
			
			//node.appendTo(nodeContainers[obj.level-1]);
			//add nodeContainers to view
			$.each(nodeContainers,function(i,obj){
				$lsContainer.append(nodeContainers[i]);
			});
			return $lsContainer;
		};
		
		/*NodeContainerClass*/
		var NodeContainerClass = function(level){
			var lid = buildId(level);
			var $obj = $("<ul/>").addClass(_constant.clazz.nodeContainer).attr("id",lid);
			if(level > 1){
				$obj.addClass(_constant.clazz.level[level-1]);
			}
			function buildId(level){
				return "id-lwSelect-level-"+level;
			};
			this.buildId=buildId;
			$obj.id=lid;
			$obj.level=level;
			return $obj;
		}
		
		/*Level Option Object*/
		var NodeClass = function(data,opts){
			var $node,$checkbox,$pulldown,$a;
				$node= $("<li/>").addClass(_constant.clazz.option);
				$checkbox = $("<input type=checkbox />")
							.val(data.id)
							.html(data.name)
							.attr("name",data.name)
							.addClass(_constant.clazz.checkbox).click(function(){
								$node.nodeToggleChecked();
								$node.pullClose();
							});
				$pulldown = $("<span/>").addClass(_constant.clazz.icon)
							.addClass(_constant.clazz.icon_down)
							.attr("childId",data.id)
							.click(function(){
							});

				$a = $("<a/>").click(function(){
						$node.pullToggle();
				});
				if($.inArray(Number(data.level),o.forbiddenCheckedLevel)==-1){
					$a.append($checkbox);
				}else{
						$a.css("padding-left","8px");
				}
				$a.append(data.name);
				if(data.level < o.maxLevel){
				$a.append($pulldown);
				}
				$node.append($a);
				$node.data=data;
				$node.parentOption;
				$node.childOptions=[];
				
			$node.nodeChecked=function(opt){
				var _default = {
					checkChild:true,
					checkParent:true
				};
				opt = $.extend({},_default,opt);
				
				$checkbox.attr("checked",true);
				$node.checked = true;
				if(opt.checkChild){
					//选中所有子节点
					$.each($node.childOptions,function(i,obj){
						if(!obj.checked){
							obj.nodeChecked({checkParent:false});
						}
					});
				}
				if(opt.checkParent){
					//检测其父节点的所有子节点，是否都选中，如果都选中，则其父节点也选中
					var allChecked = true;
					if($node.parentOption){
						$.each($node.parentOption.childOptions,function(i,obj){
							if(!obj.checked){
								allChecked = false;
								return false;
							}
						});
						if(allChecked && !$node.parentOption.checked){
							$node.parentOption.nodeChecked({checkChild:false});
						}
					}
				}
			};
			
			/** 
				反checked
			**/
			$node.nodeUnChecked=function(opt){
				var _default = {
					checkChild:true,
					checkParent:true
				};
				opt = $.extend({},_default,opt);
				//取消其子节点的选中状态
				$checkbox.attr("checked",false);
				$node.checked = false;
				if(opt.checkChild){
					$.each($node.childOptions,function(i,obj){
						if(obj.checked){
						obj.nodeUnChecked({checkParent:false});
						}
					});
				}
				
				if(opt.checkParent){
					//检测其父节点的所有子节点，是否都选中，如果都选中，则其父节点也选中
					var allUnChecked = true;
					if($node.parentOption){
						$.each($node.parentOption.childOptions,function(i,obj){
							if(obj.checked){
								allUnChecked = false;
								return false;
							}
						});
						if(allUnChecked && $node.parentOption.checked){
							$node.parentOption.nodeUnChecked({checkChild:false});
						}
					}
				}
			};
			
			$node.nodeToggleChecked=function(){
				if($node.checked){
					$node.nodeUnChecked();
				}else{
					$node.nodeChecked();
				}
			};
			
			/**
			关闭
			**/
			$node.pullClose=function(){
				$.each($node.childOptions,function(i,obj){
					obj.pullClose();
					obj.hide();
				});
				$node.isOpen = false;
				$pulldown.removeClass(_constant.clazz.icon_up);
				$pulldown.addClass(_constant.clazz.icon_down);
				if($node.childOptions.length>0){
					$node.removeClass(_constant.clazz.level[data.level]);
				};
				//1.隐藏其子元素
				/*
				$.each(showedNodes,function(i,obj){
					if(i> data.level-1){
						$.each(showedNodes[i],function(j,oo){
							oo.hide();
						});
						showedNodes[i]=[];
					}
				});*/
			};
			
			/** 
			展开
			**/
			$node.pullOpen=function(){
				//1.首先关闭同级别的
				if(openedNodes[data.level-1]){
					openedNodes[data.level-1].pullClose();
				}
				openedNodes[data.level-1]=[];
				//1.切换Span图标状态
				$node.isOpen = true;
				$pulldown.removeClass(_constant.clazz.icon_down);
				$pulldown.addClass(_constant.clazz.icon_up);
				if($node.childOptions.length>0){
					$node.addClass(_constant.clazz.level[data.level]);
				};
				
				openedNodes[data.level-1]=$node;
				//2.显示其子元素
				$.each($node.childOptions,function(i,obj){
						obj.show();
				});
			};
			
			$node.pullToggle=function(){
				$node.isOpen?$node.pullClose():$node.pullOpen();
			};
			
			$node.reset=function(){
				$(this).find("."+_constant.clazz.icon).addClass(_constant.clazz.icon_down);
				$(this).find("."+_constant.clazz.icon).addClass(_constant.clazz.icon_up);
			};
			$node.bind({
				down:function(){
					$(this).find("."+_constant.clazz.icon_down).click();
				},
				up:function(){
					$(this).find("."+_constant.clazz.icon_up).click();
				}
			});
			return $node;
		};
		
		//同步子Option的选中状态
		function resetChildOption(checkbox){
			var $this = checkbox;
			var $optionUI = $this.parents("."+_constant.clazz.option);
			var checkStatus = $this.attr("checked")?true:false;
			var parentId = $optionUI.attr("parentId");
			var oid = $optionUI.attr("oid");
			//2.保证子option与其状态同步
			if($lsContainer.find("."+_constant.clazz.option+"[parentId="+oid+"]").size<=0){
				return false;
			}
			$lsContainer.find("."+_constant.clazz.option+"[parentId="+oid+"]").each(function(){
				var cb = $(this).find("."+_constant.clazz.checkbox);
				cb.attr("checked",checkStatus);
				resetChildOption(cb);
			});
		}
		
		function resetParentOption(checkbox){
			var $this = checkbox;
			var $optionUI = $this.parents("."+_constant.clazz.option);
			var checkStatus = $this.attr("checked")?true:false;
			var parentId = $optionUI.attr("parentId");
			var oid = $optionUI.attr("oid");
			var isAllSame = true;
			if($lsContainer.find("."+_constant.clazz.option+"[oid="+parentId+"]").size()<=0){
				return false;
			}
			
			//查找options
			$lsContainer.find("."+_constant.clazz.option+"[parentId="+parentId+"]").each(function(){
				var cs = $(this).find("."+_constant.clazz.checkbox).attr("checked")?true:false;
				if(cs != checkStatus){
					isAllSame = false;
					return false;
				}
			});
			if(isAllSame){
				var parentCheckbox = $lsContainer.find("."+_constant.clazz.option+"[oid="+parentId+"]").find("."+_constant.clazz.checkbox);
				parentCheckbox.attr("checked",checkStatus);
				resetParentOption(parentCheckbox);
			}
		}
		
		function resetSelectText(){
		}
		//更新文本框中选中个数
		var refreshSelected = function(){
			
		};
		
		/*执行部分*/
		_init();
		return this;
	};
	
	// default options
	$.fn.lwSelect.defaults = {
		showHeader: true,
		maxHeight: 400, /* max height of the checkbox container (scroll) in pixels */
		minWidth: 1024, /* min width of the entire widget in pixels. setting to 'auto' will disable */
		maxLevel:3,
		defaultShowLevel:2,
		forbiddenCheckedLevel:[],
		splitStr:"|",
		checkAllText: 'All',
		unCheckAllText: 'None',
		noneSelectedText: 'Select options',
		selectedText: '# selected',
		selectedList: 0,
		position: 'bottom', /* top|middle|bottom */
		shadow: false,
		fadeSpeed: 200,
		disabled: false,
		state: 'closed',
		multiple: true, 
		onCheck: function(){}, /* when an individual checkbox is clicked */
		onOpen: function(){}, /* when the select menu is opened */
		onCheckAll: function(){}, /* when the check all link is clicked */
		onUncheckAll: function(){}, /* when the uncheck all link is clicked */
		onOptgroupToggle: function(){} /* when the optgroup heading is clicked */
	};
	
	/*
	$.fn.lwSelect.controller = {
		$list:new Array(),
		add:function(o){
			this.$list.push(o);
		},
		remove:function(id){
			
		},
		find:function(id){
			var findObj;
			$.each(this.$list,function(i){
				var now_id = this.getId();
				if(now_id == id){
					findObj =  this;
					return false;
				}
			});
			return findObj;
		}
	};*/
})(jQuery);
