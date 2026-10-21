import { TestBed } from '@angular/core/testing';
import { ENVIRONMENTS, type EnvironmentName } from '../../../environments/environment-config';
import { EnvironmentBannerComponent } from './environment-banner';

describe('EnvironmentBannerComponent', () => {
  function render(environmentName: EnvironmentName): HTMLElement {
    const fixture = TestBed.createComponent(EnvironmentBannerComponent);
    fixture.componentRef.setInput('environmentName', environmentName);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnvironmentBannerComponent],
    }).compileComponents();
  });

  it('renders the local environment label and content spacer', () => {
    const element = render(ENVIRONMENTS.LOCAL);
    expect(element.querySelector('.environment-banner')?.textContent?.trim()).toBe('AMBIENTE LOCAL');
    expect(element.querySelector('.environment-banner__spacer')).toBeTruthy();
  });

  it('renders the development environment label', () => {
    const element = render(ENVIRONMENTS.DEVELOPMENT);
    expect(element.querySelector('.environment-banner')?.textContent?.trim()).toBe(
      'AMBIENTE DESARROLLO',
    );
  });

  it('renders no banner for production', () => {
    const element = render(ENVIRONMENTS.PRODUCTION);
    expect(element.querySelector('.environment-banner')).toBeNull();
    expect(element.querySelector('.environment-banner__spacer')).toBeNull();
  });
});
