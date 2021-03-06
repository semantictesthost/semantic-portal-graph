import {ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
import fakeNodeData from './fakeNodeInfo.json';

@Component({
  selector: 'app-node-info',
  templateUrl: './node-info.component.html',
  styleUrls: ['./node-info.component.scss']
})
export class NodeInfoComponent implements OnInit, OnChanges {

  @ViewChild('info') infoElRef;
  @Input('showInfoForId') id: number;

  loaded = false;


  constructor(private http: HttpClient, private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('aaaaaa')
    if (changes.id.currentValue) {
      if (environment.production) {
        this.http.get(environment.url + '/summary/concept/' + changes.id.currentValue,
          {responseType: 'text'}).subscribe(res => {
          this.loaded = true;
          this.cd.detectChanges();
          this.infoElRef.nativeElement.innerHTML = res;
        });
      } else {
        this.loaded = true;
        this.cd.detectChanges();
        this.infoElRef.nativeElement.innerHTML = fakeNodeData.fakeNode_6;
      }

    } else {
      this.loaded = false;
      if (this.infoElRef) {
        this.infoElRef.nativeElement.innerHTML = '';
      }
    }

  }
}
