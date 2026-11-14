import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusLabelComponent } from './status-label';

describe('StatusLabelComponent', () => {
  let fixture: ComponentFixture<StatusLabelComponent>;
  let component: StatusLabelComponent;
  let element: HTMLElement;

  function render(): void {
    fixture = TestBed.createComponent(StatusLabelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Activo');
    fixture.detectChanges();
    element = fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusLabelComponent],
    }).compileComponents();
  });

  it('renders the label text', () => {
    render();

    expect(element.textContent?.trim()).toBe('Activo');
  });

  it('defaults to the neutral tone', () => {
    render();

    expect(element.querySelector('.status-label')?.getAttribute('data-tone')).toBe('neutral');
  });

  it('applies the requested tone as a data attribute', () => {
    render();
    fixture.componentRef.setInput('tone', 'positive');
    fixture.detectChanges();

    expect(element.querySelector('.status-label')?.getAttribute('data-tone')).toBe('positive');
  });
});
