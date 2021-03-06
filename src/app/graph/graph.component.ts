import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, NgZone, OnInit, Output, ViewChild} from '@angular/core';
import {Network} from 'vis-network';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
import {Branch} from '../shared/branch';
import fakeData from './fakeData.json';
import {ConceptMapData} from '../shared/interfaces/concept-map-data';
import { cloneDeep, uniq, uniqBy } from 'lodash';
import {ChangeDetection} from '@angular/cli/lib/config/schema';
import {INode} from '../shared/interfaces/node';
import {ConceptRelations} from '../shared/enums/concept-relations.enum';


@Component({
  selector: 'app-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss']
})
export class GraphComponent implements OnInit, AfterViewInit {
  @ViewChild('siteConfigNetwork', {static: true}) networkContainer: ElementRef;
  @Output('selectNode') selectNode = new EventEmitter<number> ();

  public network: any;

  fullGraphData = {nodes: null, edges: null};
  fullGraphShown = true;

  private rawData: ConceptMapData;

  linkTypes = 'showOptimal';

  loaded = false;

  private nodes: {[id: number]: INode} = {};
  edges: {[key: string]: {values: any[], visible}} = {};

  private mainNode: INode;

  constructor(private http: HttpClient, private zone: NgZone, private cd: ChangeDetectorRef) { }

  ngOnInit(): void {

  }

  ngAfterViewInit() {
    if (!environment.production) {
      Branch.value = 'angular';
      this.rawData = fakeData;
      this.formatGraphData(fakeData);
      this.setChildrenAmountRecursively(this.mainNode);
      this.setNodesLabels();
      this.setGraphStyles();
      const data = this.getOptimalGraphData();
      this.fullGraphData = data;
      this.createGraph(data);
    } else {
      this.http.get(`${environment.url}/branch/${Branch.value}`).subscribe((res: ConceptMapData) => {
        console.log(res)

        this.rawData = res;
        this.formatGraphData(res);
        this.setChildrenAmountRecursively(this.mainNode);
        this.setNodesLabels();
        this.setGraphStyles();
        const data = this.getOptimalGraphData();
        this.fullGraphData = data;
        this.createGraph(data);
      });
    }
  }

  private formatGraphData(data: ConceptMapData) {
    data.concepts.forEach(node => this.nodes[node.id] =
      {id: node.id, childNodes: [], parentNodes: [], label: node.concept, aspectOf: node.aspectOf, class: node.class});

    this.markMainConceptNode();

    data.relations.forEach(edge => {
      if (!this.edges[edge.class]) this.edges[edge.class] = {values: [], visible: false};

      if (!this.nodes[edge.to_concept_id].childNodes.find(el => el.nodeId === edge.concept_id)
      && this.nodes[edge.concept_id].parentNodes.length === 0) {
        this.nodes[edge.to_concept_id].childNodes.push({nodeId: edge.concept_id, relation: edge.class});
        this.nodes[edge.concept_id].parentNodes.push({nodeId: edge.to_concept_id, relation: edge.class});

        this.nodes[edge.concept_id].parentLabel = this.nodes[edge.to_concept_id].label;
        this.nodes[edge.concept_id].group = edge.to_concept_id;

      }

      this.edges[edge.class].values.push({to: edge.concept_id, from: edge.to_concept_id});
    });

    this.edges[ConceptRelations.Aspect] = {values: [], visible: false};
    Object.entries(this.nodes).forEach(([nodeId, node]: any) => {
      if (node.parentNodes.length === 0 && node.aspectOf) {
        node.parentNodes.push({nodeId: node.aspectOf, relation: ConceptRelations.Aspect});
        this.nodes[node.aspectOf].childNodes.push({nodeId, relation: ConceptRelations.Aspect});

        node.parentLabel = this.nodes[node.aspectOf].label;
        this.edges[ConceptRelations.Aspect].values.push({
          to: nodeId,
          from: node.aspectOf,
        });
      }

    });

    this.edges[ConceptRelations.Didactic] = {values: [], visible: false};
    data.didactic.forEach(edge => {
      if (this.nodes[edge.to_id].parentNodes.length === 0 && !this.nodes[edge.to_id].isMainConcept)  {
        this.nodes[edge.from_id].childNodes.push({nodeId: edge.to_id, relation: ConceptRelations.Didactic});
        this.nodes[edge.to_id].parentNodes.push({nodeId: edge.from_id, relation: ConceptRelations.Didactic});
      }
      this.edges[ConceptRelations.Didactic].values.push({to: edge.to_id, from: edge.from_id});
    });
  }

  private markMainConceptNode() {
    Object.entries(this.nodes).forEach(([id, node]) => {
      if (node.label.toLowerCase() === Branch.value.toLowerCase()) {
        node.isMainConcept = true;
        this.mainNode = node;
      }
    });
  }

