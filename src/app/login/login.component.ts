import {AfterViewInit, Component} from '@angular/core';
import {SessionService} from "../services/session.service";
import {filter} from "rxjs";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  imports: [],
  standalone: true,
  styleUrl: './login.component.css'
})
export class LoginComponent implements AfterViewInit {
  constructor(private sessionService: SessionService) {}

  ngAfterViewInit(): void {
    this.sessionService.sessionInformation$.pipe(filter((sessionInformation) => sessionInformation !== undefined)).subscribe((sessionInformation) => {
      if (sessionInformation?.isLoggedIn) {
        window.location.href = new URL(window.location.href).origin;
      } else {
        this.login();
      }
    });
  }

  login() {
    this.sessionService.login();
  }
}
