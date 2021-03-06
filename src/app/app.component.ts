import {ChangeDetectionStrategy, ChangeDetectorRef, Component} from '@angular/core';
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


  get performanceTest() {
    console.log('test');
    return null;
  }

}
