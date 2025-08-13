import { Component } from '@angular/core';
import { MaterialModule } from '../../shared/material.module';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [MaterialModule, CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard {

}
