import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelatorioAtividadeForm } from './relatorio-atividade-form';

describe('RelatorioAtividadeForm', () => {
  let component: RelatorioAtividadeForm;
  let fixture: ComponentFixture<RelatorioAtividadeForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelatorioAtividadeForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RelatorioAtividadeForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
