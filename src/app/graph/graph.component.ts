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


  private nodes = {};
  private edges = {};

  constructor() { }

  ngOnInit(): void {
    // this.http.get('http://semantic-portal.net/api/branch/angular').subscribe(res => {
    //   console.log(res)
    // })
  }

  ngAfterViewInit() {
    this.rawData = fakeData;
    const treeData = this.getTreeData(fakeData);
    this.formatData(fakeData)
    // const treeData = this.getTreeData(fakeDataJava);
    this.fullGraphData = treeData;
    this.loadVisTree(treeData);
  }

  formatData(data) {
    data.concepts.forEach(node => this.nodes[node.id] = {childNodes: [], parentNodes: []});

    data.relations.forEach(edge => {
      if (!this.edges[edge.class]) this.edges[edge.class] = [];

      if (!this.nodes[edge.concept_id].childNodes.find(el => el.nodeId === edge.to_concept_id)) {
        this.nodes[edge.concept_id].childNodes.push({nodeId: edge.to_concept_id, relation: edge.class});
        this.nodes[edge.to_concept_id].parentNodes.push({nodeId: edge.concept_id, relation: edge.class});
        this.edges[edge.class].push({to: edge.to_concept_id, from: edge.concept_id});
      }

    });

    console.log(this.edges, this.nodes)
  }

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
        arrows: 'from'
      },
      interaction: {
        hover: true,
        zoomView: true
      },
    };

    const container = this.networkContainer.nativeElement;
    this.network = new Network(container, treedata, options);

    this.network.on('hoverNode', function(params) {
      // console.log('hoverNode Event:', params);
    });
    this.network.on('selectNode', (params) => {
      this.showLinksFromNode(params.nodes[0], true);
      this.selectNode.emit(params.nodes[0]);
    });
    this.network.on('afterDrawing', (params) => {
      this.loaded = true;
    });
  }

  getTreeData(data) {
    let nodes = data.concepts.map(el => {
      const nod = {
        id: el.id,
        label: el.concept,
        font: {size: 17},
        class: el.class,
        size: 12,
        aspectOf: el.aspectOf
      };
      this.nodeLinks[el.id] = nod;

      return nod;
    });

    // concept_id - child node, to_concept_id - parent node, relation build from small parts to bigger one
    let edges = data.relations.map(el => {
      if (this.edgeLinks[el.concept_id]) return; // take only 1 edge from node

      this.nodeLinks[el.concept_id].parent = el.to_concept_id;

      if (!this._showEdgesOfType.hasOwnProperty(el.class)) {
        this._showEdgesOfType[el.class] = false;
      }

      const edge = {
        from: el.concept_id,
        to: el.to_concept_id,
        class: el.class
      };
      this.edgeLinks[el.concept_id] = edge;
      return edge;
    }).filter(el => el !== undefined);

    nodes.forEach(node => {
      const linksFromNode = edges.filter(el => el.to === node.id);
      linksFromNode.forEach(link => {
        const childNode = this.nodeLinks[link.from];
        childNode.group = node.id;
        childNode.parent = node.label;
        childNode.relationToParent = link.class;
      });
    });

    const aspects = nodes.filter(node => node.parent === undefined && node.aspectOf);
    aspects.forEach(node => {
      node.shape = 'hexagon';
      node.color = '#4d1899';
      node.relationToParent = 'aspect';
      node.parent = this.nodeLinks[node.aspectOf].label;
      edges.push({
        to: node.aspectOf,
        from: node.id,
        class: 'aspect',
        color: '#4d1899',
        arrows: {
          from: {
            enabled: false
          }
        }
      });
    });

    if (data.didactic.length) {
      this._showEdgesOfType['didactic'] = false;
    }
    if (nodes.find(node => node.aspectOf)) {
      this._showEdgesOfType['aspect'] = false;
    }

    // const freeNodes = nodes.filter(node => node.parent === undefined);
    // freeNodes.forEach(node => {
    //
    //   const edgeTo = data.didactic.find(el => el.to_id === node.id);
    //   if (edgeTo) {
        // node.parent = edgeTo.from_id;
        // edges.push({
        //   to: edgeTo.from_id,
        //   from: edgeTo.to_id,
        //   class: 'didactic',
        //   dashes: true,
        //   color: '#9d9d9d'
        // });
    //   }
    //   const edgeFrom = data.didactic.find(el => el.from_id === node.id);
    //   if (edgeFrom) {
        // edges.push({
        //   to: edgeFrom.from_id,
        //   from: edgeFrom.to_id,
        //   class: 'didactic',
        //   dashes: true,
        //   color: '#9d9d9d'
        // });
    //   }
    // });

    nodes.filter(node => !node.parent).forEach(headNode => {
      this.countChildren(headNode, edges);
    });

    nodes.forEach(node => {
      node.title = `Тип: ${node.class}`;
      if (node.parent) {
        node.title += `, має віднощення типу: ${node.relationToParent} до ${node.parent}`;
      }
    });

    return {
      nodes,
      edges
    };
  }

  countChildren(node, edges) {
    node.children = 0;
    const linksFromNode = edges.filter(el => el.to === node.id);

    if (linksFromNode.length === 0) return 0;

    linksFromNode.forEach(link => {
      const childNode = this.nodeLinks[link.from];
      node.children += this.countChildren(childNode, edges); // count grandchildren nodes
      node.children++; // count child node
    });
    node.size += node.children;
    node.size = Math.min(node.size, 50);
    return node.children;
  }

  showLinksFromNode(nodeId, showLinksFromChildren) {
    this.linkTypes = 'showOptimal';
    Object.keys(this._showEdgesOfType).forEach(key => this._showEdgesOfType[key] = false);

    let edges = this.getAllNodeLinks(nodeId);
    // let childrenLinks: any = []
    // edges.forEach(edge => {
    //   childrenLinks.push(this.getAllNodeLinks(edge.to));
    // });
    // edges = edges.concat(childrenLinks.flat())

    const nodes = new Set();
    edges.forEach(el => {
      nodes.add(this.nodeLinks[el.to]);
      nodes.add(this.nodeLinks[el.from]);
    });


    this.network.setData({nodes: Array.from(nodes), edges});
    this.fullGraphShown = false;
    this.loaded = false;
  }

  getAllNodeLinks(nodeId) {
    const node = this.nodeLinks[nodeId];

    let edges = this.rawData.relations.filter(el => el.to_concept_id === nodeId || el.concept_id === nodeId).map(el => {
      return {
        from: el.concept_id,
        to: el.to_concept_id,
        class: el.class
      };
    });

    const aspects = this.rawData.concepts.filter(el => el.aspectOf === nodeId).map(node => {
      return {to: node.aspectOf,
        from: node.id,
        class: 'aspect',
        color: '#4d1899',
        arrows: {
          from: {
            enabled: false
          }
        }
      };
    });

    if (node.aspectOf){
      aspects.push({
        to: nodeId,
        from: node.aspectOf,
        class: 'aspect',
        color: '#4d1899',
        arrows: {
          from: {
            enabled: false
          }
        }
      });
    }

    edges = edges.concat(aspects);
    edges = edges.concat(this.rawData.didactic.filter(el => (el.to_id === nodeId || el.from_id === nodeId) &&
      !edges.find(edge => edge.to === el.from_id && edge.from === el.to_id)).map(el => {
      return {
        to: el.from_id,
        from: el.to_id,
        class: 'didactic',
        dashes: true,
        color: '#9d9d9d'
      };
    }));

    return edges;
  }

  get showEdgesOfType() {
    return Object.keys(this._showEdgesOfType);


  }

  updateEdges() {
    this.loaded = false;
    let showEdges = Object.entries(this._showEdgesOfType).filter(([key, value]) => value === true).map(([key, value]) => key);

    let edges = this.rawData.relations.map(el => {
      if (!showEdges.includes(el.class))  return ;
      return {
        from: el.concept_id,
        to: el.to_concept_id,
        class: el.class
      };
    }).filter(el => el !== undefined);

    console.log(edges)

    if (showEdges.includes('didactic')) {
      this.rawData.didactic.forEach(el => {
        edges.push({
          to: el.from_id,
          from: el.to_id,
          class: 'didactic',
          dashes: true,
          color: '#9d9d9d'
        });
      });
    }

    if (showEdges.includes('aspect')) {
      const aspects = this.network.body.nodeIndices.map(nodeId => this.nodeLinks[nodeId]).filter(node => node.aspectOf);
      aspects.forEach(node => {
        edges.push({
          to: node.aspectOf,
          from: node.id,
          class: 'aspect',
          color: '#4d1899',
          arrows: {
            from: {
              enabled: false
            }
          }
        });
      });
    }


    console.log(this.network)
    this.network.setData({nodes: this.network.body.data.nodes, edges})
  }

  setOptimalEdges() {
    if (this.linkTypes === 'showOptimal') {
      this.loaded = false;
      Object.keys(this._showEdgesOfType).forEach(key => this._showEdgesOfType[key] = false);

      this.network.setData({nodes: this.network.body.data.nodes, edges: this.fullGraphData.edges});
    }
  }

  drawFullGraph() {
    this.fullGraphShown = true;
    this.loaded = false;

    this.linkTypes = 'showOptimal';
    Object.keys(this._showEdgesOfType).forEach(key => this._showEdgesOfType[key] = false);

    this.network.setData(this.fullGraphData);
  }

}
