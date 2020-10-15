import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {HttpClient} from '@angular/common/http';

@Component({
  selector: 'app-node-info',
  templateUrl: './node-info.component.html',
  styleUrls: ['./node-info.component.scss']
})
export class NodeInfoComponent implements OnInit {

  @ViewChild('info') infoElRef;
  @Input('showInfoForId') id: number;

  loaded = false;


  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    // this.http.get('http://semantic-portal.net/api/summary/concept/' + this.id).subscribe(res => {
    //   this.loaded = true;
    //   console.log(res)
    //   this.infoElRef.nativeElement.innerHTML = res;
    // })
  }

}
