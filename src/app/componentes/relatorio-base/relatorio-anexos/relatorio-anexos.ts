import { Component, Input, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RelatorioAnexo } from '../../../models/relatorio-anexo.interface';
import { RelatorioAnexosService } from '../../../services/relatorio-anexos.service';
import { HeroIconComponent } from '../../../shared/icons/heroicons';

@Component({
  selector: 'app-relatorio-anexos',
  standalone: true,
  imports: [CommonModule, FormsModule, HeroIconComponent],
  templateUrl: './relatorio-anexos.html',
  styleUrls: ['./relatorio-anexos.scss']
})
export class RelatorioAnexos implements OnInit, OnChanges {
  private readonly service = inject(RelatorioAnexosService);
  private readonly sanitizer = inject(DomSanitizer);

  @Input({ required: true }) idRelatorio!: string;
  /** Quando falso, a seção fica somente leitura (visualizar e exportar) */
  @Input() podeEditar = false;

  anexos: RelatorioAnexo[] = [];
  carregando = true;
  erro = '';

  // --- Upload ---
  arquivo: File | null = null;
  nome = '';
  descricao = '';
  enviando = false;
  progresso = 0;

  // --- Edição de metadados ---
  emEdicao: RelatorioAnexo | null = null;
  nomeEdicao = '';
  descricaoEdicao = '';
  salvando = false;

  // --- Exclusão ---
  paraExcluir: RelatorioAnexo | null = null;
  excluindo = false;

  // --- Visualização ---
  visualizando: RelatorioAnexo | null = null;
  /**
   * URL do PDF já sanitizada. O Angular bloqueia URL em `src` de iframe sem
   * passar pelo DomSanitizer; calculamos uma vez ao abrir, e não no template,
   * para não gerar um objeto novo a cada ciclo de detecção de mudanças.
   */
  urlPdfSegura: SafeResourceUrl | null = null;

