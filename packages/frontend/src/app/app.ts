import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';
import { EnvironmentBannerComponent } from './layout/environment-banner/environment-banner';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, EnvironmentBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly environment = environment;
}
