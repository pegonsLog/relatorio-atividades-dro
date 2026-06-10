import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RelatorioBase } from '../../../models';
import { AgentesService } from '../../../services/agentes.service';
import { Agente } from '../../../models/agente.interface';
import { HeroIconComponent } from '../../../shared/icons/heroicons';

@Component({
  selector: 'app-relatorio-base-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeroIconComponent],
  templateUrl: './relatorio-base-form.html',
  styleUrls: ['./relatorio-base-form.scss']
})
export class RelatorioBaseFormComponent implements OnChanges, OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly agentesService = inject(AgentesService);

  @Input() value?: RelatorioBase | null;
  @Input() saving = false;
  @Input() defaults?: { gerencia?: string; turno?: string; mat1?: number | null; mat2?: number | null } | null;
  @Output() submitValue = new EventEmitter<RelatorioBase>();
  @Output() cancel = new EventEmitter<void>();
  @ViewChild('dataInput') dataInput?: ElementRef<HTMLInputElement>;

  form: FormGroup = this.fb.group({
    gerencia: ['', [Validators.required, Validators.minLength(2)]],
    data: ['', [Validators.required]],
    diaSemana: ['', [Validators.required]],
    turno: ['', [Validators.required]],
    mat1: [null, [Validators.required]],
    mat2: [null],
    coord: [null, [Validators.required]],
    superv: [null, [Validators.required]],
  });

  // Observable de agentes para popular selects (mat1/mat2)
  agentes$ = this.agentesService.list();

  // Lista de agentes carregada em memória para os campos de busca (coord/superv)
  agentes: Agente[] = [];

  // Estado dos campos de busca com filtro (autocomplete)
  coordSearch = '';
  supervSearch = '';
  coordOpen = false;
  supervOpen = false;

  // Indica quando o formulário está em modo "novo" com defaults válidos, para travar os campos
  get isLocked(): boolean {
    return !this.value && !!(this.defaults?.gerencia && this.defaults?.turno);
  }

  // Indica se mat1 está travado pelos defaults
  get isMat1Locked(): boolean {
    return !this.value && !!this.defaults?.mat1;
  }

  // Indica se mat2 está travado pelos defaults
  get isMat2Locked(): boolean {
    return !this.value && !!this.defaults?.mat2;
  }

  // Reseta o formulário usando os defaults atuais e aplica bloqueio conforme necessário
  resetToDefaults() {
    this.form.reset({
      gerencia: this.defaults?.gerencia || '',
      data: '',
      diaSemana: '',
      turno: this.defaults?.turno || '',
      mat1: this.defaults?.mat1 || null,
      mat2: this.defaults?.mat2 || null,
      coord: null,
      superv: null,
    });
    const canLock = !!(this.defaults?.gerencia && this.defaults?.turno);
    if (canLock) {
      this.form.get('gerencia')?.disable({ emitEvent: false });
      this.form.get('turno')?.disable({ emitEvent: false });
    } else {
      this.form.get('gerencia')?.enable({ emitEvent: false });
      this.form.get('turno')?.enable({ emitEvent: false });
    }
    // Travar mat1 e mat2 se vierem dos defaults
    if (this.defaults?.mat1) {
      this.form.get('mat1')?.disable({ emitEvent: false });
    } else {
      this.form.get('mat1')?.enable({ emitEvent: false });
    }
    if (this.defaults?.mat2) {
      this.form.get('mat2')?.disable({ emitEvent: false });
    } else {
      this.form.get('mat2')?.enable({ emitEvent: false });
    }
    // Limpa estado de validação/toque
    this.form.markAsPristine();
    this.form.markAsUntouched();
    // Limpa os textos de busca de coord/superv
    this.coordSearch = '';
    this.supervSearch = '';
    this.coordOpen = false;
    this.supervOpen = false;
    // Foca o primeiro campo (Data)
    setTimeout(() => this.dataInput?.nativeElement.focus(), 0);
  }

  ngOnInit(): void {
    // Carrega agentes em memória para os campos de busca com filtro
    this.agentes$.subscribe(list => {
      this.agentes = list;
      // Sincroniza o texto exibido caso já exista valor selecionado
      this.coordSearch = this.labelForMatricula(this.form.get('coord')?.value);
      this.supervSearch = this.labelForMatricula(this.form.get('superv')?.value);
    });

    const dataCtrl = this.form.get('data');
    const diaCtrl = this.form.get('diaSemana');
    dataCtrl?.valueChanges.subscribe((val: string) => {
      const dia = this.computeDiaSemana(val);
      diaCtrl?.setValue(dia, { emitEvent: false });
    });
    // Ajuste inicial se já houver data preenchida
    const initial = dataCtrl?.value as string;
    if (initial) {
      diaCtrl?.setValue(this.computeDiaSemana(initial), { emitEvent: false });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      const v = this.value;
      if (v) {
        this.form.reset({
          gerencia: v.gerencia,
          data: this.toInputDate(v.data),
          diaSemana: v.diaSemana,
          turno: v.turno,
          mat1: v.mat1,
          mat2: v.mat2,
          coord: v.coord,
          superv: v.superv,
        });
        // Em edição, permitir alterar gerência/turno
        this.form.get('gerencia')?.enable({ emitEvent: false });
        this.form.get('turno')?.enable({ emitEvent: false });
        // Sincroniza os textos de busca de coord/superv
        this.coordSearch = this.labelForMatricula(v.coord);
        this.supervSearch = this.labelForMatricula(v.superv);
      } else {
        this.resetToDefaults();
      }
    }
    // Se os defaults mudarem e não estivermos em edição, re-aplica
    if (changes['defaults'] && !this.value) {
      this.resetToDefaults();
    }
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // Usa getRawValue para incluir valores de campos desabilitados
    const v = this.form.getRawValue() as any;
    const payload: RelatorioBase = {
      gerencia: v.gerencia,
      // Cria Date em horário local (00:00), evitando UTC e offset -03.
      data: this.parseLocalDate(v.data),
      diaSemana: v.diaSemana,
      turno: v.turno,
      mat1: Number(v.mat1) || 0,
      mat2: Number(v.mat2) || 0,
      coord: Number(v.coord) || 0,
      superv: Number(v.superv) || 0,
    };
    this.submitValue.emit(payload);
  }

  onCancel() {
    // Limpa todos os campos do formulário
    this.form.reset({
      gerencia: '',
      data: '',
      diaSemana: '',
      turno: '',
      mat1: null,
      mat2: null,
      coord: null,
      superv: null,
    });
    // Limpa os textos de busca
    this.coordSearch = '';
    this.supervSearch = '';
    this.coordOpen = false;
    this.supervOpen = false;
    // Reseta estado de validação/toque
    this.form.markAsPristine();
    this.form.markAsUntouched();
    // Emite evento para o componente pai fechar o modo de edição
    this.cancel.emit();
  }

  // ===== Autocomplete (busca com filtro) para Coord. e Superv. =====

  // Retorna o rótulo "matricula - nome" para uma matrícula
  private labelForMatricula(matricula: number | null | undefined): string {
    if (matricula == null) return '';
    const a = this.agentes.find(x => x.matricula === matricula);
    return a ? `${a.matricula} - ${a.nome}` : String(matricula);
  }

  // Filtra agentes pelo termo digitado (matrícula ou nome)
  filterAgentes(term: string): Agente[] {
    const t = (term || '').trim().toLowerCase();
    if (!t) return this.agentes;
    return this.agentes.filter(a =>
      a.nome.toLowerCase().includes(t) || String(a.matricula).includes(t)
    );
  }

  get coordResults(): Agente[] {
    return this.filterAgentes(this.coordSearch);
  }

  get supervResults(): Agente[] {
    return this.filterAgentes(this.supervSearch);
  }

  // Reage à digitação: limpa a seleção enquanto o texto não corresponde
  onCoordInput(value: string) {
    this.coordSearch = value;
    this.coordOpen = true;
    this.form.get('coord')?.setValue(null);
  }

  onSupervInput(value: string) {
    this.supervSearch = value;
    this.supervOpen = true;
    this.form.get('superv')?.setValue(null);
  }

  selectCoord(a: Agente) {
    this.form.get('coord')?.setValue(a.matricula);
    this.coordSearch = `${a.matricula} - ${a.nome}`;
    this.coordOpen = false;
  }

  selectSuperv(a: Agente) {
    this.form.get('superv')?.setValue(a.matricula);
    this.supervSearch = `${a.matricula} - ${a.nome}`;
    this.supervOpen = false;
  }

  // Fecha o dropdown ao perder o foco; restaura o texto se nenhuma seleção foi feita
  closeCoord() {
    setTimeout(() => {
      this.coordOpen = false;
      this.coordSearch = this.labelForMatricula(this.form.get('coord')?.value);
    }, 150);
  }

  closeSuperv() {
    setTimeout(() => {
      this.supervOpen = false;
      this.supervSearch = this.labelForMatricula(this.form.get('superv')?.value);
    }, 150);
  }

  private toInputDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private computeDiaSemana(val?: string): string {
    if (!val) return '';
    // Espera formato YYYY-MM-DD
    const parts = val.split('-');
    if (parts.length !== 3) return '';
    const [y, m, d] = parts.map(Number);
    if (!y || !m || !d) return '';
    const date = new Date(y, m - 1, d); // Data local para evitar timezone offset
    const names = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
    return (names[date.getDay()] ?? '').toLocaleUpperCase('pt-BR');
  }

  private parseLocalDate(val?: string): Date {
    if (!val) return new Date();
    const parts = val.split('-');
    if (parts.length !== 3) return new Date(val);
    const [y, m, d] = parts.map(Number);
    if (!y || !m || !d) return new Date(val);
    // Cria a data em horário local às 00:00:00
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
}