  ngOnInit(): void {
    this.carregar();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['idRelatorio'] && !changes['idRelatorio'].firstChange) {
      this.carregar();
    }
  }

  private carregar(): void {
    if (!this.idRelatorio) return;
    this.carregando = true;
    this.service.listarPorRelatorio(this.idRelatorio).subscribe({
      next: lista => {
        this.anexos = lista;
        this.carregando = false;
      },
      error: () => {
        this.erro = 'Não foi possível carregar os anexos.';
        this.carregando = false;
      }
    });
  }

  // ===== Upload =====

  /**
   * Input que originou o arquivo selecionado. Guardamos a referência para
   * poder limpá-lo DEPOIS do upload: zerar `input.value` enquanto o `File`
   * ainda não foi lido invalida o blob em navegadores móveis (Safari/iOS),
   * fazendo o upload enviar corpo vazio e o servidor responder HTTP 400.
   */
  private inputArquivo: HTMLInputElement | null = null;

  onArquivoSelecionado(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const selecionado = input.files?.[0] ?? null;
    this.erro = '';

    if (selecionado && selecionado.size > this.service.TAMANHO_MAXIMO) {
      this.erro = `Arquivo maior que o limite de ${this.formatarTamanho(this.service.TAMANHO_MAXIMO)}.`;
      this.arquivo = null;
      input.value = '';
      return;
    }

    this.arquivo = selecionado;
    this.inputArquivo = input;
    // Sugere o nome do arquivo como nome do anexo, sem sobrescrever o que já foi digitado
    if (this.arquivo && !this.nome.trim()) {
      this.nome = this.arquivo.name.replace(/\.[^.]+$/, '');
    }
  }

  /** Zera o input para permitir escolher o mesmo arquivo novamente */
  private resetarInput(): void {
    if (this.inputArquivo) {
      this.inputArquivo.value = '';
      this.inputArquivo = null;
    }
  }

  limparSelecao(): void {
    this.arquivo = null;
    this.nome = '';
    this.descricao = '';
    this.erro = '';
    this.resetarInput();
  }

  get podeEnviar(): boolean {
    return !!this.arquivo && !!this.nome.trim() && !this.enviando;
  }

  async enviar(): Promise<void> {
    if (!this.podeEnviar || !this.arquivo) return;
    this.enviando = true;
    this.progresso = 0;
    this.erro = '';
    try {
      const novo = await this.service.enviar(
        this.idRelatorio,
        this.arquivo,
        { nome: this.nome, descricao: this.descricao },
        p => { this.progresso = p.percentual; }
      );
      this.anexos = [novo, ...this.anexos];
      this.limparSelecao();
    } catch (e: any) {
      // Mantém o detalhe técnico visível: 'storage/unknown' só é diagnosticável
      // com a resposta do servidor que o SDK anexa ao erro.
      this.erro = e?.message || 'Falha ao enviar o arquivo.';
      console.error('Falha no upload do anexo:', e);
    } finally {
      this.enviando = false;
      this.progresso = 0;
    }
  }

  // ===== Edição de metadados =====

  abrirEdicao(a: RelatorioAnexo): void {
    this.emEdicao = a;
    this.nomeEdicao = a.nome;
    this.descricaoEdicao = a.descricao;
  }

  cancelarEdicao(): void {
    this.emEdicao = null;
    this.nomeEdicao = '';
    this.descricaoEdicao = '';
    this.salvando = false;
  }

  get edicaoValida(): boolean {
    return this.nomeEdicao.trim().length > 0;
  }

  async salvarEdicao(): Promise<void> {
    if (!this.emEdicao?.idAnexo || !this.edicaoValida || this.salvando) return;
    this.salvando = true;
    try {
      await this.service.atualizar(this.emEdicao.idAnexo, {
        nome: this.nomeEdicao,
        descricao: this.descricaoEdicao,
      });
      const alvo = this.anexos.find(x => x.idAnexo === this.emEdicao!.idAnexo);
      if (alvo) {
        alvo.nome = this.nomeEdicao.trim();
        alvo.descricao = this.descricaoEdicao.trim();
        alvo.updatedAt = new Date();
      }
      this.cancelarEdicao();
    } catch (e: any) {
      this.erro = e?.message || 'Falha ao salvar as alterações.';
      this.salvando = false;
    }
  }

  // ===== Exclusão =====

  abrirExclusao(a: RelatorioAnexo): void {
    this.paraExcluir = a;
  }

  cancelarExclusao(): void {
    this.paraExcluir = null;
    this.excluindo = false;
  }

  async confirmarExclusao(): Promise<void> {
    if (!this.paraExcluir || this.excluindo) return;
    this.excluindo = true;
    try {
      await this.service.excluir(this.paraExcluir);
      this.anexos = this.anexos.filter(x => x.idAnexo !== this.paraExcluir!.idAnexo);
      this.cancelarExclusao();
    } catch (e: any) {
      this.erro = e?.message || 'Falha ao excluir o anexo.';
      this.excluindo = false;
    }
  }

  // ===== Visualização e exportação =====

  abrirVisualizacao(a: RelatorioAnexo): void {
    this.visualizando = a;
    this.urlPdfSegura = this.isPdf(a)
      ? this.sanitizer.bypassSecurityTrustResourceUrl(a.url)
      : null;
  }

  fecharVisualizacao(): void {
    this.visualizando = null;
    this.urlPdfSegura = null;
  }

  /** Só imagem e PDF são exibidos embutidos; o resto é oferecido para download */
  temPreview(a: RelatorioAnexo): boolean {
    return this.isImagem(a) || this.isPdf(a);
  }

  isImagem(a: RelatorioAnexo): boolean {
    return (a?.tipo || '').startsWith('image/');
  }

  isPdf(a: RelatorioAnexo): boolean {
    return (a?.tipo || '') === 'application/pdf';
  }

  /**
   * Exporta o arquivo. Baixa como blob para preservar o nome original; se a
   * requisição falhar (CORS, rede), abre a URL em nova aba como alternativa.
   */
  async exportar(a: RelatorioAnexo): Promise<void> {
    try {
      const resposta = await fetch(a.url);
      if (!resposta.ok) throw new Error(String(resposta.status));
      const blob = await resposta.blob();
      const urlTemporaria = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlTemporaria;
      link.download = a.nomeArquivo || a.nome || 'anexo';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(urlTemporaria);
    } catch {
      window.open(a.url, '_blank', 'noopener');
    }
  }

  // ===== Helpers de exibição =====

  formatarTamanho(bytes: number): string {
    return this.service.formatarTamanho(bytes);
  }

  iconePara(a: RelatorioAnexo): string {
    if (this.isImagem(a)) return 'photo';
    if (this.isPdf(a)) return 'document-text';
    return 'document';
  }
}
