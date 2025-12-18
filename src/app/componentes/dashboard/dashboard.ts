import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroIconComponent } from '../../shared/icons/heroicons';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, HeroIconComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard { }
