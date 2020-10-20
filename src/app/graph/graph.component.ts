import {AfterViewInit, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild} from '@angular/core';
import {Network} from 'vis-network';
import fakeData from './fakeData.json';
import fakeDataJava from './fakeDataJava.json';

@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss']
})
export class GraphComponent implements OnInit, AfterViewInit {
  @ViewChild('siteConfigNetwork', {static: true}) networkContainer: ElementRef;
  @Output('selectNode') selectNode = new EventEmitter<number> ();

  public network: any;

  private nodeLinks = {};
  private edgeLinks = {};

  fullGraphData = {nodes: null, edges: null};
  fullGraphShown = true;

  _showEdgesOfType = {};

  private rawData;

  linkTypes = 'showOptimal';

  loaded = false;


  private nodes: any = {};
  edges: any = {};

  constructor() { }

  ngOnInit(): void {
    // this.http.get('http://semantic-portal.net/api/branch/angular').subscribe(res => {
    //   console.log(res)
    // })
  }

  ngAfterViewInit() {
    this.rawData = fakeDataJava;
    this.formatData(fakeDataJava)
    const data = this.makeArrayData();
    // const treeData = this.getTreeData(fakeDataJava);
    this.fullGraphData = data;
    this.loadVisTree(data);
  }

  formatData(data) {
    data.concepts.forEach(node => this.nodes[node.id] = {childNodes: [], parentNodes: [], label: node.concept, font: {size: 17}, aspectOf: node.aspectOf, class: node.class});

    data.relations.forEach(edge => {
      if (!this.edges[edge.class]) this.edges[edge.class] = [];

      if (!this.nodes[edge.to_concept_id].childNodes.find(el => el.nodeId === edge.concept_id)) {
        this.nodes[edge.to_concept_id].childNodes.push({nodeId: edge.concept_id, relation: edge.class});
        this.nodes[edge.concept_id].parentNodes.push({nodeId: edge.to_concept_id, relation: edge.class});

        this.nodes[edge.concept_id].parentLabel = this.nodes[edge.to_concept_id].label;
        this.nodes[edge.concept_id].group = edge.to_concept_id;
      }

      this.edges[edge.class].push({to: edge.concept_id, from: edge.to_concept_id});
    });

    this.edges['aspect'] = [];
    Object.entries(this.nodes).forEach(([nodeId, node]: any) => {
      if (node.parentNodes.length === 0 && node.aspectOf) {
        node.parentNodes.push({nodeId: node.aspectOf, relation: 'aspect'});
        this.nodes[node.aspectOf].childNodes.push({nodeId, relation: 'aspect'});

        node.parentLabel = this.nodes[node.aspectOf].label;
        node.shape = 'hexagon';
        node.color = '#4d1899';
      }
      this.edges['aspect'].push({
        to: nodeId,
        from: node.aspectOf,
        color: '#4d1899',
        arrows: {
          to: {
            enabled: false
          }
        }});
    });

    this.edges['didactic'] = [];
    data.didactic.forEach(edge => {
      if (!this.nodes[edge.to_id].childNodes.find(el => el.nodeId === edge.from_id) &&
        !this.nodes[edge.to_id].parentNodes.find(el => el.nodeId === edge.from_id) &&
        this.nodes[edge.from_id].parentNodes.length === 0 &&
        this.nodes[edge.from_id].childNodes.length === 0 ) {

        this.nodes[edge.to_id].childNodes.push({nodeId: edge.from_id, relation: 'didactic'});
        this.nodes[edge.from_id].parentNodes.push({nodeId: edge.to_id, relation: 'didactic'});
      }
      this.edges['didactic'].push({to: edge.to_id, from: edge.from_id, dashes: true, color: '#9d9d9d'});
    });
  }

  makeArrayData() {
    const nodes = Object.entries(this.nodes).map(([id, value]: any) => {
      value.title = `Тип: ${value.class}`;
        if (value.parentNodes[0]) {
          value.title += `, має віднощення типу: ${value.parentNodes[0].relation} до ${this.nodes[value.parentNodes[0].nodeId].label}`;
        }

      return {id, ...value};
    });

    const edges = [];
    nodes.forEach(node => {
      node.childNodes.forEach(childNode => {
        if (childNode.relation === 'aspect') {
          edges.push({
            from: node.id,
            to: childNode.nodeId,
            color: '#4d1899',
            arrows: {
              to: {
                enabled: false
              }
            }});
        } else if (childNode.relation === 'didactic'){
          edges.push({
            from: node.id,
            to: childNode.nodeId,
            dashes: true,
            color: '#9d9d9d'
          });
        } else {
          edges.push({
            from: node.id,
            to: childNode.nodeId
          });
        }

      });
    });

    nodes.filter(node => !node.parent).forEach(headNode => {
      this.countChildren(headNode.id, nodes);
    });
    return {nodes, edges};
  }

