define(function(require, exports, module) {

  var d3 = require('../lib/d3');
  var $ = require('../lib/jquery');
  var startDrag = require('../module/mousedrag');

  module.exports = modelview;

  // 用d3实现model可视化
  function modelview(model, currentClass) {

    var $container = $('.stigmod-modal-d3');

    //svg的长宽
    var width = $container[0].clientWidth - 30;
    var height = $container[0].clientHeight - 80;  // 80px 包含了各种 margin padding


    var colorFillArray = {green: "#30B6AF", yellow: "#FCC940", blue: "#4356C0", grey:"#BABDBC",
                          orange: "#F25A29", purple: "#AD62CE", red: "#FF6C7C"};
    var colorStrokeArray = {green: "#46A39E", yellow: "#F3BA25", blue: "#3445A2", grey:"#888888",
                            orange: "#DC4717", purple: "#9453B1", red: "#EB5D6C"};

    var selectedColor = "#005499";  //选择之后圈和连线的颜色
    var lineColor = {Association:"#BABDBC", Aggregation:"#BABDBC", Composition:"#BABDBC",
                    Generalization:"#BABDBC", RelationGroup:"#BABDBC"};      //连线的颜色
    var strokeColor = ["#46A39E", "#F3BA25"];    //不选择时圈的颜色
    var fillColor = ["#30B6AF", "#FCC940"];      //点的颜色
    var nameNotSelectedFill = "#999"; //名字的颜色

    var lineWidth = 1;              //连线的宽度
    var lineSelectedWidth = 2;      //连线被选择之后的宽度
    var groupLineWidth = 3;
    var groupPathWidth = 1;
    var groupLineSelectedWidth = 5;

    /**
     *  将模型数据转换为展示 model view 所需的格式
     *   存入dataset
     */

    var dataset = {
      nodes: [],
      edges: []
    };

    var nodeRecord = {}; //记录node节点标号
    var nodeNumber = 0;

    //类转存入nodes
    for (ClassVar in model[0]) {
      var myclass = {};
      myclass.name = ClassVar;
      var myAttribute = [];
      for (AttributeVar in model[0][ClassVar][0])
        myAttribute.push(model[0][ClassVar][0][AttributeVar][0]);
      myclass.attribute = myAttribute;
      if(myclass.name === "Week" || myclass.name === "Date" || myclass.name === "DayOfWeek"
        || myclass.name === "Title" || myclass.name === "Semester" || myclass.name === "CourseCharacter"
        || myclass.name === "Time" || myclass.name === "RentStatus" || myclass.name === "CDType"
          || myclass.name === "Gender" || myclass.name === "State" || myclass.name === "CDClass"
          || myclass.name === "RentalState" || myclass.name === "Post" || myclass.name === "PayMethod"
       || myclass.name === "Category")
        myclass.classtype = 1;
      else
        myclass.classtype = 0;
      dataset.nodes.push(myclass);
      nodeRecord[ClassVar] = nodeNumber;
      nodeNumber = nodeNumber + 1;
    }

    //关系转存入edges
    for (RelationVar in model[1]) {

      var myrelation = {};
      var relationNum = 0;

      //计算relationgroup中有多少关系
      for (i in model[1][RelationVar][0]) {
        relationNum ++;
      }

      if(relationNum == 1) {
        for (AttributeVar in model[1][RelationVar][0]) {
          myrelation.type = model[1][RelationVar][0][AttributeVar][0]["type"][0];
          var class1 = model[1][RelationVar][0][AttributeVar][0]["class"][1];
          var class2 = model[1][RelationVar][0][AttributeVar][0]["class"][0];
          myrelation.source = nodeRecord[class1];
          myrelation.target = nodeRecord[class2];
          myrelation.multiplicity = model[1][RelationVar][0][AttributeVar][0]["multiplicity"];
          myrelation.role = model[1][RelationVar][0][AttributeVar][0]["role"];
        }
      }
      else {
        var relationCount = 0;
        myrelation.group = {};
        myrelation.type = "RelationGroup";
        for (AttributeVar in model[1][RelationVar][0]) {
          myrelation.group[relationCount] = {};
          if(relationCount == 0) {
            var class1 = model[1][RelationVar][0][AttributeVar][0]["class"][1];
            var class2 = model[1][RelationVar][0][AttributeVar][0]["class"][0];
            myrelation.source = nodeRecord[class1];
            myrelation.target = nodeRecord[class2];
          }
          myrelation.group[relationCount].type = model[1][RelationVar][0][AttributeVar][0]["type"][0];
          myrelation.group[relationCount].multiplicity = model[1][RelationVar][0][AttributeVar][0]["multiplicity"];
          myrelation.group[relationCount].role = model[1][RelationVar][0][AttributeVar][0]["role"];
          relationCount += 1;
        }
      }
      dataset.edges.push(myrelation);
    }

    //缩放定义
    var zoom = d3.behavior.zoom()
      // .center([width / 2, height / 2])
      //.scaleExtent([1, 10])
      .on("zoom", zoomed);


    // Detail 框的拖拽
    var tooltip = document.getElementById('tooltip');
    startDrag(tooltip, tooltip);


    

    //设置svg的大小
    var svg = d3.select("#view")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("cursor", "default")
      .append("g")
      .call(zoom); //调用缩放功能
      // .append("svg:g");
      // .on("mousedown.zoom", null); //防止拖拽

    //颜色为白的背景 -> 缩放时无需鼠标移到node上
    svg.append("rect")
      .attr("class", "background")
      .attr("fill", "#fff")
      .attr("width", width)
      .attr("height", height);

    var container = svg.append("svg:g");


    //使用dataset中的nodes和edges初始化force布局
    var force = d3.layout.force()
      .nodes(dataset.nodes)
      .links(dataset.edges)
      .size([width, height])
      .linkDistance(150)
      .charge([-350])
      .start();

    var drag = force.drag()
      .on("dragstart", function(d) {
        d3.event.sourceEvent.stopPropagation();
    });


    //连线与edges数据绑定
    var link = container.selectAll(".link")
      .data(dataset.edges)
      //.data(model[1]) 
      .enter().append("g")
      .attr("class", "link");

    //节点与nodes数据绑定
    var node = container.selectAll(".node")
      .data(dataset.nodes)
      .enter().append("g")
      .attr("class", "node")
      .call(drag);
      // .call(force.drag().on("drag", function(d) { drag() }));




    //节点添加文本，文本内容为节点名称
    var myname = node.append("text")
      .attr("x", function(d){
        return radiusover(d) + 2;
      })
      .attr("y", ".35em")
      .text(function(d) {
        return d.name;
      })
      .attr("font-size", "12")
      .attr("fill", "#666");
      // .attr("stroke-width", 0.5);


    //颜色范围
    var colors = d3.scale.category20();

    //箭头定义
    var defs = container.append("defs");

    //Generalization箭头(空心三角)
    var genMarker = defs.append("marker")
      .attr("id", "Generalization") //箭头id
      .attr("markerUnits", "userSpaceOnUse")
      .attr("viewBox", "-5 -5 15 10")
      .attr("markerWidth", 12)
      .attr("markerHeight", 12)
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("orient", "auto")
      .append("svg:path")
        .attr("class", "genColortoChange")
        .attr("stroke-width", lineWidth)
        .attr("d", "M0,-5L10,0L0,5Z")
        .attr("fill", "#fff")
        .attr("stroke", lineColor["Generalization"]);

    //连线高亮时的Generalization箭头
    var genMarkerHover = defs.append("marker")
      .attr("id", "GeneralizationHover")
      .attr("markerUnits", "userSpaceOnUse")
      .attr("viewBox", "-5 -5 15 10")
      .attr("markerWidth", 12)
      .attr("markerHeight", 12)
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("orient", "auto")
      .append("svg:path")
      .attr("stroke-width", lineSelectedWidth)
      .attr("stroke-linecap", "round")
      .attr("d", "M0,-5L10,0L0,5Z")
      .attr("fill", "#fff")
      .attr("stroke", selectedColor);

    //Aggregation箭头(空心菱形)
    var aggreMarker = defs.append("marker")
      .attr("id", "Aggregation")
      .attr("markerUnits", "userSpaceOnUse")
      .attr("viewBox", "-10 -5 20 10")
      .attr("markerWidth", 12)
      .attr("markerHeight", 12)
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("orient", "auto")
      .append("svg:path")
        .attr("class", "aggColortoChange")
        .attr("stroke-width", 1.5)
        .attr("d", "M0,-5L10,0L0,5L-10,0Z")
        .attr("fill", "#fff")
        .attr("stroke", lineColor["Aggregation"]);

    //连线高亮时的Aggregation箭头
    var aggreMarkerHover = defs.append("marker")
      .attr("id", "AggregationHover")
      .attr("markerUnits", "userSpaceOnUse")
      .attr("viewBox", "-10 -5 20 10")
      .attr("markerWidth", 12)
      .attr("markerHeight", 12)
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("orient", "auto")
      .append("svg:path")
      .attr("stroke-width", lineSelectedWidth)
      .attr("d", "M0,-5L10,0L0,5L-10,0Z")
      .attr("fill", "#fff")
      .attr("stroke", selectedColor);

    //Composition箭头(实心菱形)
    var comMarker = defs.append("marker")
      .attr("id", "Composition")
      .attr("markerUnits", "userSpaceOnUse")
      .attr("viewBox", "-10 -5 20 10")
      .attr("markerWidth", 12)
      .attr("markerHeight", 12)
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("orient", "auto")
      .append("svg:path")
        .attr("id", "compositionMarker")
        .attr("stroke-width", lineWidth)
        .attr("d", "M0,-5L10,0L0,5L-10,0Z")
        .attr("fill", lineColor["Composition"])
        .attr("stroke", lineColor["Composition"]);

    //连线高亮时的Composition箭头
    var comMarkerHover = defs.append("marker")
      .attr("id", "CompositionHover")
      .attr("markerUnits", "userSpaceOnUse")
      .attr("viewBox", "-10 -5 20 10")
      .attr("markerWidth", 12)
      .attr("markerHeight", 12)
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("orient", "auto")
      .append("svg:path")
      .attr("stroke-width", lineSelectedWidth)
      .attr("d", "M0,-5L10,0L0,5L-10,0Z")
      .attr("fill", selectedColor)
      .attr("stroke", selectedColor);


    /**
     *   Zoom缩放函数
     */

    function zoomed() {
      container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }

    // function dragstarted(d) {
    //   d3.event.sourceEvent.stopPropagation();
      
    //   d3.select(this).classed("dragging", true);
    //   // force.start();
    // }

    // function dragged(d) {
      
    //   d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
      
    // }

    // function dragended(d) {
      
    //   d3.select(this).classed("dragging", false);
    // }



    /**
     *   计算半径函数
     */
    function radiusover(d) {
      if (!d.weight) { //节点weight属性没有值初始化为1（一般就是叶子了）  
        d.weight = 1;
      }
      return d.weight * 3 + 5;                               
    }


    //记录之前一次点击的临时节点
    var tmpnode = null;
    var tmpedge = null;

    /**
     *   将所有节点和边归为非高亮状态
     *   参数：空
     */
    function noneClickStyle() {
      //d3.select("#relationGroupDetail").classed("hidden", true);
      node.selectAll("circle")
        .attr("fill-opacity", 0.9)
        .attr("fill", function(d){
          return fillColor[d.classtype];
          })
        .attr("stroke-width", 1)
        .attr("stroke", function(d){
          return strokeColor[d.classtype];
        });
      node.selectAll("text")
        .attr("font-size", "12")
        .attr("fill", "#666")
        .attr("opacity", 1);
      link.selectAll("line")
        .attr("stroke", function(d) {
            return lineColor[d.type];
          })
        .attr("stroke-width", function(d){
            if(d.type === "RelationGroup")
              return groupLineWidth;
            else
              return lineWidth;
      })
        .attr("marker-end", function(d) {
          return "url(#" + d.type + ")";
        });                            
    }

    /**
     *   高亮某节点及其文本
     *   参数：被高亮节点node
     */
    // function highlightNode(node){

    //   //高亮该节点
    //   mycircle.attr("fill-opacity", function(mynode) {
    //     if (mynode === node)
    //       return 0.9;
    //     else
    //       return 0.5;
    //   });

    //   mycircle.attr("stroke-width", function(mynode) {
    //     if (mynode === node)
    //       return 3;
    //     else
    //       return 1;
    //   });

    //   //高亮节点相关的文本
    //   myname.attr("stroke", function(mytext) {
    //     if (mytext === node)
    //       return "#444";
    //     else
    //       return "#ccc";
    //   });

    //   myname.attr("stroke-width", function(mytext) {
    //     if (mytext === node)
    //       return 0.8;
    //     else
    //       return 0.5;
    //   });
    // }

    /**
     *   高亮与某节点相连的线
     *   参数：节点node
     */
    function highlightNodeEdge(node){
      
      //将该节点与所有邻居节点存入neighbors数组
      var neighbors = [];
      neighbors.push(node);

      myline.attr("stroke", function(edge) {
        if (edge.source === node) {
          neighbors.push(edge.target);
          return selectedColor;
        } 
        else if(edge.target == node){
          neighbors.push(edge.source);
          return selectedColor;
        }
        else
          return lineColor[edge.type];
      });

      myline.attr("stroke-width", function(edge) {
        if (edge.source === node || edge.target === node) {
          if(edge.type === "RelationGroup")
            return groupLineSelectedWidth;
          else
            return lineSelectedWidth;
        } else {
          if(edge.type === "RelationGroup")
            return groupLineWidth;
          else
            return lineWidth;
        }
      });

      myline.attr("marker-end", function(edge) {
        if (edge.source === node || edge.target === node) {
          return "url(#" + edge.type + "Hover)";
        } else
          return "url(#" + edge.type + ")";
      });

      //高亮该节点与邻居节点
      mycircle.attr("fill-opacity", function(mynode) {
        if (neighbors.indexOf(mynode) > -1)
          return 1.0;
        else
          return 0.5;
      });

      mycircle.attr("stroke-width", function(mynode) {
        if (neighbors.indexOf(mynode) > -1)
          return 2;
        else
          return 0.5;
      });

      mycircle.attr("stroke", function(mynode) {
        if (neighbors.indexOf(mynode) > -1)
          return selectedColor;
        else
          return "none";
      });

      //高亮节点相关的文本
      myname.attr("font-size", function(mytext) {
        if (neighbors.indexOf(mytext) > -1)
          return 12;
        else
          return 11;
      });

      myname.attr("fill", function(mytext) {
        if (neighbors.indexOf(mytext) > -1)
          return "#000";
        else
          return nameNotSelectedFill;
      });

      myname.attr("opacity", function(mytext) {
        if (neighbors.indexOf(mytext) > -1)
          return 1;
        else
          return 0.6;
      });

    }

    /**
     *   高亮某条边
     *   参数：被高亮的边edge
     */
    function highlightEdge(edge){

      myline.attr("stroke", function(myedge) {
        if (myedge === edge) {
          return selectedColor;
        } else
          return lineColor[myedge.type];
      });

      myline.attr("stroke-width", function(myedge) {
        if (myedge === edge) {
          if(myedge.type === "RelationGroup")
            return groupLineSelectedWidth;
          else
            return lineSelectedWidth;
        } else {
          if(myedge.type === "RelationGroup")
            return groupLineWidth;
          else
            return lineWidth;
        }
      });

      myline.attr("marker-end", function(myedge) {
        if (myedge === edge) {
          return "url(#" + myedge.type + "Hover)";
        } else
          return "url(#" + myedge.type + ")";
      });

    }

    /**
     *   高亮与某条边相连的节点
     *   参数：被选择的边edge
     */
    function highlightEdgeNode(edge){
      //高亮该节点
      mycircle.attr("fill-opacity", function(mynode) {
        if (mynode === edge.source || mynode === edge.target)
          return 1.0;
        else
          return 0.5;
      });

      mycircle.attr("stroke-width", function(mynode) {
        if (mynode === edge.source || mynode === edge.target)
          return 2;
        else
          return 0.5;
      });

      mycircle.attr("stroke", function(mynode) {
        if (mynode === edge.source || mynode === edge.target)
          return selectedColor;
        else
          return "none";
      });

      //高亮节点相关的文本
      myname.attr("font-size", function(mytext) {
        if (mytext === edge.source || mytext === edge.target)
          return 12;
        else
          return 11;
      });

      myname.attr("fill", function(mytext) {
        if (mytext === edge.source || mytext === edge.target)
          return "#000";
        else
          return nameNotSelectedFill;
      });

      myname.attr("opacity", function(mytext) {
        if (mytext === edge.source || mytext === edge.target)
          return 1;
        else
          return 0.6;
      });
    }

    /**
     *   点击某一节点，
     *   右侧展示详细信息
     *   并高亮相关信息
     *   参数：被点击的节点node
     */
    function clickNode(node){

      //d3.select("#relationGroupDetail").classed("hidden", true);

      tmpnode = node;
      tmpedge = null;

      d3.select("#classDetail").remove();
      d3.select("#relationDetail").remove();

      //更新类的名字

      var nodeName = node.name;

      // d3.select("#tooltip")
      //   .style("left", mywidth - 350);

      d3.select("#tooltip")
        .append("div")
        .attr("id", "classDetail")
        .attr("style", "border: 1px solid #999; border-radius: 5px; padding:10px 0px;");

      // d3.select("#classDetail")
      //   .append("br");

      d3.select("#classDetail")
        .append("p")
        .attr("style", "text-align:center;font-weight:bold")
        .text(nodeName);

      d3.select("#classDetail")
        .append("hr")
        .attr("style", "border-top:1px solid #999; margin:10px 0px;");

      // 显示类的属性及相关信息
      d3.select("#classDetail")
        .append("span")
        .attr("id", "attributes");

      var attribute = "";
      node.attribute.forEach(function(property) {
        var propertyDetail = property.name;
        if (property.type !== undefined)
          propertyDetail = propertyDetail + " : " + property.type;
        d3.select("#attributes")
          .append("p")
          .attr("style", "padding-left:5%")
          .text(propertyDetail);
      });

      // d3.select("#attributes")
      //   .append("hr")
      //   .attr("style", "border-top:1px solid #999");
      // d3.select("#classDetail")
      //   .append("br");

      //显示类的属性
      d3.select("#tooltip").classed("hidden", false);
      //d3.select("#tooltip").call(drag);

      // var tipWidth = document.getElementById("tooltip").clientWidth;
      // var tipHeight = document.getElementById("tooltip").clientHeight;
      // var tmpsvg = d3.select("#classDetail")
      //   .append("svg")
      //   .attr("width", tipWidth)
      //   .attr("height", tipHeight)
      //   .append("g");
      // tmpsvg.append("rect")
      //   .attr("class", "background")
      //   .attr("fill", "#fff")
      //   .attr("width", tipWidth)
      //   .attr("height", tipHeight)
      //   .call(drag);


      //高亮该节点及文本
      // highlightNode(node);  


      //高亮与节点相连的线
      highlightNodeEdge(node);    
    }

    /**
     *   鼠标移到某节点上
     *   高亮相关信息
     *   参数：节点node
     */
    function mouseoverNode(node){
      //高亮该节点及文本
      // highlightNode(node);  

      
      //高亮与节点相连的线
      highlightNodeEdge(node); 
    }

    /**
     *   鼠标移走
     *   恢复之前点击状态
     *   参数：无
     */
    function mouseout(){
      //先将所有节点归为无高亮状态
      noneClickStyle();

      //高亮上一次点击的节点及与其相关信息
      if (tmpnode !== null)
        //更新类的名字
        clickNode(tmpnode);
      else if(tmpedge !== null)
        clickEdge(tmpedge);
      else {
        d3.select("#tooltip").classed("hidden", true);
        //d3.select("#relationGroupDetail").classed("hidden", true);
      } //如无需高亮的节点，隐藏右侧的详细信息

    }

    /**
     *   点击某边，
     *   右侧展示详细信息
     *   并高亮相关信息
     *   参数：被点击的边edge
     */
    function clickEdge(edge){
      
      tmpedge = edge;
      tmpnode = null;

      d3.select("#classDetail").remove();
      d3.select("#relationDetail").remove();

      var sourceName = edge.source.name;
      var targetName = edge.target.name;
      var type = edge.type;
      if(type === "RelationGroup") {
        var multi1 = "";
        var multi2 = "";
        var role1 = "";
        var role2 = "";
      }
      else {
        var multi1 = edge.multiplicity[0];
        var multi2 = edge.multiplicity[1];
        var role1 = edge.role[0];
        var role2 = edge.role[1];
      }
      // d3.select("#tooltip")
      //   .style("left", mywidth - 350);

      d3.select("#tooltip")
        .append("div")
        .attr("id", "relationDetail");
        // .attr("class", "row");

      // 上端类名
      d3.select("#relationDetail")
        .append("div")
        .attr("id", "targetClass")
        // .attr("class","col-xs-12") 
        // .attr("style", "border: 1px solid #999; padding: 0px; padding-top: 10px; padding-bottom: 10px;");
        .attr("style", "border: 1px solid #999; border-radius: 5px; padding:10px 0px; max-height: 155px; overflow: auto");

      // d3.select("#targetClass")
      //   .append("br");

      d3.select("#targetClass")
        .append("p")
        .attr("style", "text-align:center;font-weight:bold")
        .text(targetName);

      d3.select("#targetClass")
        .append("hr")
        .attr("style", "border-top:1px solid #999; margin:10px 0px;");

      // 显示类的属性及相关信息
      d3.select("#targetClass")
        .append("span")
        .attr("id", "targetAttributes");

      // d3.select("#relationDetail")
      //   .append("div")
      //   .attr("id", "targetClassDetail")
      //   // .attr("class","col-xs-12")
      //   .attr("style", "border: 1px solid #999; border-top: 0px; padding: 0px; padding-top: 10px; padding-bottom: 10px; max-height: 95px; overflow: auto");

      // d3.select("#targetClassDetail")
      //   .append("span")
      //   .attr("id", "attributes");

      var attribute = "";
      edge.target.attribute.forEach(function(property) {
        var propertyDetail = property.name;
        if (property.type !== undefined)
          propertyDetail = propertyDetail + " : " + property.type;
        d3.select("#targetAttributes")
          .append("p")
          .attr("style", "padding-left:5%")
          .text(propertyDetail);
      });

      // d3.select("#targetClass")
      //   .append("br");



      //关系的展示


      /************* todo ***********/
      if(type === "RelationGroup") {

        //d3.select("#relationDetail")
        //  .append("div")
        //  .attr("id", "relationGroup")
        //  .attr("class","col-xs-2")
        //  .attr("style", "text-align:center; padding: 0px");
        d3.select("#relationDetail")
            .append("div")
            .attr("id", "relationGroup")
            .attr("class","col-xs-12")
            .attr("style", "text-align:center; padding: 0px");

        var relationGroup = edge.group;
        for (singleRelation in relationGroup) {
          var singleType = edge.group[singleRelation].type;

          d3.select("#relationGroup")
              //.append("span")
              //.attr("style", "width: 80")
              .append("img")
              .attr("src", "/static/dist/img/" + singleType + ".png")
              .attr("height", 180);
        }
      }
      else {

        d3.select("#relationDetail")
            .append("div")
            .attr("id", "multi")
            .attr("class","col-xs-5")
            .attr("style", "text-align:right; height: 180px;padding: 0px; padding-top: 3px");

        d3.select("#relationDetail")
          .append("div")
          .attr("id", "relation")
          .attr("class","col-xs-2")
          .attr("style", "text-align:center; padding: 0px");

        d3.select("#relationDetail")
            .append("div")
            .attr("id", "rolename")
            .attr("class","col-xs-5")
            .attr("style", "height: 180px; padding: 0px; padding-top: 3px");

        d3.select("#relation")
            .append("img")
            .attr("src", "/static/dist/img/" + type + ".png")
            .attr("height", 180);
      }


      //d3.select("#relationGroup")
      //    .append("img")
      //    .attr("src", "/static/dist/img/" + type + ".png")
      //    .attr("height", 180);

      d3.select("#multi")
        .append("p")
        .attr("style", "padding-bottom: 130px")
        .append("span")
        .attr("style", "border-radius: 1em")
        .text(multi1);
      
      d3.select("#rolename")
        .append("p")
        .attr("style", "padding-bottom: 130px")
        .append("span")
        .attr("style", "border-radius: 1em")
        .text(role1);

      d3.select("#rolename")
        .append("p")
        .append("span")
        .attr("style", "border-radius: 1em")
        .text(role2);

      d3.select("#multi")
        .append("p")
        .append("span")
        .attr("style", "border-radius: 1em")
        .text(multi2);

      //下端类名
      d3.select("#relationDetail")
        .append("div")
        .attr("id", "sourceClass")
        .attr("class","col-xs-12")
        .attr("style", "border: 1px solid #999; border-radius: 5px; padding:10px 0px; max-height: 155px; overflow: auto");
        // .attr("style", "border: 1px solid #999; padding: 0px; padding-top: 10px; padding-bottom: 10px");

      // d3.select("#sourceClass")
      //   .append("br");

      d3.select("#sourceClass")
        .append("p")
        .attr("style", "text-align:center;font-weight:bold")
        .text(sourceName);

      d3.select("#sourceClass")
        .append("hr")
        .attr("style", "border-top:1px solid #999; margin:10px 0px;");

      // 显示类的属性及相关信息
      d3.select("#sourceClass")
        .append("span")
        .attr("id", "sourceAttributes");

      // d3.select("#relationDetail")
      //   .append("div")
      //   .attr("id", "sourceClassDetail")
      //   // .attr("class","col-xs-12")
      //   .attr("style", "border: 1px solid #999; border-top: 0px; padding: 0px; padding-top: 10px; padding-bottom: 10px; max-height:95px; overflow:auto");


      // d3.select("#sourceClassDetail")
      //   .append("span")
      //   .attr("id", "attributes");

      var attribute = "";
      edge.source.attribute.forEach(function(property) {
        var propertyDetail = property.name;
        if (property.type !== undefined)
          propertyDetail = propertyDetail + " : " + property.type;
        d3.select("#sourceAttributes")
          .append("p")
          .attr("style", "padding-left:5%")
          .text(propertyDetail);
      });

      // d3.select("#sourceClass")
      //   .append("br");
       
       

      //显示类的属性
      d3.select("#tooltip").classed("hidden", false);
      // d3.select("#tooltip").call(drag);

      //高亮该条边
      highlightEdgeNode(edge);

      //高亮与该边相连的节点
      highlightEdge(edge);

      //d3.select("#singleRelation").remove();
      //d3.select("#relationGroupDetail").classed("hidden", true);

      /********todo*******/
      if(type === "RelationGroup") {
        //d3.select("#relationGroupDetail").append("div").attr("id","singleRelation");
        //var relationGroup = edge.group;
        //for(singleRelation in relationGroup) {
        //  var singleType = edge.group[singleRelation].type;
        //  d3.select("#singleRelation").append("img")
        //      .attr("src", "/static/dist/img/" + singleType + ".png")
        //      .attr("height", 180);
        //}
        //d3.select("#relationGroupDetail").classed("hidden", false);
      }

    }

    function mouseoverEdge(edge){
      //高亮该条边
      highlightEdgeNode(edge);

      //高亮与该边相连的节点
      highlightEdge(edge);  
    }


    svg.on("click", function(d) {
      noneClickStyle();
      d3.select("#tooltip").classed("hidden", true);
      //d3.select("#relationGroupDetail").classed("hidden", true);
      tmpnode = null; 
      tmpedge = null; 
    });


    //每个节点都绑定一个圆形显示
    var mycircle =
      node.append("circle")
      .attr("r", function(d) { //设置圆点半径                        
        return radiusover(d);
      })
      // .attr("stroke", function(d, i) {
      //   return colors(i);
      // })
      .attr("stroke", function(d){
        return strokeColor[d.classtype];
      })
      .attr("stroke-width", 1)
      .attr("fill", function(d) {
        return fillColor[d.classtype];
      })
      .attr("fill-opacity", 0.9)
      .attr("cursor", "pointer");


    mycircle.on("click", function(d) {
      d3.event.stopPropagation(); //截断svg的click事件
      clickNode(d);

    })
    //高亮当前节点及其连线，但仍然显示上一次点击的节点信息
    .on("mouseover", function(d) {
      mouseoverNode(d);
    })
    // 鼠标移走时高亮上一次点击节点及其连线，显示上一次点击的节点信息
    .on("mouseout", function(d) {
      mouseout();
    });


    d3.select("#searchButton")
      .on("click", function(){
        var searchText = $("#searchText").val();
        for(var j = 0; j < dataset.nodes.length; j ++){
          if(dataset.nodes[j].name === searchText){
            clickNode(dataset.nodes[j]);
            break;
          }
        }
      });


    //根据relation类型的不同绑定箭头

    var myline = link.append("line")
      .attr("class", function(d) {
        return "link " + d.type;
      })
      .attr("marker-end", function(d) {
        return "url(#" + d.type + ")";
      })
      .attr("stroke", function(d) {
          return lineColor[d.type]
        })
      .attr("stroke-width", function(d) {
          if(d.type === "RelationGroup")
            return groupLineWidth;
          else
            return lineWidth;
        });

    var path = link.append("path")
        .attr("class", "relationPath")
        .attr("stroke", "#fff")
        .attr("stroke-width", function(d) {
          if(d.type === "RelationGroup")
            return groupPathWidth;
          else
            return 20;
        })
        .attr("opacity", function(d) {
          if(d.type === "RelationGroup")
            return 100;
          else
            return 0.0;
        })
        .attr("cursor", "pointer");


    path.on("click", function(d) {
      d3.event.stopPropagation(); //截断svg的click事件
      clickEdge(d);
    })
    //高亮当前节点及其连线，但仍然显示上一次点击的节点信息
    .on("mouseover", function(d) {
      mouseoverEdge(d);
    })
    // 鼠标移走时高亮上一次点击节点及其连线，显示上一次点击的节点信息
    .on("mouseout", function(d) {
      mouseout();
    });

    //载入页面时高亮当前选中的类
    if(currentClass !== ''){
      for(var j = 0; j < dataset.nodes.length; j ++){
        if(dataset.nodes[j].name === currentClass){
          clickNode(dataset.nodes[j]);
          break;
        }
      }
    }


    var selectedLegend = "";
    var classSelectedColor = "green";
    var enumerationSelectedColor = "yellow";
    var classSelectedCaption = "1";
    var enumerationSelectedCaption = "1";
    var assSelectedColor = "grey";
    var genSelectedColor = "grey";
    var comSelectedColor = "grey";
    var aggSelectedColor = "grey";
    var groupSelectedColor = "grey";

    d3.select("#classLegend")
        .on("click", function(){
          d3.selectAll(".legendOption").classed("hidden", true);
          selectedLegend = "Class";
          d3.event.stopPropagation();
          d3.select("#optionText").text("Class");
          d3.select("#optionCircle")
              .attr("stroke",strokeColor[0])
              .attr("fill",fillColor[0]);
          //d3.select("#optionColor").text("Green");
          d3.select("#nodeLegendOption").classed("hidden", false);
          document.getElementById("colorSelect").value = classSelectedColor;
          document.getElementById("captionSelect").value = classSelectedCaption;

        });
    d3.select("#enumerationLegend")
        .on("click",function(){
          d3.selectAll(".legendOption").classed("hidden", true);
          selectedLegend = "Enumeration";
          d3.select("#optionText").text("Enumeration");
          d3.select("#optionCircle")
              .attr("stroke",strokeColor[1])
              .attr("fill",fillColor[1]);
          //d3.select("#optionColor").text("Yellow");
          d3.select("#nodeLegendOption").classed("hidden", false);
          document.getElementById("colorSelect").value = enumerationSelectedColor;
          document.getElementById("captionSelect").value = enumerationSelectedCaption;
        });

    d3.select("#allNodesLegend")
        .on("click",function(){
          d3.selectAll(".legendOption").classed("hidden", true);
          selectedLegend = "allNodes";
          //d3.select("#optionColor").text("Yellow");
          d3.select("#allnodeLegendOption").classed("hidden", false);
        });

    d3.select("#associationLegend")
        .on("click",function(){
          d3.selectAll(".legendOption").classed("hidden", true);
          selectedLegend = "Association";
          //d3.select("#relationOptionText").text("Relation");
          //d3.select("#optionLine")
          //    .attr("stroke",lineColor[]);
          d3.select("#assLegendOption").classed("hidden", false);
          document.getElementById("assColorSelect").value = assSelectedColor;

        });

    d3.select("#aggregationLegend")
        .on("click",function(){
          d3.selectAll(".legendOption").classed("hidden", true);
          selectedLegend = "Aggregation";
          //d3.select("#relationOptionText").text("Relation");
          //d3.select("#optionLine")
          //    .attr("stroke",lineColor);
          d3.select("#aggLegendOption").classed("hidden", false);
          document.getElementById("aggColorSelect").value = aggSelectedColor;

        });
    d3.select("#generalizationLegend")
        .on("click",function(){
          d3.selectAll(".legendOption").classed("hidden", true);
          selectedLegend = "Generalization";
          d3.select("#genLegendOption").classed("hidden", false);
          document.getElementById("genColorSelect").value = genSelectedColor;

        });
    d3.select("#compositionLegend")
        .on("click",function(){
          d3.selectAll(".legendOption").classed("hidden", true);
          selectedLegend = "Composition";
          d3.select("#comLegendOption").classed("hidden", false);
          document.getElementById("comColorSelect").value = comSelectedColor;

        });

    d3.select("#groupLegend")
        .on("click",function(){
          d3.selectAll(".legendOption").classed("hidden", true);
          selectedLegend = "RelationGroup";
          d3.select("#groupLegendOption").classed("hidden", false);
          document.getElementById("groupColorSelect").value = groupSelectedColor;

        });

    d3.select("#edgeLegend")
        .on("click",function(){
          d3.selectAll(".legendOption").classed("hidden", true);
          selectedLegend = "AllRelation";
          d3.select("#edgeLegendOption").classed("hidden", false);
          //document.getElementById("groupColorSelect").value = groupSelectedColor;

        });



    d3.selectAll(".close")
        .on("click", function(){
          d3.selectAll(".legendOption").classed("hidden", true);
        });

    d3.select("#showLegend")
        .on("click", function(){
          d3.select("#legendFold").style("background-color", "white");
          d3.select("#legendText").attr("fill", "#999");
          d3.select("#legend").classed("hidden", false);
          d3.select("#showLegend").classed("hidden", true);
          d3.select("#hiddenLegend").classed("hidden", false);
        });

    d3.select("#hiddenLegend")
        .on("click", function(){
          d3.select("#legendFold").style("background-color", "#999");
          d3.select("#legendText").attr("fill", "white");
          d3.select("#legend").classed("hidden", true);
          d3.select("#hiddenLegend").classed("hidden", true);
          d3.select("#showLegend").classed("hidden", false);
        });



    d3.select("#colorSelect")
        .on("change", function(){
          var colorValue = document.getElementById("colorSelect").value;
          if(selectedLegend === "Class"){
            classSelectedColor = colorValue;
            fillColor[0] = colorFillArray[colorValue];
            strokeColor[0] = colorStrokeArray[colorValue];
            d3.select("#classLegend")
                .attr("fill", colorFillArray[colorValue])
                .attr("stroke", colorStrokeArray[colorValue]);
          }
          else if(selectedLegend === "Enumeration"){
            enumerationSelectedColor = colorValue;
            fillColor[1] = colorFillArray[colorValue];
            strokeColor[1] = colorStrokeArray[colorValue];
            d3.select("#enumerationLegend")
                .attr("fill", colorFillArray[colorValue])
                .attr("stroke", colorStrokeArray[colorValue]);
          }
          d3.select("#optionCircle")
              .attr("fill", colorFillArray[colorValue])
              .attr("stroke", colorStrokeArray[colorValue]);
          mouseout();
        });

    d3.select("#allcolorSelect")
        .on("change", function(){
          var colorValue = document.getElementById("allcolorSelect").value;
            classSelectedColor = colorValue;
            fillColor[0] = colorFillArray[colorValue];
            strokeColor[0] = colorStrokeArray[colorValue];
            d3.select("#classLegend")
                .attr("fill", colorFillArray[colorValue])
                .attr("stroke", colorStrokeArray[colorValue]);
            enumerationSelectedColor = colorValue;
            fillColor[1] = colorFillArray[colorValue];
            strokeColor[1] = colorStrokeArray[colorValue];
            d3.select("#enumerationLegend")
                .attr("fill", colorFillArray[colorValue])
                .attr("stroke", colorStrokeArray[colorValue]);
          d3.selectAll(".circle")
              .attr("fill", colorFillArray[colorValue])
              .attr("stroke", colorStrokeArray[colorValue]);
          d3.select("#allnodeCircle")
              .attr("fill", colorFillArray[colorValue])
              .attr("stroke", colorStrokeArray[colorValue]);
          d3.select("#allNodesLegend")
              .attr("fill", colorFillArray[colorValue])
              .attr("stroke", colorStrokeArray[colorValue]);
          mouseout();
        });


    d3.select("#captionSelect")
        .on("change", function(){
          var captionValue = document.getElementById("captionSelect").value;
          if(selectedLegend === "Class"){
            myname.text(function(d) {
              if(d.classtype == 0){
                if(captionValue == 1){
                  classSelectedCaption = 1;
                  return d.name;
                }
                else {
                  classSelectedCaption = 0;
                  return "";
                }
              }
              else {
                if(enumerationSelectedCaption == 1){
                  return d.name;
                }
                else
                  return "";
              }
            });
          }
          else if(selectedLegend === "Enumeration"){
            myname.text(function(d) {
              if(d.classtype == 1){
                if(captionValue == 1){
                  enumerationSelectedCaption = 1;
                  return d.name;
                }
                else {
                  enumerationSelectedCaption = 0;
                  return "";
                }
              }
              else {
                if(classSelectedCaption == 1){
                  return d.name;
                }
                else
                  return "";
              }
            });
          }
          mouseout();
        });

    d3.select("#allcaptionSelect")
        .on("change", function(){
          var captionValue = document.getElementById("allcaptionSelect").value;
          myname.text(function(d) {
            if(captionValue == 1)
              return d.name;
            else
              return "";
          })
          classSelectedCaption = captionValue;
          enumerationSelectedCaption = captionValue;
          mouseout();
        });

    d3.select("#assColorSelect")
        .on("change", function(){
          var colorValue = document.getElementById("assColorSelect").value;
          lineColor["Association"] = colorFillArray[colorValue];
          assSelectedColor = colorValue;
          d3.select("#associationLegend")
              .attr("stroke", lineColor["Association"]);
          d3.select("#assOptionLine")
              .attr("stroke", lineColor["Association"]);
          mouseout();
        });

    d3.select("#aggColorSelect")
        .on("change", function(){
          var colorValue = document.getElementById("aggColorSelect").value;
          lineColor["Aggregation"] = colorFillArray[colorValue];
          aggSelectedColor = colorValue;
          d3.selectAll(".aggColortoChange")
              .attr("stroke", lineColor["Aggregation"]);
          mouseout();
        });

    d3.select("#genColorSelect")
        .on("change", function(){
          var colorValue = document.getElementById("genColorSelect").value;
          lineColor["Generalization"] = colorFillArray[colorValue];
          genSelectedColor = colorValue;
          d3.selectAll(".genColortoChange")
              .attr("stroke", lineColor["Generalization"]);
          mouseout();
        });

    d3.select("#comColorSelect")
        .on("change", function(){
          var colorValue = document.getElementById("comColorSelect").value;
          lineColor["Composition"] = colorFillArray[colorValue];
          comSelectedColor = colorValue;
          d3.selectAll(".comColortoChange")
              .attr("stroke", lineColor["Composition"]);
          d3.select("#comMarkerLegend")
              .attr("stroke", lineColor["Composition"])
              .attr("fill", lineColor["Composition"]);
          d3.select("#compositionMarker")
              .attr("stroke", lineColor["Composition"])
              .attr("fill", lineColor["Composition"]);
          mouseout();
        });

    d3.select("#groupColorSelect")
        .on("change", function(){
          var colorValue = document.getElementById("groupColorSelect").value;
          lineColor["RelationGroup"] = colorFillArray[colorValue];
          groupSelectedColor = colorValue;
          d3.selectAll(".groupColortoChange")
              .attr("stroke", lineColor["RelationGroup"]);
          mouseout();
        });

    d3.select("#allColorSelect")
        .on("change", function(){
          var colorValue = document.getElementById("allColorSelect").value;
          lineColor["Association"] = colorFillArray[colorValue];
          assSelectedColor = colorValue;
          d3.select("#associationLegend")
              .attr("stroke", lineColor["Association"]);
          d3.select("#assOptionLine")
              .attr("stroke", lineColor["Association"]);
          lineColor["Aggregation"] = colorFillArray[colorValue];
          aggSelectedColor = colorValue;
          d3.selectAll(".aggColortoChange")
              .attr("stroke", lineColor["Aggregation"]);
          lineColor["Generalization"] = colorFillArray[colorValue];
          genSelectedColor = colorValue;
          d3.selectAll(".genColortoChange")
              .attr("stroke", lineColor["Generalization"]);
          lineColor["Composition"] = colorFillArray[colorValue];
          comSelectedColor = colorValue;
          d3.selectAll(".comColortoChange")
              .attr("stroke", lineColor["Composition"]);
          d3.select("#comMarkerLegend")
              .attr("stroke", lineColor["Composition"])
              .attr("fill", lineColor["Composition"]);
          d3.select("#compositionMarker")
              .attr("stroke", lineColor["Composition"])
              .attr("fill", lineColor["Composition"]);
          lineColor["RelationGroup"] = colorFillArray[colorValue];
          groupSelectedColor = colorValue;
          d3.selectAll(".groupColortoChange")
              .attr("stroke", lineColor["RelationGroup"]);
          d3.selectAll(".edgeColortoChange")
              .attr("stroke", colorValue);
          mouseout();
        });


    //Every time the simulation "ticks", this will be called
    /**
     *   每一次tick，调用此函数
     */

    force.on("tick", function() {

      /**
       *   限制节点的移动范围在该svg大小之内
       */
      dataset.nodes.forEach(function(d, i) {
        var r = radiusover(d);
        d.x = d.x - r < 0 ? r : d.x;
        d.x = d.x + r > width ? width - r : d.x;
        d.y = d.y - r < 0 ? r : d.y;
        d.y = d.y + r * 2 > height ? height - r * 2 : d.y;
      });

      node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

      /**
       *   计算两点之间连线的起止位置，以绘出合适的箭头
       */

      link.selectAll("line")
        .attr("x1", function(d) {
          var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx * dx + dy * dy);
          var r = radiusover(d.source);
          var rx = r * dx / dr;
          return (d.source.x + rx);
        })
        .attr("y1", function(d) {
          var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx * dx + dy * dy);
          var r = radiusover(d.source);
          var ry = r * dy / dr;
          return (d.source.y + ry);
        })
        .attr("x2", function(d) {
          var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx * dx + dy * dy);
          var r = radiusover(d.target);
          var rx = r * dx / dr;
          return (d.target.x - rx);
        })
        .attr("y2", function(d) {
          var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx * dx + dy * dy);
          var r = radiusover(d.target);
          var ry = r * dy / dr;
          return (d.target.y - ry);
        });

      path.attr("d", function(d) {    
        return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;  
      });

      //更新节点的坐标
      // node.selectAll("circle")
      //   .attr("cx", function(d) {
      //     return d.x;
      //   })
      //   .attr("cy", function(d) {
      //     return d.y;
      //   });

      // //更新连线上文本的坐标
      // link.selectAll("text")
      //   .attr("x", function(d) {
      //     return (d.source.x + d.target.x) / 2;
      //   })
      //   .attr("y", function(d) {
      //     return (d.source.y + d.target.y) / 2;
      //   });

      // //更新节点旁文字的坐标
      // node.selectAll("text")
      //   .attr("x", function(d) {
      //     return d.x - radiusover(d) * 2;
      //   })
      //   .attr("y", function(d) {
      //     return d.y + radiusover(d) * 2;
      //   });
    });
   

  }

});