  private setGraphStyles() {

    Object.entries(this.nodes).forEach(([id, value]) => {
      value.font = {size: 17};
      if (value.aspectOf) {
        value.shape = 'hexagon';
        value.color = '#4d1899';
      }
      value.size = value.isMainConcept ? 50 : Math.min(10 + value.children, 40);
      if (value.parentNodes[0] && value.parentNodes[0].relation === ConceptRelations.Didactic) {
        value.color = '#9d9d9d';
      }
    });

    Object.entries(this.edges).forEach(([type, edges]) => {
      if (type === ConceptRelations.Aspect) {
        edges.values.forEach(edge => {
          edge.color = '#4d1899';
          edge.arrows = {
            to: {
              enabled: false
            }
          };
        });
      }
      if (type === ConceptRelations.Didactic) {
        edges.values.forEach(edge => {
          edge.color = '#9d9d9d';
          edge.dashes = true;
        });
      }
    });
  }

  private getOptimalGraphData(): {nodes, edges} {
    const edges = [];
    Object.values(this.nodes).forEach(node => {
      node.childNodes.forEach(childNode => {
        if (childNode.relation === ConceptRelations.Aspect) {
          edges.push({
            from: node.id ,
            to: childNode.nodeId,
            color: '#4d1899',
            arrows: {
              to: {
                enabled: false
              }
            }});
        } else if (childNode.relation === ConceptRelations.Didactic){
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
    return {nodes: Object.values(this.nodes), edges};
  }

  private setNodesLabels(){
    Object.entries(this.nodes).map(([id, value]: any) => {
      value.title = `Тип: ${value.class}`;
      if (value.parentNodes[0]) {
        value.title += `, має віднощення типу: ${value.parentNodes[0].relation} до ${this.nodes[value.parentNodes[0].nodeId].label}`;
      }

      return {id, ...value};
    });
  }


  private createGraph(treeData: {nodes: object[], edges: object[]}) {
    const container = this.networkContainer.nativeElement;

    const options = {
      height: `${container.clientHeight}px`,
      nodes: {
        shape: 'dot',
        size: 13,
        widthConstraint: {maximum: 250},
        font: {size: 16},
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

    this.zone.runOutsideAngular(() => {
      this.network = new Network(container, treeData, options);
    });

    this.network.on('hoverNode', (params) => {
      // console.log('hoverNode Event:', this.nodes[params.node]);
    });
    this.network.on('selectNode', (params) => {
      this.zone.run(() => {
        this.showLinksFromNode(params.nodes[0]);
        this.selectNode.emit(params.nodes[0]);
        console.log(this.nodes[params.nodes[0]]);
      });
    });
    this.network.on('afterDrawing', (params) => {
      this.loaded = true;
      this.cd.detectChanges();
    });
  }

  private setChildrenAmountRecursively(startNode: INode) {
    startNode.children = 0;

    if (startNode.childNodes.length === 0) return 0;

    startNode.childNodes.forEach(childNode => {
      startNode.children += this.setChildrenAmountRecursively(this.nodes[childNode.nodeId]); // count grandchildren nodes
      startNode.children++; // count child node
    });
    return startNode.children;
  }

  private showLinksFromNode(nodeId: number) {
    this.linkTypes = 'showOptimal';
    Object.keys(this.edges).forEach(key => this.edges[key].visible = false);

    const edges = this.getAllNodeLinks(nodeId);

    let nodes = [];
    edges.forEach(el => {
      nodes.push(cloneDeep(this.nodes[el.to]));
      nodes.push(cloneDeep(this.nodes[el.from]));
    });

    nodes = uniqBy(nodes, 'id');
    nodes.forEach(el => {
      if (el.id === nodeId) {
        el.size = 30;
      } else {
        el.size = 10;
      }
    });
    this.network.setData({nodes, edges});
    this.fullGraphShown = false;
    this.loaded = false;
  }

  private getAllNodeLinks(nodeId: number) {
    let edges = [];
    Object.values(this.edges).forEach(edgeType => {
      edgeType.values.forEach(edge => {
        if (edge.to === nodeId || edge.from === nodeId
          && !edges.find(addedEdge => addedEdge.to === edge.to && addedEdge.from === edge.from))
            edges.push(cloneDeep(edge));
      });
    });

    return edges;
  }

  get edgesTypesAvailable() {
    return Object.entries(this.edges)
      .filter(([key, value]) => value.values.length !== 0)
      .map(([key, value]) => key);
  }

  updateEdges() {
    this.loaded = false;
    let showEdges: any = Object.entries(this.edges).filter(([key, value]: any) => value.visible === true).map(([key, value]) => value.values);

    showEdges = showEdges.flat();

    this.network.setData({nodes: this.network.body.data.nodes, edges: showEdges});
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

    this.selectNode.emit(null);

    this.linkTypes = 'showOptimal';
    Object.keys(this.edges).forEach(key => this.edges[key].visible = false);

    this.network.setData(this.fullGraphData);
  }

  resize(increaseBy: number) {
    this.network.moveTo({
      scale: this.network.getScale() + increaseBy
    });
  }

}
