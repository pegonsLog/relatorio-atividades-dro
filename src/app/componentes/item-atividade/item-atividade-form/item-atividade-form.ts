import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ItemAtividade } from '../../../models';
import { ItemAtividadeService } from '../../../services';
import { SpeechToTextService } from '../../../services/speech-to-text.service';
import { TabelaAtividadesService } from '../../../services/tabela-atividades.service';
import { TabelaAtividade } from '../../../models/tabela-atividade.interface';
import { CommonModule } from '@angular/common';
import { HeroIconComponent } from '../../../shared/icons/heroicons';

@Component({
  selector: 'app-item-atividade-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeroIconComponent],
  templateUrl: './item-atividade-form.html',
  styleUrls: ['./item-atividade-form.scss']
})
export class ItemAtividadeForm implements OnInit, OnDestroy {
  @Input() atividade?: ItemAtividade;
  @Input() idRelatorio!: string | number;
  @Input() dataRelatorio?: Date;
  @Input() isEditMode = false;
  @Output() formSubmit = new EventEmitter<ItemAtividade>();
  @Output() formCancel = new EventEmitter<void>();

  private readonly speech = inject(SpeechToTextService);

  atividadeForm: FormGroup;
  tiposAcionamento = ['Central/Técnico', 'Não Programado', 'Programado'];
  atividades: TabelaAtividade[] = [];

  // Autocomplete do código da atividade
  codAtvSearch = '';
  codAtvOpen = false;

  // Campo atualmente em gravação ('local' | 'observacoes' | null)
  recordingField: 'local' | 'observacoes' | null = null;
  // Base de texto do campo antes da fala (para anexar resultados parciais)
  private recordingBaseText = '';
  // Mensagem de erro de gravação
  speechError = '';

  get speechSupported(): boolean {
    return this.speech.isSupported;
  }

