import { AfterViewInit, Directive, ElementRef, NgZone } from '@angular/core';

@Directive({
  selector: '[appAutoFocus]',
  standalone: true,
})
export class AutoFocusDirective implements AfterViewInit {
  constructor(private el: ElementRef<HTMLElement>, private ngZone: NgZone) {}

  ngAfterViewInit(): void {
    // Aguarda o próximo ciclo para garantir que o elemento esteja no DOM e visível
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        try {
          this.el.nativeElement.focus();
        } catch {
          // no-op
        }
      }, 0);
    });
  }
}