  // getEdges(node) {
  //   const edges = [];
  //   Object.values(node.childNodes).forEach(childNode => {
  //     edges.push({from: node.id, to: childNode});
  //     edges.concat(this.getEdges(childNode));
  //   });
  //   return edges;
  // }

  loadVisTree(treedata) {
    const options = {
      height: '800px',
      nodes: {
        shape: 'dot',
        size: 13,
        widthConstraint: {
          maximum: 250
        },
        font: {
          size: 16
        },
        chosen: {
          label:  (values, id, selected, hovering) => {
            values.strokeWidth = 7;
            values.mod = 'bold';
            values.strokeColor = '#000000';
            values.color = '#ffffff';
          },
          node: true
        }
      },
      edges: {
        arrows: 'to'
      },
      interaction: {
        hover: true,
        zoomView: true
      },
    };

    const container = this.networkContainer.nativeElement;
    this.network = new Network(container, treedata, options);

    this.network.on('hoverNode', (params) => {
      // console.log('hoverNode Event:', this.nodes[params.node]);
    });
    this.network.on('selectNode', (params) => {
      this.showLinksFromNode(params.nodes[0], true);
      this.selectNode.emit(params.nodes[0]);
    });
    this.network.on('afterDrawing', (params) => {
      this.loaded = true;
    });
  }

  // getTreeData(data) {
  //   let nodes = data.concepts.map(el => {
  //     const nod = {
  //       id: el.id,
  //       label: el.concept,
  //       font: {size: 17},
  //       class: el.class,
  //       size: 12,
  //       aspectOf: el.aspectOf
  //     };
  //     this.nodeLinks[el.id] = nod;
  //
  //     return nod;
  //   });
  //
  //   // concept_id - child node, to_concept_id - parent node, relation build from small parts to bigger one
  //   let edges = data.relations.map(el => {
  //     if (this.edgeLinks[el.concept_id]) return; // take only 1 edge from node
  //
  //     this.nodeLinks[el.concept_id].parent = el.to_concept_id;
  //
  //     if (!this._showEdgesOfType.hasOwnProperty(el.class)) {
  //       this._showEdgesOfType[el.class] = false;
  //     }
  //
  //     const edge = {
  //       from: el.concept_id,
  //       to: el.to_concept_id,
  //       class: el.class
  //     };
  //     this.edgeLinks[el.concept_id] = edge;
  //     return edge;
  //   }).filter(el => el !== undefined);
  //
  //   nodes.forEach(node => {
  //     const linksFromNode = edges.filter(el => el.to === node.id);
  //     linksFromNode.forEach(link => {
  //       const childNode = this.nodeLinks[link.from];
  //       childNode.group = node.id;
  //       childNode.parent = node.label;
  //       childNode.relationToParent = link.class;
  //     });
  //   });
  //
  //   const aspects = nodes.filter(node => node.parent === undefined && node.aspectOf);
  //   aspects.forEach(node => {
  //     node.shape = 'hexagon';
  //     node.color = '#4d1899';
  //     node.relationToParent = 'aspect';
  //     node.parent = this.nodeLinks[node.aspectOf].label;
  //     edges.push({
  //       to: node.aspectOf,
  //       from: node.id,
  //       class: 'aspect',
  //       color: '#4d1899',
  //       arrows: {
  //         from: {
  //           enabled: false
  //         }
  //       }
  //     });
  //   });
  //
  //   if (data.didactic.length) {
  //     this._showEdgesOfType['didactic'] = false;
  //   }
  //   if (nodes.find(node => node.aspectOf)) {
  //     this._showEdgesOfType['aspect'] = false;
  //   }
  //
  //   // const freeNodes = nodes.filter(node => node.parent === undefined);
  //   // freeNodes.forEach(node => {
  //   //
  //   //   const edgeTo = data.didactic.find(el => el.to_id === node.id);
  //   //   if (edgeTo) {
  //       // node.parent = edgeTo.from_id;
  //       // edges.push({
  //       //   to: edgeTo.from_id,
  //       //   from: edgeTo.to_id,
  //       //   class: 'didactic',
  //       //   dashes: true,
  //       //   color: '#9d9d9d'
  //       // });
  //   //   }
  //   //   const edgeFrom = data.didactic.find(el => el.from_id === node.id);
  //   //   if (edgeFrom) {
  //       // edges.push({
  //       //   to: edgeFrom.from_id,
  //       //   from: edgeFrom.to_id,
  //       //   class: 'didactic',
  //       //   dashes: true,
  //       //   color: '#9d9d9d'
  //       // });
  //   //   }
  //   // });
  //
  //   nodes.filter(node => !node.parent).forEach(headNode => {
  //     this.countChildren(headNode, edges);
  //   });
  //
  //   nodes.forEach(node => {
  //     node.title = `Тип: ${node.class}`;
  //     if (node.parent) {
  //       node.title += `, має віднощення типу: ${node.relationToParent} до ${node.parent}`;
  //     }
  //   });
  //
  //   return {
  //     nodes,
  //     edges
  //   };
  // }

