import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelatorioDiarioList } from './relatorio-diario-list';

describe('RelatorioDiarioList', () => {
  let component: RelatorioDiarioList;
  let fixture: ComponentFixture<RelatorioDiarioList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelatorioDiarioList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RelatorioDiarioList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
