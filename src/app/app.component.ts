import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data/peer/esm/vis-data';

// declare var vis: any;


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})


export class AppComponent{

  selectedNode: number;

  constructor() {
  }

}