  constructor(
    private fb: FormBuilder,
    private atividadeService: ItemAtividadeService,
    private tabelaAtividadesService: TabelaAtividadesService
  ) {
    this.atividadeForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadAtividades();
    if (this.atividade && this.isEditMode) {
      this.loadAtividade();
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      item: ['', [Validators.required, Validators.min(1)]],
      acionamento: ['Programado', [Validators.required]],
      chegada: ['', [Validators.required]],
      solucao: [''],
      saida: ['', [Validators.required]],
      codAtv: ['', [Validators.required, Validators.min(1)]],
      qtdAgentes: ['', [Validators.required, Validators.min(1)]],
      local: [''],
      observacoes: ['', [Validators.maxLength(500)]]
    });
  }

  private loadAtividade(): void {
    if (this.atividade) {
      this.atividadeForm.patchValue({
        item: this.atividade.item,
        acionamento: this.atividade.acionamento,
        chegada: this.formatTimeForInput(this.atividade.chegada),
        solucao: this.atividade.solucao ? this.formatTimeForInput(this.atividade.solucao) : '',
        saida: this.formatTimeForInput(this.atividade.saida),
        codAtv: this.atividade.codAtv,
        qtdAgentes: this.atividade.qtdAgentes,
        local: this.atividade.local,
        observacoes: this.atividade.observacoes
      });
      this.codAtvSearch = this.labelForCodAtv(this.atividade.codAtv);
    }
  }

  private loadAtividades(): void {
    this.tabelaAtividadesService.list().subscribe({
      next: (itens) => {
        this.atividades = (itens ?? []).map(i => ({ ...i, codigo: Number(i.codigo) }));
        // Sincroniza o texto de busca caso já exista um código selecionado
        const cod = this.atividadeForm.get('codAtv')?.value;
        if (cod) this.codAtvSearch = this.labelForCodAtv(cod);
      },
      error: (e) => console.error('Erro ao carregar códigos de atividade', e)
    });
  }

  // ===== Autocomplete (busca com filtro) para o Código da Atividade =====
  private labelForCodAtv(cod: number | string | null | undefined): string {
    if (cod == null || cod === '') return '';
    const a = this.atividades.find(x => Number(x.codigo) === Number(cod));
    return a ? `${a.codigo} - ${a.nome}` : String(cod);
  }

  get codAtvResults(): TabelaAtividade[] {
    const t = (this.codAtvSearch || '').trim().toLowerCase();
    if (!t) return this.atividades;
    return this.atividades.filter(a =>
      (a.nome || '').toLowerCase().includes(t) || String(a.codigo).includes(t)
    );
  }

  onCodAtvInput(value: string): void {
    this.codAtvSearch = value;
    this.codAtvOpen = true;
    this.atividadeForm.get('codAtv')?.setValue('');
  }

  selectCodAtv(a: TabelaAtividade): void {
    this.atividadeForm.get('codAtv')?.setValue(a.codigo);
    this.codAtvSearch = `${a.codigo} - ${a.nome}`;
    this.codAtvOpen = false;
  }

  closeCodAtv(): void {
    setTimeout(() => {
      this.codAtvOpen = false;
      this.codAtvSearch = this.labelForCodAtv(this.atividadeForm.get('codAtv')?.value);
      this.atividadeForm.get('codAtv')?.markAsTouched();
    }, 150);
  }

  private formatTimeForInput(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private getBaseDate(): Date {
    const base = this.dataRelatorio instanceof Date ? this.dataRelatorio : new Date();
    return new Date(base);
  }

  private combineTimeWithBaseDate(time: string): Date {
    const [hh, mm] = String(time).split(':').map((v: string) => parseInt(v, 10));
    const d = this.getBaseDate();
    d.setHours(Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0);
    return d;
  }

  onSubmit(): void {
    if (this.atividadeForm.valid) {
      const formData = this.atividadeForm.value;
      const chegadaDate = this.combineTimeWithBaseDate(formData.chegada);
      const solucaoDate = formData.solucao ? this.combineTimeWithBaseDate(formData.solucao) : null;
      const saidaDate = this.combineTimeWithBaseDate(formData.saida);
      const atvSel = this.atividades.find(a => Number(a.codigo) === Number(formData.codAtv));
      const atividadeData: ItemAtividade = {
        ...formData,
        chegada: chegadaDate,
        solucao: solucaoDate,
        saida: saidaDate,
        idRelatorio: this.idRelatorio,
        idAtividade: this.atividade?.idAtividade || 0,
        nomeAtividade: atvSel ? atvSel.nome : '',
        // Usa sempre a data do relatório-base
        data: this.dataRelatorio instanceof Date ? this.dataRelatorio : new Date()
      };

      // Normalizações para campos opcionais
      (atividadeData as any).local = formData.local ? String(formData.local) : '';

      // nomeAtividade já definido acima

      if (this.isEditMode && this.atividade) {
        this.atividadeService.update(this.atividade.idAtividade, atividadeData);
      } else {
        this.atividadeService.create(atividadeData);
      }

      this.formSubmit.emit(atividadeData);
      this.resetForm();
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.stopRecording();
    this.resetForm();
    this.formCancel.emit();
  }

  ngOnDestroy(): void {
    this.stopRecording();
  }

  // ===== Gravação de voz (speech-to-text) para Local e Observações =====

  toggleRecording(field: 'local' | 'observacoes'): void {
    if (this.recordingField === field) {
      this.stopRecording();
      return;
    }
    // Se outro campo estiver gravando, para antes de iniciar o novo
    if (this.recordingField) {
      this.stopRecording();
    }
    this.startRecording(field);
  }

  private startRecording(field: 'local' | 'observacoes'): void {
    this.speechError = '';
    const current = (this.atividadeForm.get(field)?.value ?? '').toString();
    this.recordingBaseText = current;
    const started = this.speech.start({
      onText: (finalText, interimText) => this.appendSpeech(field, finalText, interimText),
      onEnd: () => {
        this.recordingField = null;
      },
      onError: (message) => {
        this.speechError = message;
        this.recordingField = null;
      }
    });
    if (started) {
      this.recordingField = field;
    }
  }

  stopRecording(): void {
    if (this.recordingField) {
      this.speech.stop();
    }
  }

  // Limpa o conteúdo do campo informado (e para a gravação se estiver ativa nele)
  clearField(field: 'local' | 'observacoes'): void {
    if (this.recordingField === field) {
      this.stopRecording();
    }
    // Zera a base para que um resultado tardio da gravação não ressuscite o texto
    this.recordingBaseText = '';
    this.atividadeForm.get(field)?.setValue('');
    this.atividadeForm.get(field)?.markAsDirty();
  }

  private appendSpeech(field: 'local' | 'observacoes', finalText: string, interimText: string): void {
    // finalText e interimText representam a sessão inteira (não deltas).
    // Substituímos sempre: base original do campo + transcrição da sessão,
    // evitando a duplicação de palavras observada no mobile.
    const spoken = `${finalText}${finalText && interimText ? ' ' : ''}${interimText}`.trim();
    const sep = this.recordingBaseText && spoken && !/\s$/.test(this.recordingBaseText) ? ' ' : '';
    let combined = (this.recordingBaseText + sep + spoken).trimStart();

    // Respeita o limite de 500 caracteres das observações
    if (field === 'observacoes' && combined.length > 500) {
      combined = combined.slice(0, 500);
    }

    this.atividadeForm.get(field)?.setValue(combined);
    this.atividadeForm.get(field)?.markAsDirty();
  }

  private resetForm(): void {
    this.stopRecording();
    this.atividadeForm.reset({ acionamento: 'Programado' });
    this.codAtvSearch = '';
    this.codAtvOpen = false;
    this.atividade = undefined;
    this.isEditMode = false;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.atividadeForm.controls).forEach(key => {
      const control = this.atividadeForm.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.atividadeForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.atividadeForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} é obrigatório`;
      if (field.errors['min']) return `${fieldName} deve ser maior que 0`;
      if (field.errors['minlength']) return `${fieldName} deve ter pelo menos ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['maxlength']) return `${fieldName} deve ter no máximo ${field.errors['maxlength'].requiredLength} caracteres`;
    }
    return '';
  }

  // Validação para garantir que saída seja após chegada
  validateHorarios(): void {
    const chegada = this.atividadeForm.get('chegada')?.value;
    const solucao = this.atividadeForm.get('solucao')?.value;
    const saida = this.atividadeForm.get('saida')?.value;

    const dChegada = chegada ? this.combineTimeWithBaseDate(chegada) : null;
    const dSolucao = solucao ? this.combineTimeWithBaseDate(solucao) : null;
    const dSaida = saida ? this.combineTimeWithBaseDate(saida) : null;

    const solucaoCtrl = this.atividadeForm.get('solucao');
    const saidaCtrl = this.atividadeForm.get('saida');

    // Limpa erros anteriores de invalidTime se necessário
    if (solucaoCtrl?.errors?.['invalidTime']) {
      const { invalidTime, ...rest } = solucaoCtrl.errors as any;
      solucaoCtrl.setErrors(Object.keys(rest).length ? rest : null);
    }
    if (saidaCtrl?.errors?.['invalidTime']) {
      const { invalidTime, ...rest } = saidaCtrl.errors as any;
      saidaCtrl.setErrors(Object.keys(rest).length ? rest : null);
    }

    if (dChegada && dSolucao && dSolucao < dChegada) {
      solucaoCtrl?.setErrors({ ...(solucaoCtrl.errors || {}), invalidTime: true });
    }

    if (dSolucao && dSaida && dSaida < dSolucao) {
      saidaCtrl?.setErrors({ ...(saidaCtrl.errors || {}), invalidTime: true });
    }
  }
}
