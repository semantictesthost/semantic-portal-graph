import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data/peer/esm/vis-data';
import {Branch} from './shared/branch';
import {environment} from '../environments/environment';

// declare var vis: any;
declare var BRANCH: any; // branch initialized in php

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})


export class AppComponent{

  selectedNode: number;

  constructor() {
    if (environment.production) {
      Branch.value = BRANCH;
    }
  }

}