  countChildren(nodeId: number, nodes) {
    const node = nodes.find(el => el.id === nodeId);
    node.children = 0;
    node.size = 10;

    if (node.childNodes.length === 0) return 0;

    node.childNodes.forEach(childNode => {
      node.children += this.countChildren(childNode.nodeId, nodes); // count grandchildren nodes
      node.children++; // count child node
    });
    node.size += node.children;
    node.size = Math.min(node.size, 50);
    return node.children;
  }

  showLinksFromNode(nodeId, showLinksFromChildren) {
    this.linkTypes = 'showOptimal';
    Object.keys(this.edges).forEach(key => this.edges[key].visible = false);

    let edges = this.getAllNodeLinks(nodeId);
    // let childrenLinks: any = []
    // edges.forEach(edge => {
    //   childrenLinks.push(this.getAllNodeLinks(edge.to));
    // });
    // edges = edges.concat(childrenLinks.flat())

    let nodes: any = new Set();
    edges.forEach(el => {
      nodes.add(Object.assign(this.nodes[el.to], {id: el.to}));
      nodes.add(Object.assign(this.nodes[el.from], {id: el.from}));
    });
    nodes = Array.from(nodes);
    nodes.forEach(el => {
      if (el.id === nodeId) {
        el.size = 30;
      } else {
        el.size = 10;
      }
    })

    this.network.setData({nodes, edges});
    this.fullGraphShown = false;
    this.loaded = false;
  }

  getAllNodeLinks(nodeId) {
    const node = this.nodes[nodeId];

    let edges = this.rawData.relations.filter(el => el.to_concept_id === nodeId || el.concept_id === nodeId).map(el => {
      return {
        from: el.to_concept_id,
        to: el.concept_id,
        class: el.class
      };
    });

    const aspects = this.rawData.concepts.filter(el => el.aspectOf === nodeId).map(node => {
      return {to: node.aspectOf,
        from: node.id,
        class: 'aspect',
        color: '#4d1899',
        arrows: {
          to: {
            enabled: false
          }
        }
      };
    });

    if (node.aspectOf){
      aspects.push({
        to: node.aspectOf,
        from: nodeId,
        class: 'aspect',
        color: '#4d1899',
        arrows: {
          to: {
            enabled: false
          }
        }
      });
    }

    edges = edges.concat(aspects);
    edges = edges.concat(this.rawData.didactic.filter(el => (el.to_id === nodeId || el.from_id === nodeId) &&
      !edges.find(edge => edge.to === el.to_id && edge.from === el.from_id)).map(el => {
      return {
        to: el.to_id,
        from: el.from_id,
        class: 'didactic',
        dashes: true,
        color: '#9d9d9d'
      };
    }));

    return edges;
  }

  get showEdgesOfType() {
    return Object.keys(this.edges);
  }

  updateEdges() {
    this.loaded = false;
    let showEdges: any = Object.entries(this.edges).filter(([key, value]: any) => value.visible === true).map(([key, value]) => value);

    showEdges = showEdges.flat();

    this.network.setData({nodes: this.network.body.data.nodes, edges: showEdges})
  }

  setOptimalEdges() {
    if (this.linkTypes === 'showOptimal') {
      this.loaded = false;
      Object.keys(this.edges).forEach(key => this.edges[key].visible = false);

      this.network.setData({nodes: this.network.body.data.nodes, edges: this.fullGraphData.edges});
    }
  }

  drawFullGraph() {
    this.fullGraphShown = true;
    this.loaded = false;

    this.linkTypes = 'showOptimal';
    Object.keys(this.edges).forEach(key => this.edges[key].visible = false);

    this.network.setData(this.fullGraphData);
  }

}
